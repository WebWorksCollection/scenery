// Copyright 2002-2012, University of Colorado

/**
 * Main scene
 *
 * @author Jonathan Olson <olsonsjc@gmail.com>
 */

var scenery = scenery || {};

(function(){
  "use strict";
  
  scenery.Scene = function( main, params ) {
    scenery.Node.call( this, params );
    
    var that = this;
    
    // main layers in a scene
    this.layers = [];
    
    // listeners that will be triggered by input events if they are not handled by the associated finger or on the trail
    this.inputListeners = [];
    
    this.main = main;
    
    this.sceneBounds = new phet.math.Bounds2( 0, 0, main.width(), main.height() );
    
    // default to a canvas layer type, but this can be changed
    this.preferredSceneLayerType = scenery.LayerType.Canvas;
    
    applyCSSHacks( main );
    
    // note, arguments to the functions are mutable. don't destroy them
    this.sceneEventListener = {
      insertChild: function( args ) {
        var parent = args.parent;
        var child = args.child;
        var index = args.index;
        var trail = args.trail;
      },
      
      removeChild: function( args ) {
        var parent = args.parent;
        var child = args.child;
        var index = args.index;
        var trail = args.trail;
      },
      
      dirtyBounds: function( args ) {
        var node = args.node;
        var localBounds = args.bounds;
        var transform = args.transform;
        var trail = args.trail;
      },
      
      layerRefresh: function( args ) {
        var node = args.node;
        var trail = args.trail;
      }
    };
    
    this.addEventListener( this.sceneEventListener );
  };

  var Scene = scenery.Scene;
  
  function fullRender( node, state ) {
    node.enterState( state );
    
    if ( node._visible ) {
      node.renderSelf( state );
      
      var children = node.children;
      
      // check if we need to filter the children we render, and ignore nodes with few children (but allow 2, since that may prevent branches)
      if ( state.childRestrictedBounds && children.length > 1 ) {
        var localRestrictedBounds = node.globalToLocalBounds( state.childRestrictedBounds );
        
        // don't filter if every child is inside the bounds
        if ( !localRestrictedBounds.containsBounds( node.parentToLocalBounds( node._bounds ) ) ) {
          children = node.getChildrenWithinBounds( localRestrictedBounds );
        }
      }
      
      _.each( children, function( child ) {
        fullRender( child, state );
      } );
    }
    
    node.exitState( state );
  }

  Scene.prototype = {
    constructor: Scene,
    
    fullRenderCore: function() {
      throw new Error( 'unimplemented fullRenderCore' );
    },
    
    rebuildLayers: function() {
      // remove all of our tracked layers from the container, so we can fill it with fresh layers
      this.disposeLayers();
      
      // TODO: internal API rethink
      var state = new scenery.LayerState();
      
      if ( this.preferredSceneLayerType ) {
        state.pushPreferredLayerType( this.preferredSceneLayerType );
      }
      
      var layerEntries = state.buildLayers( new scenery.TrailPointer( new scenery.Trail( this ), true ), new scenery.TrailPointer( new scenery.Trail( this ), false ), null );
      
      var layerArgs = {
        main: this.main,
        scene: this
      }
      
      this.layers = _.map( layerEntries, function( entry ) {
        var layer = entry.type.createLayer( layerArgs );
        layer.startTrail = entry.startTrail;
        return layer;
      } );
      
      // console.log( '---' );
      // _.each( layerEntries, function( entry ) {
        // console.log( entry.type.name + ': ' + entry.startTrail.toString() );
      // } );
    },
    
    disposeLayers: function() {
      var scene = this;
      
      _.each( this.layers.slice( 0 ), function( layer ) {
        layer.dispose();
        scene.layers.splice( _.indexOf( scene.layers, layer ), 1 ); // TODO: better removal code!
      } );
    },
    
    layerLookup: function( trail ) {
      // TODO: add tree form for optimization
      
      phet.assert( !( trail.isEmpty() || trail.nodes[0] !== this ), 'layerLookup root matches' );
      
      if ( this.layers.length === 0 ) {
        throw new Error( 'no layers in the scene' );
      }
      
      for ( var i = 0; i < this.layers.length; i++ ) {
        var layer = this.layers[i];
        if ( trail.compare( layer.endPath ) !== 1 ) {
          return layer;
        }
      }
      
      throw new Error( 'node not contained in a layer' );
    },
    
    renderScene: function() {
      // validating bounds, similar to Piccolo2d
      this.validateBounds();
      // no paint validation needed, since we render everything
      this.refreshLayers();
      
      var state = new scenery.RenderState( this );
      fullRender( this. state );
      state.finish(); // handle cleanup for the last layer
      
      _.each( this.layers, function( layer ) {
        layer.resetDirtyRegions();
      } );
    },
    
    updateScene: function( args ) {
      // validating bounds, similar to Piccolo2d
      this.validateBounds();
      this.validatePaint();
      
      // if the layer structure needs to be changed due to nodes above layers being changed, do so
      this.refreshLayers();
      
      var scene = this;
      
      _.each( this.layers, function( layer ) {
        // don't repaint clean layers
        if ( layer.isDirty() ) {
          var dirtyBounds = layer.getDirtyBounds();
          var visibleDirtyBounds = layer.getDirtyBounds().intersection( scene.sceneBounds );
          
          if ( !visibleDirtyBounds.isEmpty() ) {
            scene.updateLayer( layer, args );
          }
        }
      } );
    },
    
    // attempt to render everything currently visible in the scene to an external canvas. allows copying from canvas layers straight to the other canvas
    // delayCounts will have increment() and decrement() called on it if asynchronous completion is needed.
    renderToCanvas: function( canvas, context, delayCounts ) {
      context.clearRect( 0, 0, canvas.width, canvas.height );
      _.each( this.layers, function( layer ) {
        layer.renderToCanvas( canvas, context, delayCounts );
      } );
    },
    
    // handles creation and adds it to our internal list
    createLayer: function( Constructor, args ) {
      var layer = new Constructor( args );
      this.layers.push( layer );
      return layer;
    },
    
    resize: function( width, height ) {
      this.main.width( width );
      this.main.height( height );
      this.sceneBounds = new phet.math.Bounds2( 0, 0, width, height );
      this.rebuildLayers(); // TODO: why?
    },
    
    // after layer changes, the layers should have their zIndex updated
    reindexLayers: function() {
      var index = 1;
      _.each( this.layers, function( layer ) {
        // layers increment indices as needed
        index = layer.reindex( index );
      } );
    },
    
    addInputListener: function( listener ) {
      phet.assert( !_.contains( this.inputListeners, listener ) );
      
      this.inputListeners.push( listener );
    },
    
    removeInputListener: function( listener ) {
      var index = _.indexOf( this.inputListeners, listener );
      phet.assert( index !== -1 );
      
      this.inputListeners.splice( index, 1 );
    },
    
    getInputListeners: function() {
      return this.inputListeners.slice( 0 ); // defensive copy
    },
    
    initializeStandaloneEvents: function() {
      var element = this.main[0];
      this.initializeEvents( {
        preventDefault: true,
        listenerTarget: element,
        pointFromEvent: function( evt ) {
          var mainBounds = element.getBoundingClientRect();
          return new phet.math.Vector2( evt.clientX - mainBounds.left, evt.clientY - mainBounds.top );
        }
      } );
    },
    
    initializeFullscreenEvents: function() {
      this.initializeEvents( {
        preventDefault: true,
        listenerTarget: document,
        pointFromEvent: function( evt ) {
          return new phet.math.Vector2( evt.pageX, evt.pageY );
        }
      } );
    },
    
    initializeEvents: function( parameters ) {
      var scene = this;
      
      // TODO: come up with more parameter names that have the same string length, so it looks creepier
      var pointFromEvent = parameters.pointFromEvent;
      var listenerTarget = parameters.listenerTarget;
      var preventDefault = parameters.preventDefault;
      
      var input = new scenery.Input( scene );
      
      $( listenerTarget ).on( 'mousedown', function( jEvent ) {
        var evt = jEvent.originalEvent;
        if ( preventDefault ) { jEvent.preventDefault(); }
        input.mouseDown( pointFromEvent( evt ), evt );
      } );
      $( listenerTarget ).on( 'mouseup', function( jEvent ) {
        var evt = jEvent.originalEvent;
        if ( preventDefault ) { jEvent.preventDefault(); }
        input.mouseUp( pointFromEvent( evt ), evt );
      } );
      $( listenerTarget ).on( 'mousemove', function( jEvent ) {
        var evt = jEvent.originalEvent;
        if ( preventDefault ) { jEvent.preventDefault(); }
        input.mouseMove( pointFromEvent( evt ), evt );
      } );
      $( listenerTarget ).on( 'mouseover', function( jEvent ) {
        var evt = jEvent.originalEvent;
        if ( preventDefault ) { jEvent.preventDefault(); }
        input.mouseOver( pointFromEvent( evt ), evt );
      } );
      $( listenerTarget ).on( 'mouseout', function( jEvent ) {
        var evt = jEvent.originalEvent;
        if ( preventDefault ) { jEvent.preventDefault(); }
        input.mouseOut( pointFromEvent( evt ), evt );
      } );

      function forEachChangedTouch( evt, callback ) {
        for ( var i = 0; i < evt.changedTouches.length; i++ ) {
          // according to spec (http://www.w3.org/TR/touch-events/), this is not an Array, but a TouchList
          var touch = evt.changedTouches.item( i );
          
          callback( touch.identifier, pointFromEvent( touch ) );
        }
      }

      $( listenerTarget ).on( 'touchstart', function( jEvent ) {
        var evt = jEvent.originalEvent;
        if ( preventDefault ) { jEvent.preventDefault(); }
        forEachChangedTouch( evt, function( id, point ) {
          input.touchStart( id, point, evt );
        } );
      } );
      $( listenerTarget ).on( 'touchend', function( jEvent ) {
        var evt = jEvent.originalEvent;
        if ( preventDefault ) { jEvent.preventDefault(); }
        forEachChangedTouch( evt, function( id, point ) {
          input.touchEnd( id, point, evt );
        } );
      } );
      $( listenerTarget ).on( 'touchmove', function( jEvent ) {
        var evt = jEvent.originalEvent;
        if ( preventDefault ) { jEvent.preventDefault(); }
        forEachChangedTouch( evt, function( id, point ) {
          input.touchMove( id, point, evt );
        } );
      } );
      $( listenerTarget ).on( 'touchcancel', function( jEvent ) {
        var evt = jEvent.originalEvent;
        if ( preventDefault ) { jEvent.preventDefault(); }
        forEachChangedTouch( evt, function( id, point ) {
          input.touchCancel( id, point, evt );
        } );
      } );
    },
    
    resizeOnWindowResize: function() {
      var scene = this;
      
      var resizer = function () {
        scene.resize( window.innerWidth, window.innerHeight );
      };
      $( window ).resize( resizer );
      resizer();
    }
  };
  
  function applyCSSHacks( main ) {
    // some css hacks (inspired from https://github.com/EightMedia/hammer.js/blob/master/hammer.js)
    (function() {
      var prefixes = [ '-webkit-', '-moz-', '-ms-', '-o-', '' ];
      var properties = {
        userSelect: 'none',
        touchCallout: 'none',
        touchAction: 'none',
        userDrag: 'none',
        tapHighlightColor: 'rgba(0,0,0,0)'
      };
      
      _.each( prefixes, function( prefix ) {
        _.each( properties, function( propertyValue, propertyName ) {
          main.css( prefix + propertyName, propertyValue );
        } );
      } );
    })();
  }
})();
