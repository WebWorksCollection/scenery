// Copyright 2013-2016, University of Colorado Boulder

/**
 * Main handler for user-input events in Scenery.
 *
 * *** Adding input handling to a display
 *
 * Displays do not have event listeners attached by default. To initialize the event system (that will set up
 * listeners), use one of Display's initialize*Events functions.
 *
 * *** Pointers
 *
 * A 'pointer' is an abstract way of describing a mouse, a single touch point, or a pen/stylus, similar to in the
 * Pointer Events specification (https://dvcs.w3.org/hg/pointerevents/raw-file/tip/pointerEvents.html). Touch and pen
 * pointers are transient, created when the relevant DOM down event occurs and released when corresponding the DOM up
 * or cancel event occurs. However, the mouse pointer is persistent.
 *
 * Input event listeners can be added to {Node}s directly, or to a pointer. When a DOM event is received, it is first
 * broken up into multiple events (if necessary, e.g. multiple touch points), then the dispatch is handled for each
 * individual Scenery event. Events are first fired for any listeners attached to the pointer that caused the event,
 * then fire on the node directly under the pointer, and if applicable, bubble up the graph to the Scene from which the
 * event was triggered. Events are not fired directly on nodes that are not under the pointer at the time of the event.
 * To handle many common patterns (like button presses, where mouse-ups could happen when not over the button), it is
 * necessary to add those move/up listeners to the pointer itself.
 *
 * *** Listeners and Events
 *
 * Event listeners are added with node.addInputListener( listener ), pointer.addInputListener( listener ) and
 * display.addInputListener( listener ).
 * This listener can be an arbitrary object, and the listener will be triggered by calling listener[eventType]( event ),
 * where eventType is one of the event types as described below, and event is a Scenery event with the
 * following properties:
 * - trail {Trail} - Points to the node under the pointer
 * - pointer {Pointer} - The pointer that triggered the event. Additional information about the mouse/touch/pen can be
 *                       obtained from the pointer, for example event.pointer.point.
 * - type {string} - The base type of the event (e.g. for touch down events, it will always just be "down").
 * - domEvent {UIEvent} - The underlying DOM event that triggered this Scenery event. The DOM event may correspond to
 *                        multiple Scenery events, particularly for touch events. This could be a TouchEvent,
 *                        PointerEvent, MouseEvent, MSPointerEvent, etc.
 * - target {Node} - The leaf-most Node in the trail.
 * - currentTarget {Node} - The Node to which the listener being fired is attached, or null if the listener is being
 *                          fired directly from a pointer.
 *
 * Additionally, listeners may support an interrupt() method that detaches it from pointers, or may support being
 * "attached" to a pointer (indicating a primary role in controlling the pointer's behavior). See Pointer for more
 * information about these interactions.
 *
 * *** Event Types
 *
 * Scenery will fire the following base event types:
 *
 * - down: Triggered when a pointer is pressed down. Touch / pen pointers are created for each down event, and are
 *         active until an up/cancel event is sent.
 * - up: Triggered when a pointer is released normally. Touch / pen pointers will not have any more events associated
 *       with them after an up event.
 * - cancel: Triggered when a pointer is canceled abnormally. Touch / pen pointers will not have any more events
 *           associated with them after an up event.
 * - move: Triggered when a pointer moves.
 * - wheel: Triggered when the (mouse) wheel is scrolled. The associated pointer will have wheelDelta information.
 * - enter: Triggered when a pointer moves over a Node or one of its children. Does not bubble up. Mirrors behavior from
 *          the DOM mouseenter (http://www.w3.org/TR/DOM-Level-3-Events/#event-type-mouseenter)
 * - exit:  Triggered when a pointer moves out from over a Node or one of its children. Does not bubble up. Mirrors
 *          behavior from the DOM mouseleave (http://www.w3.org/TR/DOM-Level-3-Events/#event-type-mouseleave).
 * - over: Triggered when a pointer moves over a Node (not including its children). Mirrors behavior from the DOM
 *         mouseover (http://www.w3.org/TR/DOM-Level-3-Events/#event-type-mouseover).
 * - out: Triggered when a pointer moves out from over a Node (not including its children). Mirrors behavior from the
 *        DOM mouseout (http://www.w3.org/TR/DOM-Level-3-Events/#event-type-mouseout).
 *
 * Before firing the base event type (for example, 'move'), Scenery will also fire an event specific to the type of
 * pointer. For mice, it will fire 'mousemove', for touch events it will fire 'touchmove', and for pen events it will
 * fire 'penmove'. Similarly, for any type of event, it will first fire pointerType+eventType, and then eventType.
 *
 * *** Event Dispatch
 *
 * Events have two methods that will cause early termination: event.abort() will cause no more listeners to be notified
 * for this event, and event.handle() will allow the current level of listeners to be notified (all pointer listeners,
 * or all listeners attached to the current node), but no more listeners after that level will fire. handle and abort
 * are like stopPropagation, stopImmediatePropagation for DOM events, except they do not trigger those DOM methods on
 * the underlying DOM event.
 *
 * Up/down/cancel events all happen separately, but for move events, a specific sequence of events occurs if the pointer
 * changes the node it is over:
 *
 * 1. The move event is fired (and bubbles).
 * 2. An out event is fired for the old topmost Node (and bubbles).
 * 3. exit events are fired for all Nodes in the Trail hierarchy that are now not under the pointer, from the root-most
 *    to the leaf-most. Does not bubble.
 * 4. enter events are fired for all Nodes in the Trail hierarchy that were not under the pointer (but now are), from
 *    the leaf-most to the root-most. Does not bubble.
 * 5. An over event is fired for the new topmost Node (and bubbles).
 *
 * event.abort() and event.handle() will currently not affect other stages in the 'move' sequence (e.g. event.abort() in
 * the 'move' event will not affect the following 'out' event).
 *
 * For each event type:
 *
 * 1. Listeners on the pointer will be triggered first (in the order they were added)
 * 2. Listeners on the target (top-most) Node will be triggered (in the order they were added to that Node)
 * 3. Then if the event bubbles, each Node in the Trail will be triggered, starting from the Node under the top-most
 *    (that just had listeners triggered) and all the way down to the Scene. Listeners are triggered in the order they
 *    were added for each Node.
 * 4. Listeners on the display will be triggered (in the order they were added)
 *
 * For each listener being notified, it will fire the more specific pointerType+eventType first (e.g. 'mousemove'),
 * then eventType next (e.g. 'move').
 *
 * Currently, preventDefault() is called on the associated DOM event if the top-most node has the 'interactive' property
 * set to a truthy value.
 *
 * *** Relevant Specifications
 *
 * DOM Level 3 events spec: http://www.w3.org/TR/DOM-Level-3-Events/
 * Touch events spec: http://www.w3.org/TR/touch-events/
 * Pointer events spec draft: https://dvcs.w3.org/hg/pointerevents/raw-file/tip/pointerEvents.html
 *                            http://msdn.microsoft.com/en-us/library/ie/hh673557(v=vs.85).aspx
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Sam Reid (PhET Interactive Simulations)
 */

define( function( require ) {
  'use strict';

  var A11yPointer = require( 'SCENERY/input/A11yPointer' );
  var BatchedDOMEvent = require( 'SCENERY/input/BatchedDOMEvent' );
  var BrowserEvents = require( 'SCENERY/input/BrowserEvents' );
  var cleanArray = require( 'PHET_CORE/cleanArray' );
  var DOMEventIO = require( 'SCENERY/input/DOMEventIO' );
  var Emitter = require( 'AXON/Emitter' );
  var EmitterIO = require( 'AXON/EmitterIO' );
  var Event = require( 'SCENERY/input/Event' );
  var Features = require( 'SCENERY/util/Features' );
  var inherit = require( 'PHET_CORE/inherit' );
  var Mouse = require( 'SCENERY/input/Mouse' );
  var NumberIO = require( 'TANDEM/types/NumberIO' );
  var Pen = require( 'SCENERY/input/Pen' );
  var platform = require( 'PHET_CORE/platform' );
  var Pointer = require( 'SCENERY/input/Pointer' );
  var scenery = require( 'SCENERY/scenery' );
  var Tandem = require( 'TANDEM/Tandem' );
  var Touch = require( 'SCENERY/input/Touch' );
  var Trail = require( 'SCENERY/util/Trail' );
  var Vector2 = require( 'DOT/Vector2' );
  var Vector2IO = require( 'DOT/Vector2IO' );

  // Object literal makes it easy to check for the existence of an attribute (compared to [].indexOf()>=0)
  var domEventPropertiesToSerialize = {
    button: true, keyCode: true,
    deltaX: true, deltaY: true, deltaZ: true, deltaMode: true, pointerId: true,
    pointerType: true, charCode: true, which: true, clientX: true, clientY: true, changedTouches: true
  };

  /**
   * An input controller for a specific Display.
   * @constructor
   *
   * @param {Display} display
   * @param {boolean} attachToWindow - Whether to add listeners to the window (instead of the Display's domElement).
   * @param {boolean} batchDOMEvents - If true, most event types will be batched until otherwise triggered.
   * @param {boolean} assumeFullWindow - We can optimize certain things like computing points if we know the display
   *                                     fills the entire window.
   * @param {boolean|null} passiveEvents - See Display's documentation (controls the presence of the passive flag for
   *                                       events, which has some advanced considerations).
   *
   * @param {Object} [options]
   */
  function Input( display, attachToWindow, batchDOMEvents, assumeFullWindow, passiveEvents, options ) {
    assert && assert( display instanceof scenery.Display );
    assert && assert( typeof attachToWindow === 'boolean' );
    assert && assert( typeof batchDOMEvents === 'boolean' );
    assert && assert( typeof assumeFullWindow === 'boolean' );
    var self = this;

    options = _.extend( {
      tandem: Tandem.optional
    }, options );

    // @public {Display}
    this.display = display;

    // @public {Node}
    this.rootNode = display.rootNode;

    // @public {boolean}
    this.attachToWindow = attachToWindow;
    this.batchDOMEvents = batchDOMEvents;
    this.assumeFullWindow = assumeFullWindow;

    // @public {boolean|null}
    this.passiveEvents = passiveEvents;

    // @private {Array.<BatchedDOMEvent}>
    this.batchedEvents = [];

    // @public {A11yPointer|null} - Pointer for accessibility, only created lazily on first a11y event.
    this.a11yPointer = null;

    // @public {Mouse|null} - Pointer for mouse, only created lazily on first mouse event, so no mouse is allocated on.
    // tablets.
    this.mouse = null;

    // @public {Array.<Pointer>} - All active pointers.
    this.pointers = [];

    // TODO: replace this with an emitter
    this.pointerAddedListeners = [];

    // @public {boolean} - Whether we are currently firing events. We need to track this to handle re-entrant cases
    // like https://github.com/phetsims/balloons-and-static-electricity/issues/406.
    this.currentlyFiringEvents = false;

    // Declare the Emitters that send scenery input events to the PhET-iO data stream.  Note they use the default value
    // of phetioReadOnly false, in case a client wants to synthesize events.

    // @private {Emitter} Emits pointer validation to the input stream for playback
    const validatePointers = function() {
      var i = self.pointers.length;
      while ( i-- ) {
        var pointer = self.pointers[ i ];
        if ( pointer.point ) {
          self.branchChangeEvents( pointer, pointer.lastDOMEvent, false );
        }
      }
    };

    // This is a high frequency event that is necessary for reproducible playbacks
    this.validatePointersEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'validatePointersEmitter' ),
      phetioHighFrequency: true,
      listener: validatePointers
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.  
    this.mouseUpEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'mouseUpEmitter' ),
      phetioType: EmitterIO( [
        { name: 'point', type: Vector2IO },
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when a mouse button is released',
      listener: function( point, event ) {
        if ( !self.mouse ) { self.initMouse(); }
        var pointChanged = self.mouse.up( point, event );
        self.upEvent( self.mouse, event, pointChanged );
      }
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.  
    this.mouseDownEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'mouseDownEmitter' ),
      phetioType: EmitterIO( [
        { name: 'point', type: Vector2IO },
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when a mouse button is pressed',
      listener: function( point, event ) {
        if ( !self.mouse ) { self.initMouse(); }
        var pointChanged = self.mouse.down( point, event );
        self.downEvent( self.mouse, event, pointChanged );
      }
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.  
    this.mouseMovedEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'mouseMovedEmitter' ),
      phetioType: EmitterIO( [
        { name: 'point', type: Vector2IO },
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when the mouse is moved',
      phetioHighFrequency: true,
      listener: function( point, event ) {
        if ( !self.mouse ) { self.initMouse(); }
        self.mouse.move( point, event );
        self.moveEvent( self.mouse, event );
      }
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.  
    this.mouseOverEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'mouseOverEmitter' ),
      phetioType: EmitterIO( [
        { name: 'point', type: Vector2IO },
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when the mouse is moved over a Node',
      listener: function( point, event ) {
        if ( !self.mouse ) { self.initMouse(); }
        self.mouse.over( point, event );
        // TODO: how to handle mouse-over (and log it)... are we changing the pointer.point without a branch change?
      }
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.  
    this.mouseOutEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'mouseOutEmitter' ),
      phetioType: EmitterIO( [
        { name: 'point', type: Vector2IO },
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when the mouse moves out of the display',
      listener: function( point, event ) {
        if ( !self.mouse ) { self.initMouse(); }
        self.mouse.out( point, event );
        // TODO: how to handle mouse-out (and log it)... are we changing the pointer.point without a branch change?
      }
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.  
    this.wheelScrolledEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'wheelScrolledEmitter' ),
      phetioType: EmitterIO( [
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when the mouse wheel scrolls',
      phetioHighFrequency: true,
      listener: function( event ) {
        if ( !self.mouse ) { self.initMouse(); }
        self.mouse.wheel( event );

        // don't send mouse-wheel events if we don't yet have a mouse location!
        // TODO: Can we set the mouse location based on the wheel event?
        if ( self.mouse.point ) {
          var trail = self.rootNode.trailUnderPointer( self.mouse ) || new Trail( self.rootNode );
          self.dispatchEvent( trail, 'wheel', self.mouse, event, true );
        }
      }
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.
    this.touchStartedEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'touchStartedEmitter' ),
      phetioType: EmitterIO( [
        { name: 'id', type: NumberIO },
        { name: 'point', type: Vector2IO },
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when a touch begins',
      listener: function( id, point, event ) {
        var touch = new Touch( id, point, event );
        self.addPointer( touch );
        self.downEvent( touch, event, false );
      }
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.
    this.touchEndedEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'touchEndedEmitter' ),
      phetioType: EmitterIO( [
        { name: 'id', type: NumberIO },
        { name: 'point', type: Vector2IO },
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when a touch ends',
      listener: function( id, point, event ) {
        var touch = self.findPointerById( id );
        if ( touch ) {
          var pointChanged = touch.end( point, event );
          self.upEvent( touch, event, pointChanged );
          self.removePointer( touch );
        }
      }
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.
    this.touchMovedEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'touchMovedEmitter' ),
      phetioType: EmitterIO( [
        { name: 'id', type: NumberIO },
        { name: 'point', type: Vector2IO },
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when a touch moves',
      phetioHighFrequency: true,
      listener: function( id, point, event ) {
        var touch = self.findPointerById( id );
        if ( touch ) {
          touch.move( point, event );
          self.moveEvent( touch, event );
        }
      }
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.
    this.touchCanceledEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'touchCanceledEmitter' ),
      phetioType: EmitterIO( [
        { name: 'id', type: NumberIO },
        { name: 'point', type: Vector2IO },
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when a touch is canceled',
      listener: function( id, point, event ) {
        var touch = self.findPointerById( id );
        if ( touch ) {
          var pointChanged = touch.cancel( point, event );
          self.cancelEvent( touch, event, pointChanged );
          self.removePointer( touch );
        }
      }
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.
    this.penStartedEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'penStartedEmitter' ),
      phetioType: EmitterIO( [
        { name: 'id', type: NumberIO },
        { name: 'point', type: Vector2IO },
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when a pen touches the screen',
      listener: function( id, point, event ) {
        var pen = new Pen( id, point, event );
        self.addPointer( pen );
        self.downEvent( pen, event, false );
      }
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.
    this.penEndedEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'penEndedEmitter' ),
      phetioType: EmitterIO( [
        { name: 'id', type: NumberIO },
        { name: 'point', type: Vector2IO },
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when a pen is lifted',
      listener: function( id, point, event ) {
        var pen = self.findPointerById( id );
        if ( pen ) {
          var pointChanged = pen.end( point, event );
          self.upEvent( pen, event, pointChanged );
          self.removePointer( pen );
        }
      }
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.
    this.penMovedEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'penMovedEmitter' ),
      phetioType: EmitterIO( [
        { name: 'id', type: NumberIO },
        { name: 'point', type: Vector2IO },
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when a pen is moved',
      phetioHighFrequency: true,
      listener: function( id, point, event ) {
        var pen = self.findPointerById( id );
        if ( pen ) {
          pen.move( point, event );
          self.moveEvent( pen, event );
        }
      }
    } );

    // @private {Emitter} - Emits to the PhET-iO data stream.
    this.penCanceledEmitter = new Emitter( {
      phetioPlayback: true,
      tandem: options.tandem.createTandem( 'penCanceledEmitter' ),
      phetioType: EmitterIO( [
        { name: 'id', type: NumberIO },
        { name: 'point', type: Vector2IO },
        { name: 'event', type: DOMEventIO }
      ] ),
      phetioEventType: 'user',
      phetioDocumentation: 'Emits when a pen is canceled',
      listener: function( id, point, event ) {
        var pen = self.findPointerById( id );
        if ( pen ) {
          var pointChanged = pen.cancel( point, event );
          self.cancelEvent( pen, event, pointChanged );
          self.removePointer( pen );
        }
      }
    } );

    if ( this.display._accessible ) {
      var accessibleEventOptions = Features.passive ? { useCapture: false, passive: false } : false;

      this.display.accessibleDOMElement.addEventListener( 'focusin', function( event ) {
        if ( !self.a11yPointer ) { self.initA11yPointer(); }
        self.focusIn( event );
      }, accessibleEventOptions );

      this.display.accessibleDOMElement.addEventListener( 'focusout', function( event ) {
        if ( !self.a11yPointer ) { self.initA11yPointer(); }
        self.focusOut( event );
      }, accessibleEventOptions );
    }
  }

  scenery.register( 'Input', Input );

  inherit( Object, Input, {
    /**
     * Interrupts any input actions that are currently taking place (should stop drags, etc.)
     * @public
     */
    interruptPointers: function() {
      _.each( this.pointers, function( pointer ) {
        pointer.interruptAll();
      } );
    },

    /**
     * Called to batch a raw DOM event (which may be immediately fired, depending on the settings).
     * @public (scenery-internal)
     *
     * @param {DOMEvent} domEvent
     * @param {number} batchType - See BatchedDOMEvent's "enumeration" - TODO: use an actual enumeration
     * @param {function} callback - Parameter types defined by the batchType. See BatchedDOMEvent for details
     * @param {boolean} triggerImmediate - Certain events can force immediate action, since browsers like Chrome
     *                                     only allow certain operations in the callback for a user gesture (e.g. like
     *                                     a mouseup to open a window).
     */
    batchEvent: function( domEvent, batchType, callback, triggerImmediate ) {
      sceneryLog && sceneryLog.InputEvent && sceneryLog.InputEvent( 'Input.batchEvent' );
      sceneryLog && sceneryLog.InputEvent && sceneryLog.push();

      // If our display is not interactive, do not respond to any events (but still prevent default)
      if ( this.display.interactive ) {
        this.batchedEvents.push( BatchedDOMEvent.createFromPool( domEvent, batchType, callback ) );
        if ( triggerImmediate || !this.batchDOMEvents ) {
          this.fireBatchedEvents();
        }
        // NOTE: If we ever want to Display.updateDisplay() on events, do so here
      }

      // Always preventDefault on touch events, since we don't want mouse events triggered afterwards. See
      // http://www.html5rocks.com/en/mobile/touchandmouse/ for more information.
      // Additionally, IE had some issues with skipping prevent default, see
      // https://github.com/phetsims/scenery/issues/464 for mouse handling.
      if ( !( this.passiveEvents === true ) && ( callback !== this.mouseDown || platform.ie || platform.edge ) ) {
        // We cannot prevent a passive event, so don't try
        domEvent.preventDefault();
      }

      sceneryLog && sceneryLog.InputEvent && sceneryLog.pop();
    },

    /**
     * Fires all of our events that were batched into the batchedEvents array.
     * @public (scenery-internal)
     */
    fireBatchedEvents: function() {
      sceneryLog && sceneryLog.InputEvent && this.currentlyFiringEvents && sceneryLog.InputEvent(
        'REENTRANCE DETECTED' );
      // Don't re-entrantly enter our loop, see https://github.com/phetsims/balloons-and-static-electricity/issues/406
      if ( !this.currentlyFiringEvents && this.batchedEvents.length ) {
        sceneryLog && sceneryLog.InputEvent && sceneryLog.InputEvent( 'Input.fireBatchedEvents length:' + this.batchedEvents.length );
        sceneryLog && sceneryLog.InputEvent && sceneryLog.push();

        this.currentlyFiringEvents = true;

        // needs to be done in order
        var batchedEvents = this.batchedEvents;
        // IMPORTANT: We need to check the length of the array at every iteration, as it can change due to re-entrant
        // event handling, see https://github.com/phetsims/balloons-and-static-electricity/issues/406.
        // Events may be appended to this (synchronously) as part of firing initial events, so we want to FULLY run all
        // events before clearing our array.
        for ( var i = 0; i < batchedEvents.length; i++ ) {
          var batchedEvent = batchedEvents[ i ];
          batchedEvent.run( this );
          batchedEvent.dispose();
        }
        cleanArray( batchedEvents );

        this.currentlyFiringEvents = false;

        sceneryLog && sceneryLog.InputEvent && sceneryLog.pop();
      }
    },

    /**
     * Clears any batched events that we don't want to process.
     * @public (scenery-internal)
     *
     * NOTE: It is HIGHLY recommended to interrupt pointers and remove non-Mouse pointers before doing this, as
     * otherwise it can cause incorrect state in certain types of listeners (e.g. ones that count how many pointers
     * are over them).
     */
    clearBatchedEvents: function() {
      this.batchedEvents.length = 0;
    },

    /**
     * Checks all pointers to see whether they are still "over" the same nodes (trail). If not, it will fire the usual
     * enter/exit events.
     * @public (scenery-internal)
     */
    validatePointers: function() {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'validatePointers' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.validatePointersEmitter.emit();
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Removes all non-Mouse pointers from internal tracking.
     * @public (scenery-internal)
     */
    removeTemporaryPointers: function() {
      var fakeDomEvent = {
        // TODO: Does this break anything
      };

      for ( var i = this.pointers.length - 1; i >= 0; i-- ) {
        var pointer = this.pointers[ i ];
        if ( !( pointer instanceof Mouse ) ) {
          this.pointers.splice( i, 1 );

          // Send exit events. As we can't get a DOM event, we'll send a fake object instead.
          //TODO: consider exit() not taking an event?
          var exitTrail = pointer.trail || new Trail( this.rootNode );
          this.exitEvents( pointer, fakeDomEvent, exitTrail, 0, true );
        }
      }
    },

    /**
     * Hooks up DOM listeners to whatever type of object we are going to listen to.
     * @public (scenery-internal)
     */
    connectListeners: function() {
      BrowserEvents.addDisplay( this.display, this.attachToWindow, this.passiveEvents );
    },

    /**
     * Removes DOM listeners from whatever type of object we were listening to.
     * @public (scenery-internal)
     */
    disconnectListeners: function() {
      BrowserEvents.removeDisplay( this.display, this.attachToWindow, this.passiveEvents );
    },

    /**
     * Extract a {Vector2} global coordinate point from an arbitrary DOM event.
     * @public (scenery-internal)
     *
     * @param {DOMEvent} domEvent
     * @returns {Vector2}
     */
    pointFromEvent: function( domEvent ) {
      var position = Vector2.createFromPool( domEvent.clientX, domEvent.clientY );
      if ( !this.assumeFullWindow ) {
        var domBounds = this.display.domElement.getBoundingClientRect();

        // TODO: consider totally ignoring any with zero width/height, as we aren't attached to the display?
        // For now, don't offset.
        if ( domBounds.width > 0 && domBounds.height > 0 ) {
          position.subtractXY( domBounds.left, domBounds.top );

          // Detect a scaling of the display here (the client bounding rect having different dimensions from our
          // display), and attempt to compensate.
          // NOTE: We can't handle rotation here.
          if ( domBounds.width !== this.display.width || domBounds.height !== this.display.height ) {
            // TODO: Have code verify the correctness here, and that it's not triggering all the time
            position.x *= this.display.width / domBounds.width;
            position.y *= this.display.height / domBounds.height;
          }
        }
      }
      return position;
    },

    /**
     * Adds a pointer to our list.
     * @private
     *
     * @param {Pointer} pointer
     */
    addPointer: function( pointer ) {
      this.pointers.push( pointer );

      // Callback for showing pointer events.  Optimized for performance.
      if ( this.pointerAddedListeners.length ) {
        for ( var i = 0; i < this.pointerAddedListeners.length; i++ ) {
          this.pointerAddedListeners[ i ]( pointer );
        }
      }
    },

    // TODO: Just use an emitter
    addPointerAddedListener: function( listener ) {
      this.pointerAddedListeners.push( listener );
    },

    removePointerAddedListener: function( listener ) {
      var index = this.pointerAddedListeners.indexOf( listener );
      if ( index !== -1 ) {
        this.pointerAddedListeners.splice( index, index + 1 );
      }
    },

    /**
     * Removes a pointer from our list. If we get future events for it (based on the ID) it will be ignored.
     * @private
     *
     * @param {Pointer} pointer
     */
    removePointer: function( pointer ) {
      // sanity check version, will remove all instances
      for ( var i = this.pointers.length - 1; i >= 0; i-- ) {
        if ( this.pointers[ i ] === pointer ) {
          this.pointers.splice( i, 1 );
        }
      }

      pointer.dispose();
    },

    /**
     * Given a pointer's ID (given by the pointer/touch specifications to be unique to a specific pointer/touch),
     * returns the given pointer (if we have one).
     * @private
     *
     * NOTE: There are some cases where we may have prematurely "removed" a pointer.
     *
     * @param {number} id
     * @returns {Pointer|null}
     */
    findPointerById: function( id ) {
      var i = this.pointers.length;
      while ( i-- ) {
        var pointer = this.pointers[ i ];
        if ( pointer.id === id ) {
          return pointer;
        }
      }
      return null;
    },

    /**
     * Triggers a logical focus event.
     * @public (scenery-internal)
     *
     * @param {DOMEvent} event
     */
    focusIn: function( event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'focusIn(' + Input.debugText( null, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();

      var trail = this.a11yPointer.updateTrail( this.rootNode, event.target.getAttribute( 'data-trail-id' ) );

      this.dispatchEvent( trail, 'focus', this.a11yPointer, event, false );

      // TODO: emit focusIn emitter? Or is it just called focusEmitter? See #888

      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical blur event.
     * @public (scenery-internal)
     *
     * @param {DOMEvent} event
     */
    focusOut: function( event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'focusOut(' + Input.debugText( null, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();

      // recompute the trail on focusout if necessary - since a blur/focusout may have been initiated from a
      // focus/focusin listener, it is possible that focusout was called more than once before focusin is called on the
      // next active element, see https://github.com/phetsims/scenery/issues/898
      var trail = this.a11yPointer.trail;
      assert && assert( trail, 'an a11yPointer trail should have been created' );

      if ( assertSlow ) {
        var newTrail = Trail.fromUniqueId( this.rootNode, event.target.getAttribute( 'data-trail-id' ) );
        assert( newTrail.equals( this.a11yPointer.trail ), 'focusout target different from focusin target' );
      }
      this.dispatchEvent( trail, 'blur', this.a11yPointer, event, false );

      // TODO: emit focusIn emitter? Or is it just called focusEmitter? See #888

      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Initializes the Mouse object on the first mouse event (this may never happen on touch devices).
     * @private
     */
    initMouse: function() {
      this.mouse = new Mouse();
      this.addPointer( this.mouse );
    },

    /**
     * Initializes the accessible pointer object on the first a11y event.
     * @private
     */
    initA11yPointer: function() {
      this.a11yPointer = new A11yPointer();
      this.a11yPointer.initializeListeners( this.display );

      this.addPointer( this.a11yPointer );
    },

    /**
     * Triggers a logical mousedown event.
     * @public (scenery-internal)
     *
     * NOTE: This may also be called from the pointer event handler (pointerDown) or from things like fuzzing or
     * playback. The event may be "faked" for certain purposes.
     *
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    mouseDown: function( point, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'mouseDown(' + Input.debugText( point, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.mouseDownEmitter.emit( point, event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical mouseup event.
     * @public (scenery-internal)
     *
     * NOTE: This may also be called from the pointer event handler (pointerUp) or from things like fuzzing or
     * playback. The event may be "faked" for certain purposes.
     *
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    mouseUp: function( point, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'mouseUp(' + Input.debugText( point, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.mouseUpEmitter.emit( point, event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical mousemove event.
     * @public (scenery-internal)
     *
     * NOTE: This may also be called from the pointer event handler (pointerMove) or from things like fuzzing or
     * playback. The event may be "faked" for certain purposes.
     *
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    mouseMove: function( point, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'mouseMove(' + Input.debugText( point, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.mouseMovedEmitter.emit( point, event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical mouseover event (this does NOT correspond to the Scenery event, since this is for the display)
     * @public (scenery-internal)
     *
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    mouseOver: function( point, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'mouseOver(' + Input.debugText( point, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.mouseOverEmitter.emit( point, event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical mouseout event (this does NOT correspond to the Scenery event, since this is for the display)
     * @public (scenery-internal)
     *
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    mouseOut: function( point, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'mouseOut(' + Input.debugText( point, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.mouseOutEmitter.emit( point, event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical mouse-wheel/scroll event.
     * @public (scenery-internal)
     *
     * @param {DOMEvent} event
     */
    wheel: function( event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'wheel(' + Input.debugText( null, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.wheelScrolledEmitter.emit( event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical touchstart event. This is called for each touch point in a 'raw' event.
     * @public (scenery-internal)
     *
     * NOTE: This may also be called from the pointer event handler (pointerDown) or from things like fuzzing or
     * playback. The event may be "faked" for certain purposes.
     *
     * @param {number} id
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    touchStart: function( id, point, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'touchStart(\'' + id + '\',' + Input.debugText( point, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.touchStartedEmitter.emit( id, point, event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical touchend event. This is called for each touch point in a 'raw' event.
     * @public (scenery-internal)
     *
     * NOTE: This may also be called from the pointer event handler (pointerUp) or from things like fuzzing or
     * playback. The event may be "faked" for certain purposes.
     *
     * @param {number} id
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    touchEnd: function( id, point, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'touchEnd(\'' + id + '\',' + Input.debugText( point, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.touchEndedEmitter.emit( id, point, event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical touchmove event. This is called for each touch point in a 'raw' event.
     * @public (scenery-internal)
     *
     * NOTE: This may also be called from the pointer event handler (pointerMove) or from things like fuzzing or
     * playback. The event may be "faked" for certain purposes.
     *
     * @param {number} id
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    touchMove: function( id, point, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'touchMove(\'' + id + '\',' + Input.debugText( point, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.touchMovedEmitter.emit( id, point, event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical touchcancel event. This is called for each touch point in a 'raw' event.
     * @public (scenery-internal)
     *
     * NOTE: This may also be called from the pointer event handler (pointerCancel) or from things like fuzzing or
     * playback. The event may be "faked" for certain purposes.
     *
     * @param {number} id
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    touchCancel: function( id, point, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'touchCancel(\'' + id + '\',' + Input.debugText( point, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.touchCanceledEmitter.emit( id, point, event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical penstart event (e.g. a stylus). This is called for each pen point in a 'raw' event.
     * @public (scenery-internal)
     *
     * NOTE: This may also be called from the pointer event handler (pointerDown) or from things like fuzzing or
     * playback. The event may be "faked" for certain purposes.
     *
     * @param {number} id
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    penStart: function( id, point, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'penStart(\'' + id + '\',' + Input.debugText( point, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.penStartedEmitter.emit( id, point, event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical penend event (e.g. a stylus). This is called for each pen point in a 'raw' event.
     * @public (scenery-internal)
     *
     * NOTE: This may also be called from the pointer event handler (pointerUp) or from things like fuzzing or
     * playback. The event may be "faked" for certain purposes.
     *
     * @param {number} id
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    penEnd: function( id, point, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'penEnd(\'' + id + '\',' + Input.debugText( point, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.penEndedEmitter.emit( id, point, event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical penmove event (e.g. a stylus). This is called for each pen point in a 'raw' event.
     * @public (scenery-internal)
     *
     * NOTE: This may also be called from the pointer event handler (pointerMove) or from things like fuzzing or
     * playback. The event may be "faked" for certain purposes.
     *
     * @param {number} id
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    penMove: function( id, point, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'penMove(\'' + id + '\',' + Input.debugText( point, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.penMovedEmitter.emit( id, point, event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Triggers a logical pencancel event (e.g. a stylus). This is called for each pen point in a 'raw' event.
     * @public (scenery-internal)
     *
     * NOTE: This may also be called from the pointer event handler (pointerCancel) or from things like fuzzing or
     * playback. The event may be "faked" for certain purposes.
     *
     * @param {number} id
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    penCancel: function( id, point, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'penCancel(\'' + id + '\',' + Input.debugText( point, event ) + ');' );
      sceneryLog && sceneryLog.Input && sceneryLog.push();
      this.penCanceledEmitter.emit( id, point, event );
      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Handles a pointerdown event, forwarding it to the proper logical event.
     * @public (scenery-internal)
     *
     * @param {number} id
     * @param {string} type
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    pointerDown: function( id, type, point, event ) {
      // In IE for pointer down events, we want to make sure than the next interactions off the page are sent to
      // this element (it will bubble). See https://github.com/phetsims/scenery/issues/464 and
      // http://news.qooxdoo.org/mouse-capturing.
      var target = this.attachToWindow ? document.body : this.display.domElement;
      if ( target.setPointerCapture && event.pointerId ) {
        target.setPointerCapture( event.pointerId );
      }

      switch( type ) {
        case 'mouse':
          // The actual event afterwards
          this.mouseDown( point, event );
          break;
        case 'touch':
          this.touchStart( id, point, event );
          break;
        case 'pen':
          this.penStart( id, point, event );
          break;
        default:
          if ( assert ) {
            throw new Error( 'Unknown pointer type: ' + type );
          }
      }
    },

    /**
     * Handles a pointerup event, forwarding it to the proper logical event.
     * @public (scenery-internal)
     *
     * @param {number} id
     * @param {string} type
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    pointerUp: function( id, type, point, event ) {
      switch( type ) {
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
          if ( assert ) {
            throw new Error( 'Unknown pointer type: ' + type );
          }
      }
    },

    /**
     * Handles a pointercancel event, forwarding it to the proper logical event.
     * @public (scenery-internal)
     *
     * @param {number} id
     * @param {string} type
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    pointerCancel: function( id, type, point, event ) {
      switch( type ) {
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

    /**
     * Handles a pointermove event, forwarding it to the proper logical event.
     * @public (scenery-internal)
     *
     * @param {number} id
     * @param {string} type
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    pointerMove: function( id, type, point, event ) {
      switch( type ) {
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

    /**
     * Handles a pointerover event, forwarding it to the proper logical event.
     * @public (scenery-internal)
     *
     * @param {number} id
     * @param {string} type
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    pointerOver: function( id, type, point, event ) {
      // TODO: accumulate mouse/touch info in the object if needed?
      // TODO: do we want to branch change on these types of events?
    },

    /**
     * Handles a pointerout event, forwarding it to the proper logical event.
     * @public (scenery-internal)
     *
     * @param {number} id
     * @param {string} type
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    pointerOut: function( id, type, point, event ) {
      // TODO: accumulate mouse/touch info in the object if needed?
      // TODO: do we want to branch change on these types of events?
    },

    /**
     * Handles a pointerenter event, forwarding it to the proper logical event.
     * @public (scenery-internal)
     *
     * @param {number} id
     * @param {string} type
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    pointerEnter: function( id, type, point, event ) {
      // TODO: accumulate mouse/touch info in the object if needed?
      // TODO: do we want to branch change on these types of events?
    },

    /**
     * Handles a pointerleave event, forwarding it to the proper logical event.
     * @public (scenery-internal)
     *
     * @param {number} id
     * @param {string} type
     * @param {Vector2} point
     * @param {DOMEvent} event
     */
    pointerLeave: function( id, type, point, event ) {
      // TODO: accumulate mouse/touch info in the object if needed?
      // TODO: do we want to branch change on these types of events?
    },

    /**
     * Given a pointer reference, hit test it and determine the Trail that the pointer is over.
     * @private
     *
     * @param {Pointer}
     * @returns {Trail}
     */
    getPointerTrail: function( pointer ) {
      return this.rootNode.trailUnderPointer( pointer ) || new Trail( this.rootNode );
    },

    /**
     * Called for each logical "up" event, for any pointer type.
     * @private
     *
     * @param {Pointer} pointer
     * @param {DOMEvent} event
     * @param {boolean} pointChanged
     */
    upEvent: function( pointer, event, pointChanged ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'upEvent ' + pointer.toString() + ' changed:' + pointChanged );
      sceneryLog && sceneryLog.Input && sceneryLog.push();

      assert && assert( pointer instanceof Pointer );
      assert && assert( typeof pointChanged === 'boolean' );

      // We'll use this trail for the entire dispatch of this event.
      var eventTrail = this.branchChangeEvents( pointer, event, pointChanged );

      this.dispatchEvent( eventTrail, 'up', pointer, event, true );

      // touch pointers are transient, so fire exit/out to the trail afterwards
      if ( pointer instanceof Touch ) {
        this.exitEvents( pointer, event, eventTrail, 0, true );
      }

      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Called for each logical "down" event, for any pointer type.
     * @private
     *
     * @param {Pointer} pointer
     * @param {DOMEvent} event
     * @param {boolean} pointChanged
     */
    downEvent: function( pointer, event, pointChanged ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'downEvent ' + pointer.toString() + ' changed:' + pointChanged );
      sceneryLog && sceneryLog.Input && sceneryLog.push();

      assert && assert( pointer instanceof Pointer );
      assert && assert( typeof pointChanged === 'boolean' );

      // We'll use this trail for the entire dispatch of this event.
      var eventTrail = this.branchChangeEvents( pointer, event, pointChanged );
      this.dispatchEvent( eventTrail, 'down', pointer, event, true );

      // a11y
      var focusableNode = null;
      var trailAccessible = !eventTrail.rootNode()._rendererSummary.isNotAccessible();

      // If any node in the trail has accessible content
      if ( trailAccessible ) {

        // an AT might have sent a down event at the location of the PDOM element (outside of the display), if this
        // happened we will not remove focus
        var inDisplay = this.display.bounds.containsPoint( pointer.point );
        if ( inDisplay ) {

          // Starting with the leaf most node, search for the closest accessible ancestor from the node under the
          // pointer.
          for ( var i = eventTrail.nodes.length - 1; i >= 0; i-- ) {
            if ( eventTrail.nodes[ i ].focusable ) {
              focusableNode = eventTrail.nodes[ i ];
              break;
            }
          }

          // Remove keyboard focus, but store element that is receiving interaction in case we resume .
          this.display.pointerFocus = focusableNode;
          scenery.Display.focus = null;

        }
      }

      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Called for each logical "move" event, for any pointer type.
     * @private
     *
     * @param {Pointer} pointer
     * @param {DOMEvent} event
     */
    moveEvent: function( pointer, event ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'moveEvent ' + pointer.toString() );
      sceneryLog && sceneryLog.Input && sceneryLog.push();

      assert && assert( pointer instanceof Pointer );

      // Always treat move events as "point changed"
      this.branchChangeEvents( pointer, event, true );

      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Called for each logical "cancel" event, for any pointer type.
     * @private
     *
     * @param {Pointer} pointer
     * @param {DOMEvent} event
     * @param {boolean} pointChanged
     */
    cancelEvent: function( pointer, event, pointChanged ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input( 'cancelEvent ' + pointer.toString() + ' changed:' + pointChanged );
      sceneryLog && sceneryLog.Input && sceneryLog.push();

      assert && assert( pointer instanceof Pointer );
      assert && assert( typeof pointChanged === 'boolean' );

      // We'll use this trail for the entire dispatch of this event.
      var eventTrail = this.branchChangeEvents( pointer, event, pointChanged );

      this.dispatchEvent( eventTrail, 'cancel', pointer, event, true );

      // touch pointers are transient, so fire exit/out to the trail afterwards
      if ( pointer instanceof Touch ) {
        this.exitEvents( pointer, event, eventTrail, 0, true );
      }

      sceneryLog && sceneryLog.Input && sceneryLog.pop();
    },

    /**
     * Dispatches any necessary events that would result from the pointer's trail changing.
     * @private
     *
     * This will send the necessary exit/enter events (on subtrails that have diverged between before/after), the
     * out/over events, and if flagged a move event.
     *
     * @param {Pointer} pointer
     * @param {DOMEvent|null} event
     * @param {boolean} sendMove - Whether to send move events
     * @returns {Trail} - The current trail of the pointer
     */
    branchChangeEvents: function( pointer, event, sendMove ) {
      sceneryLog && sceneryLog.Input && sceneryLog.Input(
        'branchChangeEvents: ' + pointer.toString() + ' sendMove:' + sendMove );
      sceneryLog && sceneryLog.Input && sceneryLog.push();

      assert && assert( pointer instanceof Pointer );
      assert && assert( typeof sendMove === 'boolean' );

      var trail = this.getPointerTrail( pointer );
      var oldTrail = pointer.trail || new Trail( this.rootNode ); // TODO: consider a static trail reference

      var lastNodeChanged = oldTrail.lastNode() !== trail.lastNode();

      var branchIndex = Trail.branchIndex( trail, oldTrail );
      var isBranchChange = branchIndex !== trail.length || branchIndex !== oldTrail.length;
      isBranchChange && sceneryLog && sceneryLog.Input && sceneryLog.Input(
        'changed from ' + oldTrail.toString() + ' to ' + trail.toString() );

      // event order matches http://www.w3.org/TR/DOM-Level-3-Events/#events-mouseevent-event-order
      if ( sendMove ) {
        this.dispatchEvent( trail, 'move', pointer, event, true );
      }

      // we want to approximately mimic http://www.w3.org/TR/DOM-Level-3-Events/#events-mouseevent-event-order
      // TODO: if a node gets moved down 1 depth, it may see both an exit and enter?
      if ( isBranchChange ) {
        this.exitEvents( pointer, event, oldTrail, branchIndex, lastNodeChanged );
        this.enterEvents( pointer, event, trail, branchIndex, lastNodeChanged );
      }

      pointer.trail = trail;

      sceneryLog && sceneryLog.Input && sceneryLog.pop();
      return trail;
    },

    /**
     * Triggers 'enter' events along a trail change, and an 'over' event on the leaf.
     * @private
     *
     * For example, if we change from a trail [ a, b, c, d, e ] => [ a, b, x, y ], it will fire:
     *
     * - enter y
     * - enter x
     * - over y (bubbles)
     *
     * @param {Pointer} pointer
     * @param {DOMEvent|null} event
     * @param {Trail} trail - The "new" trail
     * @param {number} branchIndex - The first index where the old and new trails have a different node. We will notify
     *                               for this node and all "descendant" nodes in the relevant trail.
     * @param {boolean} lastNodeChanged - If the last node didn't change, we won't sent an over event.
     */
    enterEvents: function( pointer, event, trail, branchIndex, lastNodeChanged ) {
      if ( trail.length > branchIndex ) {
        for ( var newIndex = trail.length - 1; newIndex >= branchIndex; newIndex-- ) {
          // TODO: for performance, we should mutate a trail instead of returning a slice.
          this.dispatchEvent( trail.slice( 0, newIndex + 1 ), 'enter', pointer, event, false );
        }
      }

      if ( lastNodeChanged ) {
        this.dispatchEvent( trail, 'over', pointer, event, true );
      }
    },

    /**
     * Triggers 'exit' events along a trail change, and an 'out' event on the leaf.
     * @private
     *
     * For example, if we change from a trail [ a, b, c, d, e ] => [ a, b, x, y ], it will fire:
     *
     * - out e (bubbles)
     * - exit c
     * - exit d
     * - exit e
     *
     * @param {Pointer} pointer
     * @param {DOMEvent|null} event
     * @param {Trail} trail - The "old" trail
     * @param {number} branchIndex - The first index where the old and new trails have a different node. We will notify
     *                               for this node and all "descendant" nodes in the relevant trail.
     * @param {boolean} lastNodeChanged - If the last node didn't change, we won't sent an out event.
     */
    exitEvents: function( pointer, event, trail, branchIndex, lastNodeChanged ) {
      if ( lastNodeChanged ) {
        this.dispatchEvent( trail, 'out', pointer, event, true );
      }

      if ( trail.length > branchIndex ) {
        for ( var oldIndex = branchIndex; oldIndex < trail.length; oldIndex++ ) {
          // TODO: for performance, we should mutate a trail instead of returning a slice.
          this.dispatchEvent( trail.slice( 0, oldIndex + 1 ), 'exit', pointer, event, false );
        }
      }
    },

    /**
     * Dispatch to all nodes in the Trail, optionally bubbling down from the leaf to the root.
     * @private
     *
     * @param {Trail} trail
     * @param {string} type
     * @param {Pointer} pointer
     * @param {DOMEvent|null} event
     * @param {boolean} bubbles - If bubbles is false, the event is only dispatched to the leaf node of the trail.
     */
    dispatchEvent: function( trail, type, pointer, event, bubbles ) {
      sceneryLog && sceneryLog.EventDispatch && sceneryLog.EventDispatch(
        type + ' trail:' + trail.toString() + ' pointer:' + pointer.toString() + ' at ' + pointer.point.toString() );
      sceneryLog && sceneryLog.EventDispatch && sceneryLog.push();

      assert && assert( trail, 'Falsy trail for dispatchEvent' );

      // NOTE: event is not immutable, as its currentTarget changes
      var inputEvent = new Event( trail, type, pointer, event );

      // first run through the pointer's listeners to see if one of them will handle the event
      this.dispatchToListeners( pointer, pointer.getListeners(), type, inputEvent );

      // if not yet handled, run through the trail in order to see if one of them will handle the event
      // at the base of the trail should be the scene node, so the scene will be notified last
      this.dispatchToTargets( trail, type, pointer, inputEvent, bubbles );

      // Notify input listeners on the Display
      this.dispatchToListeners( pointer, this.display.getInputListeners(), type, inputEvent );

      sceneryLog && sceneryLog.EventDispatch && sceneryLog.pop();
    },

    /**
     * Notifies an array of listeners with a specific event.
     * @private
     *
     * @param {Pointer} pointer
     * @param {Array.<Object>} listeners - Should be a defensive array copy already.
     * @param {string} type
     * @param {Event} inputEvent
     */
    dispatchToListeners: function( pointer, listeners, type, inputEvent ) {
      if ( inputEvent.handled ) {
        return;
      }

      var specificType = pointer.type + type; // e.g. mouseup, touchup

      for ( var i = 0; i < listeners.length; i++ ) {
        var listener = listeners[ i ];

        if ( !inputEvent.aborted && listener[ specificType ] ) {
          sceneryLog && sceneryLog.EventDispatch && sceneryLog.EventDispatch( specificType );
          sceneryLog && sceneryLog.EventDispatch && sceneryLog.push();

          listener[ specificType ]( inputEvent );

          sceneryLog && sceneryLog.EventDispatch && sceneryLog.pop();
        }

        if ( !inputEvent.aborted && listener[ type ] ) {
          sceneryLog && sceneryLog.EventDispatch && sceneryLog.EventDispatch( type );
          sceneryLog && sceneryLog.EventDispatch && sceneryLog.push();

          listener[ type ]( inputEvent );

          sceneryLog && sceneryLog.EventDispatch && sceneryLog.pop();
        }
      }
    },

    /**
     * Dispatch to all nodes in the Trail, optionally bubbling down from the leaf to the root.
     * @private
     *
     * @param {Trail} trail
     * @param {string} type
     * @param {Pointer} pointer
     * @param {Event} inputEvent
     * @param {boolean} bubbles - If bubbles is false, the event is only dispatched to the leaf node of the trail.
     */
    dispatchToTargets: function( trail, type, pointer, inputEvent, bubbles ) {
      if ( inputEvent.aborted || inputEvent.handled ) {
        return;
      }

      for ( var i = trail.getLastInputEnabledIndex(); i >= 0; bubbles ? i-- : i = -1 ) {
        var target = trail.nodes[ i ];
        if ( target.isDisposed ) {
          continue;
        }

        inputEvent.currentTarget = target;

        this.dispatchToListeners( pointer, target.getInputListeners(), type, inputEvent );

        // if the input event was aborted or handled, don't follow the trail down another level
        if ( inputEvent.aborted || inputEvent.handled ) {
          return;
        }
      }
    }
  }, {
    /**
     * Saves the main information we care about from a DOM `Event` into a JSON-like structure.
     * @public
     *
     * @param {DOMEvent}
     * @returns {Object} - TODO: doc?
     */
    serializeDomEvent: function serializeDomEvent( domEvent ) {
      var entries = {};
      for ( var prop in domEvent ) {
        if ( domEventPropertiesToSerialize[ prop ] ) {

          // stringifying dom event object properties can cause circular references, so we avoid that completely
          if ( prop === 'touches' || prop === 'targetTouches' || prop === 'changedTouches' ) {
            var arr = [];
            for ( var i = 0; i < domEvent[ prop ].length; i++ ) {

              // according to spec (http://www.w3.org/TR/touch-events/), this is not an Array, but a TouchList
              var touch = domEvent[ prop ].item( i );
              arr.push( serializeDomEvent( touch ) );
            }
            entries[ prop ] = arr;
          }
          else {
            entries[ prop ] = ( ( typeof domEvent[ prop ] === 'object' ) && ( domEvent[ prop ] !== null ) ? {} : JSON.parse( JSON.stringify( domEvent[ prop ] ) ) ); // TODO: is parse/stringify necessary?
          }
        }
      }
      return entries;
    },

    /**
     * From a serialized dom event, return a recreated window.Event
     * @param {Object} eventObject
     * @returns {window.Event}
     */
    deserializeDomEvent: function deserializeDomEvent( eventObject ) {
      var domEvent = new window.Event( 'inputEvent' );
      for ( var key in eventObject ) {
        if ( eventObject.hasOwnProperty( key ) ) {
          domEvent[ key ] = eventObject[ key ];
        }
      }
      return domEvent;
    },

    /**
     * Convenience function for logging out a point/event combination.
     * @private
     *
     * @param {Vector2|null} point - Not logged if null
     * @param {DOMEvent} domEvent
     */
    debugText: function( point, domEvent ) {
      var result = domEvent.timeStamp + ' ' + domEvent.type;
      if ( point !== null ) {
        result = point.x + ',' + point.y + ' ' + result;
      }
      return result;
    },

    /**
     * Maps the current MS pointer types onto the pointer spec.
     * @public (scenery-internal)
     *
     * @param {DOMEvent} event
     * @returns {string}
     */
    msPointerType: function( event ) {
      if ( event.pointerType === window.MSPointerEvent.MSPOINTER_TYPE_TOUCH ) {
        return 'touch';
      }
      else if ( event.pointerType === window.MSPointerEvent.MSPOINTER_TYPE_PEN ) {
        return 'pen';
      }
      else if ( event.pointerType === window.MSPointerEvent.MSPOINTER_TYPE_MOUSE ) {
        return 'mouse';
      }
      else {
        return event.pointerType; // hope for the best
      }
    }
  } );

  // @public {Array.<string>} - Basic event listener types that are not pointer-type specific
  Input.BASIC_EVENT_TYPES = [ 'down', 'up', 'cancel', 'move', 'wheel', 'enter', 'exit', 'over', 'out' ];

  // @public {Array.<string>} - Valid prefixes for the basic event types above
  Input.EVENT_PREFIXES = [ '', 'mouse', 'touch', 'pen' ];

  // @public {Array.<string>} - Includes basic and specific types, e.g. both 'up' and 'mouseup'
  Input.ALL_EVENT_TYPES = Input.EVENT_PREFIXES.map( function( prefix ) {
    return Input.BASIC_EVENT_TYPES.map( function( eventName ) {
      return prefix + eventName;
    } );
  } );

  return Input;
} );
