// Copyright 2002-2014, University of Colorado

/**
 * A persistent display of a specific Node and its descendants, which is updated at discrete points in time.
 *
 * Use display.getDOMElement or display.domElement to retrieve the Display's DOM representation.
 * Use display.updateDisplay() to trigger the visual update in the Display's DOM element.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';
  
  var inherit = require( 'PHET_CORE/inherit' );
  var extend = require( 'PHET_CORE/extend' );
  var Events = require( 'AXON/Events' );
  var Dimension2 = require( 'DOT/Dimension2' );
  
  var scenery = require( 'SCENERY/scenery' );
  var Features = require( 'SCENERY/util/Features' );
  require( 'SCENERY/util/Trail' );
  require( 'SCENERY/display/BackboneDrawable' );
  require( 'SCENERY/display/CanvasBlock' );
  require( 'SCENERY/display/CanvasSelfDrawable' );
  require( 'SCENERY/display/DisplayInstance' );
  require( 'SCENERY/display/DOMSelfDrawable' );
  require( 'SCENERY/display/InlineCanvasCacheDrawable' );
  require( 'SCENERY/display/SharedCanvasCacheDrawable' );
  require( 'SCENERY/display/SVGSelfDrawable' );
  require( 'SCENERY/layers/Renderer' );
  
  // flags object used for determining what the cursor should be underneath a mouse
  var isMouseFlags = { isMouse: true };
  
  // Constructs a Display that will show the rootNode and its subtree in a visual state. Default options provided below
  scenery.Display = function Display( rootNode, options ) {
    
    // supertype call to axon.Events (should just initialize a few properties here, notably _eventListeners and _staticEventListeners)
    Events.call( this );
    
    this.options = _.extend( {
      width: 640,                // initial display width
      height: 480,               // initial display height
      //OHTWO TODO: hook up allowCSSHacks
      allowCSSHacks: true,       // applies CSS styles to the root DOM element that make it amenable to interactive content
      allowSceneOverflow: false, // usually anything displayed outside of our dom element is hidden with CSS overflow
      //OHTWO TODO: hook up enablePointerEvents
      enablePointerEvents: true, // whether we should specifically listen to pointer events if we detect support
      defaultCursor: 'default'   // what cursor is used when no other cursor is specified
    }, options );
    
    // The (integral, > 0) dimensions of the Display's DOM element (only updates the DOM element on updateDisplay())
    this._size = new Dimension2( this.options.width, this.options.height );
    this._currentSize = new Dimension2( -1, -1 ); // used to check against new size to see what we need to change
    
    this._rootNode = rootNode;
    this._rootBackbone = null; // to be filled in later
    this._domElement = scenery.BackboneDrawable.createDivBackbone();
    this._sharedCanvasInstances = {}; // map from Node ID to DisplayInstance, for fast lookup
    this._baseInstance = null; // will be filled with the root DisplayInstance
    
    // variable state
    this._frameId = 0; // incremented for every rendered frame
    this._dirtyTransformRoots = [];
    this._dirtyTransformRootsWithoutPass = [];
    
    this._instanceRootsToDispose = [];
    this._drawablesToDispose = [];
    
    this._lastCursor = null;
    
    this.applyCSSHacks();
  };
  var Display = scenery.Display;
  
  inherit( Object, Display, extend( {
    // returns the base DOM element that will be displayed by this Display
    getDOMElement: function() {
      return this._domElement;
    },
    get domElement() { return this.getDOMElement(); },
    
    // updates the display's DOM element with the current visual state of the attached root node and its descendants
    updateDisplay: function() {
      var firstRun = !!this._baseInstance;
      
      // validate bounds for everywhere that could trigger bounds listeners. we want to flush out any changes, so that we can call validateBounds()
      // from code below without triggering side effects (we assume that we are not reentrant).
      this._rootNode.validateWatchedBounds();
      
      this._baseInstance = this._baseInstance || scenery.DisplayInstance.createFromPool( this, new scenery.Trail( this._rootNode ) );
      this._baseInstance.baseSyncTree();
      if ( firstRun ) {
        this.markTransformRootDirty( this._baseInstance, this._baseInstance.isTransformed ); // marks the transform root as dirty (since it is)
      }
      
      this._rootBackbone = this._rootBackbone || this._baseInstance.groupDrawable;
      assert && assert( this._rootBackbone, 'We are guaranteed a root backbone as the groupDrawable on the base instance' );
      assert && assert( this._rootBackbone === this._baseInstance.groupDrawable, 'We don\'t want the base instance\'s groupDrawable to change' );
      
      if ( assertSlow ) { this._baseInstance.audit( this._frameId ); }
      
      // pre-repaint phase: update relative transform information for listeners (notification) and precomputation where desired
      this.updateDirtyTransformRoots();
      
      if ( assertSlow ) { this._baseInstance.audit( this._frameId ); }
      
      // dispose all of our instances. disposing the root will cause all descendants to also be disposed
      while ( this._instanceRootsToDispose.length ) {
        this._instanceRootsToDispose.pop().dispose();
      }
      
      // dispose all of our other drawables.
      while ( this._drawablesToDispose.length ) {
        this._drawablesToDispose.pop().dispose();
      }
      
      if ( assertSlow ) { this._baseInstance.audit( this._frameId ); }
      
      // repaint phase
      //OHTWO TODO: can anything be updated more efficiently by tracking at the Display level? Remember, we have recursive updates so things get updated in the right order!
      this._rootBackbone.update();
      
      if ( assertSlow ) { this._baseInstance.audit( this._frameId ); }
      
      this.updateCursor();
      
      this.updateSize();
      
      this._frameId++;
    },
    
    updateSize: function() {
      var sizeDirty = false;
      //OHTWO TODO: if we aren't clipping or setting background colors, can we get away with having a 0x0 container div and using absolutely-positioned children?
      if ( this._size.width !== this._currentSize.width ) {
        sizeDirty = true;
        this._currentSize.width = this._size.width;
        this._domElement.style.width = this._size.width + 'px';
      }
      if ( this._size.height !== this._currentSize.height ) {
        sizeDirty = true;
        this._currentSize.height = this._size.height;
        this._domElement.style.height = this._size.height + 'px';
      }
      if ( sizeDirty && !this.options.allowSceneOverflow ) {
        // to prevent overflow, we add a CSS clip
        //TODO: 0px => 0?
        this._domElement.style.clip = 'rect(0px,' + this._size.width + 'px,' + this._size.height + 'px,0px)';
      }
    },
    
    getRootNode: function() {
      return this._rootNode;
    },
    get rootNode() { return this.getRootNode(); },
    
    // The dimensions of the Display's DOM element
    getSize: function() {
      return this._size;
    },
    get size() { return this.getSize(); },
    
    // size: dot.Dimension2. Changes the size that the Display's DOM element will be after the next updateDisplay()
    setSize: function( size ) {
      assert && assert( size instanceof Dimension2 );
      assert && assert( size.width % 1 === 0, 'Display.width should be an integer' );
      assert && assert( size.width > 0, 'Display.width should be greater than zero' );
      assert && assert( size.height % 1 === 0, 'Display.height should be an integer' );
      assert && assert( size.height > 0, 'Display.height should be greater than zero' );
      
      if ( !this._size.equals( size ) ) {
        this._size = size;
        
        this.trigger1( 'displaySize', this._size );
      }
    },
    
    // The width of the Display's DOM element
    getWidth: function() {
      return this._size.width;
    },
    get width() { return this.getWidth(); },
    
    // Sets the width that the Display's DOM element will be after the next updateDisplay(). Should be an integral value.
    setWidth: function( width ) {
      assert && assert( typeof width === 'number', 'Display.width should be a number' );
      
      if ( this.getWidth() !== width ) {
        // TODO: remove allocation here?
        this.setSize( new Dimension2( width, this.getHeight() ) );
      }
    },
    set width( value ) { this.setWidth( value ); },
    
    // The height of the Display's DOM element
    getHeight: function() {
      return this._size.height;
    },
    get height() { return this.getHeight(); },
    
    // Sets the height that the Display's DOM element will be after the next updateDisplay(). Should be an integral value.
    setHeight: function( height ) {
      assert && assert( typeof height === 'number', 'Display.height should be a number' );
      
      if ( this.getHeight() !== height ) {
        // TODO: remove allocation here?
        this.setSize( new Dimension2( height, this.getHeight() ) );
      }
    },
    set height( value ) { this.setHeight( value ); },
    
    /*
     * Called from DisplayInstances that will need a transform update (for listeners and precomputation).
     * @param passTransform {Boolean} - Whether we should pass the first transform root when validating transforms (should be true if the instance is transformed)
     */
    markTransformRootDirty: function( displayInstance, passTransform ) {
      passTransform ? this._dirtyTransformRoots.push( displayInstance ) : this._dirtyTransformRootsWithoutPass.push( displayInstance );
    },
    
    updateDirtyTransformRoots: function() {
      while ( this._dirtyTransformRoots.length ) {
        this._dirtyTransformRoots.pop().updateTransformListenersAndCompute( false, false, this._frameId, true );
      }
      while ( this._dirtyTransformRootsWithoutPass.length ) {
        this._dirtyTransformRootsWithoutPass.pop().updateTransformListenersAndCompute( false, false, this._frameId, false );
      }
    },
    
    markInstanceRootForDisposal: function( displayInstance ) {
      this._instanceRootsToDispose.push( displayInstance );
    },
    
    markDrawableForDisposal: function( drawable ) {
      this._drawablesToDispose.push( drawable );
    },
    
    /*---------------------------------------------------------------------------*
    * Cursors
    *----------------------------------------------------------------------------*/
    
    updateCursor: function() {
      if ( this._input && this._input.mouse && this._input.mouse.point ) {
        if ( this._input.mouse.cursor ) {
          return this.setSceneCursor( this._input.mouse.cursor );
        }
        
        //OHTWO TODO: For a display, just return an instance and we can avoid the garbage collection/mutation at the cost of the linked-list traversal instead of an array
        var mouseTrail = this.trailUnderPoint( this._input.mouse.point, isMouseFlags );
        
        if ( mouseTrail ) {
          for ( var i = mouseTrail.length - 1; i >= 0; i-- ) {
            var cursor = mouseTrail.nodes[i].getCursor();
            
            if ( cursor ) {
              return this.setSceneCursor( cursor );
            }
          }
        }
      }
      
      // fallback case
      return this.setSceneCursor( this.defaultCursor );
    },
    
    setSceneCursor: function( cursor ) {
      if ( cursor !== this._lastCursor ) {
        this._lastCursor = cursor;
        var customCursors = Display.customCursors[cursor];
        if ( customCursors ) {
          // go backwards, so the most desired cursor sticks
          for ( var i = customCursors.length - 1; i >= 0; i-- ) {
            this._domElement.style.cursor = customCursors[i];
          }
        } else {
          this._domElement.style.cursor = cursor;
        }
      }
    },
    
    applyCSSHacks: function() {
      // to use CSS3 transforms for performance, hide anything outside our bounds by default
      if ( !this.options.allowSceneOverflow ) {
        this._domElement.style.overflow = 'hidden';
      }
      
      // forward all pointer events
      this._domElement.style.msTouchAction = 'none';
      
      if ( this.options.allowCSSHacks ) {
        // some css hacks (inspired from https://github.com/EightMedia/hammer.js/blob/master/hammer.js).
        // modified to only apply the proper prefixed version instead of spamming all of them, and doesn't use jQuery.
        Features.setStyle( this._domElement, Features.userDrag, 'none' );
        Features.setStyle( this._domElement, Features.userSelect, 'none' );
        Features.setStyle( this._domElement, Features.touchAction, 'none' );
        Features.setStyle( this._domElement, Features.touchCallout, 'none' );
        Features.setStyle( this._domElement, Features.tapHighlightColor, 'rgba(0,0,0,0)' );
      }
    }
    
  }, Events.prototype ) );
  
  Display.customCursors = {
    'scenery-grab-pointer': ['grab', '-moz-grab', '-webkit-grab', 'pointer'],
    'scenery-grabbing-pointer': ['grabbing', '-moz-grabbing', '-webkit-grabbing', 'pointer']
  };
  
  return Display;
} );
