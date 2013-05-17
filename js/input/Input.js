// Copyright 2002-2012, University of Colorado

/**
 * API for handling mouse / touch / keyboard events.
 *
 * A 'pointer' is an abstract way of describing either the mouse, a single touch point, or a key being pressed.
 * touch points and key presses go away after being released, whereas the mouse 'pointer' is persistent.
 *
 * Events will be called on listeners with a single event object. Supported event types are:
 * 'up', 'down', 'out', 'over', 'enter', 'exit', 'move', and 'cancel'. Scenery also supports more specific event
 * types that constrain the type of pointer, so 'mouse' + type, 'touch' + type and 'pen' + type will fire
 * on each listener before the generic event would be fined. E.g. for mouse movement, listener.mousemove will be
 * fired before listener.move.
 *
 * DOM Level 3 events spec: http://www.w3.org/TR/DOM-Level-3-Events/
 * Touch events spec: http://www.w3.org/TR/touch-events/
 * Pointer events spec draft: https://dvcs.w3.org/hg/pointerevents/raw-file/tip/pointerEvents.html
 *
 * @author Jonathan Olson <olsonsjc@gmail.com>
 */

define( function( require ) {
  'use strict';
  
  var scenery = require( 'SCENERY/scenery' );
  
  require( 'SCENERY/util/Trail' );
  require( 'SCENERY/input/Mouse' );
  require( 'SCENERY/input/Touch' );
  require( 'SCENERY/input/Pen' );
  require( 'SCENERY/input/Key' );
  require( 'SCENERY/input/Event' );
  
  scenery.Input = function Input( scene, listenerTarget, batchDOMEvents ) {
    this.scene = scene;
    this.listenerTarget = listenerTarget;
    this.batchDOMEvents = batchDOMEvents;
    
    this.batchedCallbacks = [];
    
    this.mouse = new scenery.Mouse();
    
    this.pointers = [ this.mouse ];
    
    this.listenerReferences = [];
  };
  var Input = scenery.Input;
  
  Input.prototype = {
    constructor: Input,
    
    addPointer: function( pointer ) {
      this.pointers.push( pointer );
    },
    
    removePointer: function( pointer ) {
      // sanity check version, will remove all instances
      for ( var i = this.pointers.length - 1; i >= 0; i-- ) {
        if ( this.pointers[i] === pointer ) {
          this.pointers.splice( i, 1 );
        }
      }
    },
    
    findTouchById: function( id ) {
      return _.find( this.pointers, function( pointer ) { return pointer.id === id; } );
    },
    
    findKeyByEvent: function( event ) {
      sceneryAssert && sceneryAssert( event.keyCode && event.charCode, 'Assumes the KeyboardEvent has keyCode and charCode properties' );
      var result = _.find( this.pointers, function( pointer ) {
        // TODO: also check location (if that exists), so we don't mix up left and right shift, etc.
        return pointer.keyCode === event.keyCode && pointer.charCode === event.charCode;
      } );
      // sceneryAssert && sceneryAssert( result, 'No key found for the combination of key:' + event.key + ' and location:' + event.location );
      return result;
    },
    
    mouseDown: function( point, event ) {
      this.mouse.down( point, event );
      this.downEvent( this.mouse, event );
    },
    
    mouseUp: function( point, event ) {
      this.mouse.up( point, event );
      this.upEvent( this.mouse, event );
    },
    
    mouseMove: function( point, event ) {
      this.mouse.move( point, event );
      this.moveEvent( this.mouse, event );
    },
    
    mouseOver: function( point, event ) {
      this.mouse.over( point, event );
      // TODO: how to handle mouse-over
    },
    
    mouseOut: function( point, event ) {
      this.mouse.out( point, event );
      // TODO: how to handle mouse-out
    },
    
    keyDown: function( event ) {
      var key = new scenery.Key( event );
      this.addPointer( key );
      
      var trail = this.scene.getTrailFromKeyboardFocus();
      this.dispatchEvent( trail, 'keyDown', key, event, true );
    },
    
    keyUp: function( event ) {
      var key = this.findKeyByEvent( event );
      if ( key ) {
        this.removePointer( key );
        
        var trail = this.scene.getTrailFromKeyboardFocus();
        this.dispatchEvent( trail, 'keyUp', key, event, true );
      }
    },
    
    keyPress: function( event ) {
      // NOTE: do we even need keyPress?
    },
    
    // called for each touch point
    touchStart: function( id, point, event ) {
      var touch = new scenery.Touch( id, point, event );
      this.addPointer( touch );
      this.downEvent( touch, event );
    },
    
    touchEnd: function( id, point, event ) {
      var touch = this.findTouchById( id );
      touch.end( point, event );
      this.removePointer( touch );
      this.upEvent( touch, event );
    },
    
    touchMove: function( id, point, event ) {
      var touch = this.findTouchById( id );
      touch.move( point, event );
      this.moveEvent( touch, event );
    },
    
    touchCancel: function( id, point, event ) {
      var touch = this.findTouchById( id );
      touch.cancel( point, event );
      this.removePointer( touch );
      this.cancelEvent( touch, event );
    },
    
    // called for each touch point
    penStart: function( id, point, event ) {
      var pen = new scenery.Pen( id, point, event );
      this.addPointer( pen );
      this.downEvent( pen, event );
    },
    
    penEnd: function( id, point, event ) {
      var pen = this.findTouchById( id );
      pen.end( point, event );
      this.removePointer( pen );
      this.upEvent( pen, event );
    },
    
    penMove: function( id, point, event ) {
      var pen = this.findTouchById( id );
      pen.move( point, event );
      this.moveEvent( pen, event );
    },
    
    penCancel: function( id, point, event ) {
      var pen = this.findTouchById( id );
      pen.cancel( point, event );
      this.removePointer( pen );
      this.cancelEvent( pen, event );
    },
    
    pointerDown: function( id, type, point, event ) {
      switch ( type ) {
        case 'mouse':
          this.mouseDown( point, event );
          break;
        case 'touch':
          this.touchStart( id, point, event );
          break;
        case 'pen':
          this.penStart( id, point, event );
          break;
        default:
          if ( console.log ) {
            console.log( 'Unknown pointer type: ' + type );
          }
      }
    },
    
    pointerUp: function( id, type, point, event ) {
      switch ( type ) {
        case 'mouse':
          this.mouseUp( point, event );
          break;
        case 'touch':
          this.touchEnd( id, point, event );
          break;
        case 'pen':
          this.penEnd( id, point, event );
          break;
        default:
          if ( console.log ) {
            console.log( 'Unknown pointer type: ' + type );
          }
      }
    },
    
    pointerCancel: function( id, type, point, event ) {
      switch ( type ) {
        case 'mouse':
          if ( console && console.log ) {
            console.log( 'WARNING: Pointer mouse cancel was received' );
          }
          break;
        case 'touch':
          this.touchCancel( id, point, event );
          break;
        case 'pen':
          this.penCancel( id, point, event );
          break;
        default:
          if ( console.log ) {
            console.log( 'Unknown pointer type: ' + type );
          }
      }
    },
    
    pointerMove: function( id, type, point, event ) {
      switch ( type ) {
        case 'mouse':
          this.mouseMove( point, event );
          break;
        case 'touch':
          this.touchMove( id, point, event );
          break;
        case 'pen':
          this.penMove( id, point, event );
          break;
        default:
          if ( console.log ) {
            console.log( 'Unknown pointer type: ' + type );
          }
      }
    },
    
    pointerOver: function( id, type, point, event ) {
      
    },
    
    pointerOut: function( id, type, point, event ) {
      
    },
    
    pointerEnter: function( id, type, point, event ) {
      
    },
    
    pointerLeave: function( id, type, point, event ) {
      
    },
    
    upEvent: function( pointer, event ) {
      var trail = this.scene.trailUnderPoint( pointer.point ) || new scenery.Trail( this.scene );
      
      this.dispatchEvent( trail, 'up', pointer, event, true );
      
      pointer.trail = trail;
    },
    
    downEvent: function( pointer, event ) {
      var trail = this.scene.trailUnderPoint( pointer.point ) || new scenery.Trail( this.scene );
      
      this.dispatchEvent( trail, 'down', pointer, event, true );
      
      pointer.trail = trail;
    },
    
    moveEvent: function( pointer, event ) {
      var trail = this.scene.trailUnderPoint( pointer.point ) || new scenery.Trail( this.scene );
      var oldTrail = pointer.trail || new scenery.Trail( this.scene );
      
      var lastNodeChanged = oldTrail.lastNode() !== trail.lastNode();
      
      var branchIndex;
      
      for ( branchIndex = 0; branchIndex < Math.min( trail.length, oldTrail.length ); branchIndex++ ) {
        if ( trail.nodes[branchIndex] !== oldTrail.nodes[branchIndex] ) {
          break;
        }
      }
      
      // event order matches http://www.w3.org/TR/DOM-Level-3-Events/#events-mouseevent-event-order
      this.dispatchEvent( trail, 'move', pointer, event, true );
      
      if ( lastNodeChanged ) {
        this.dispatchEvent( oldTrail, 'out', pointer, event, true );
      }
      
      // we want to approximately mimic http://www.w3.org/TR/DOM-Level-3-Events/#events-mouseevent-event-order
      // TODO: if a node gets moved down 1 depth, it may see both an exit and enter?
      if ( oldTrail.length > branchIndex ) {
        for ( var oldIndex = branchIndex; oldIndex < oldTrail.length; oldIndex++ ) {
          this.dispatchEvent( oldTrail.slice( 0, oldIndex + 1 ), 'exit', pointer, event, false );
        }
      }
      if ( trail.length > branchIndex ) {
        for ( var newIndex = trail.length - 1; newIndex >= branchIndex; newIndex-- ) {
          this.dispatchEvent( trail.slice( 0, newIndex + 1 ), 'enter', pointer, event, false );
        }
      }
      
      if ( lastNodeChanged ) {
        this.dispatchEvent( trail, 'over', pointer, event, true );
      }
      
      pointer.trail = trail;
    },
    
    cancelEvent: function( pointer, event ) {
      var trail = this.scene.trailUnderPoint( pointer.point );
      
      this.dispatchEvent( trail, 'cancel', pointer, event, true );
      
      pointer.trail = trail;
    },
    
    dispatchEvent: function( trail, type, pointer, event, bubbles ) {
      sceneryEventLog && sceneryEventLog( 'Input: ' + type + ' on ' + trail.toString() + ' for pointer ' + pointer.toString() );
      if ( !trail ) {
        try {
          throw new Error( 'falsy trail for dispatchEvent' );
        } catch ( e ) {
          console.log( e.stack );
          throw e;
        }
      }
      
      // TODO: is there a way to make this event immutable?
      var inputEvent = new scenery.Event( {
        trail: trail, // {Trail} path to the leaf-most node, ordered list, from root to leaf
        type: type, // {String} what event was triggered on the listener
        pointer: pointer, // {Pointer}
        domEvent: event, // raw DOM InputEvent (TouchEvent, PointerEvent, MouseEvent,...)
        currentTarget: null, // {Node} whatever node you attached the listener to, null when passed to a Pointer,
        target: trail.lastNode() // {Node} leaf-most node in trail
      } );
      
      // first run through the pointer's listeners to see if one of them will handle the event
      this.dispatchToPointer( type, pointer, inputEvent );
      
      // if not yet handled, run through the trail in order to see if one of them will handle the event
      // at the base of the trail should be the scene node, so the scene will be notified last
      this.dispatchToTargets( trail, pointer, type, inputEvent, bubbles );
      
      // TODO: better interactivity handling?
      if ( !trail.lastNode().interactive && !pointer.isKey ) {
        event.preventDefault();
      }
    },
    
    // TODO: reduce code sharing between here and dispatchToTargets!
    dispatchToPointer: function( type, pointer, inputEvent ) {
      if ( inputEvent.aborted || inputEvent.handled ) {
        return;
      }
      
      var specificType = pointer.type + type; // e.g. mouseup, touchup, keyup
      
      var pointerListeners = pointer.listeners.slice( 0 ); // defensive copy
      for ( var i = 0; i < pointerListeners.length; i++ ) {
        var listener = pointerListeners[i];
        
        // if a listener returns true, don't handle any more
        var aborted = false;
        
        if ( !aborted && listener[specificType] ) {
          listener[specificType]( inputEvent );
          aborted = inputEvent.aborted;
        }
        if ( !aborted && listener[type] ) {
          listener[type]( inputEvent );
          aborted = inputEvent.aborted;
        }
        
        // bail out if the event is aborted, so no other listeners are triggered
        if ( aborted ) {
          return;
        }
      }
    },
    
    dispatchToTargets: function( trail, pointer, type, inputEvent, bubbles ) {
      if ( inputEvent.aborted || inputEvent.handled ) {
        return;
      }
      
      var specificType = pointer.type + type; // e.g. mouseup, touchup, keyup
      
      for ( var i = trail.length - 1; i >= 0; bubbles ? i-- : i = -1 ) {
        var target = trail.nodes[i];
        inputEvent.currentTarget = target;
        
        var listeners = target.getInputListeners();
        
        for ( var k = 0; k < listeners.length; k++ ) {
          var listener = listeners[k];
          
          // if a listener returns true, don't handle any more
          var aborted = false;
          
          if ( !aborted && listener[specificType] ) {
            listener[specificType]( inputEvent );
            aborted = inputEvent.aborted;
          }
          if ( !aborted && listener[type] ) {
            listener[type]( inputEvent );
            aborted = inputEvent.aborted;
          }
          
          // bail out if the event is aborted, so no other listeners are triggered
          if ( aborted ) {
            return;
          }
        }
        
        // if the input event was handled, don't follow the trail down another level
        if ( inputEvent.handled ) {
          return;
        }
      }
    },
    
    addListener: function( type, callback, useCapture ) {
      var input = this;
      
      //Cancel propagation of mouse events but not key events.  Key Events need to propagate for tab navigability
      var usePreventDefault = type !== 'keydown' && type !== 'keyup' && type !== 'keypress';
      
      if ( this.batchDOMEvents ) {
        var batchedCallback = function batchedEvent( domEvent ) {
          sceneryEventLog && sceneryEventLog( 'Batching event for ' + type );
          
          if ( usePreventDefault ) {
            domEvent.preventDefault(); // TODO: should we batch the events in a different place so we don't preventDefault on something bad?
          }
          input.batchedCallbacks.push( function() {
            callback( domEvent );
          } );
        };
        this.listenerTarget.addEventListener( type, batchedCallback, useCapture );
        this.listenerReferences.push( { type: type, callback: batchedCallback, useCapture: useCapture } );
      } else {
        this.listenerTarget.addEventListener( type, callback, useCapture );
        this.listenerReferences.push( { type: type, callback: callback, useCapture: useCapture } );
      }
    },
    
    diposeListeners: function() {
      var input = this;
      _.each( this.listenerReferences, function( ref ) {
        input.listenerTarget.removeEventListener( ref.type, ref.callback, ref.useCapture );
      } );
    },
    
    fireBatchedEvents: function() {
      if ( this.batchedCallbacks.length ) {
        sceneryEventLog && sceneryEventLog( 'Input.fireBatchedEvents length:' + this.batchedCallbacks.length );
        _.each( this.batchedCallbacks, function( callback ) { callback(); } );
        this.batchedCallbacks = [];
      }
    }
  };
  
  return Input;
} );
