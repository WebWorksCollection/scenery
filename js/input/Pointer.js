// Copyright 2013-2015, University of Colorado Boulder

/*
 * A pointer is an abstraction that includes a mouse and touch points (and possibly keys). The mouse is a single
 * pointer, and each finger (for touch) is a pointer.
 *
 * Listeners that can be added to the pointer, and events will be fired on these listeners before any listeners are
 * fired on the Node structure. This is typically very useful for tracking dragging behavior (where the pointer may
 * cross areas where the dragged node is not directly below the pointer any more).
 *
 * A valid listener should be an object. If a listener has a property with a Scenery event name (e.g. 'down' or
 * 'touchmove'), then that property will be assumed to be a method and will be called with the Scenery event (like
 * normal input listeners, see Node.addInputListener).
 *
 * Pointers can have one active "attached" listener, which is the main handler for responding to the events. This helps
 * when the main behavior needs to be interrupted, or to determine if the pointer is already in use. Additionally, this
 * can be used to prevent pointers from dragging or interacting with multiple components at the same time.
 *
 * A listener may have an interrupt() method that will attemp to interrupt its behavior. If it is added as an attached
 * listener, then it must have an interrupt() method.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';

  var inherit = require( 'PHET_CORE/inherit' );
  var scenery = require( 'SCENERY/scenery' );

  /**
   * @constructor
   * @protected (scenery-internal)
   */
  function Pointer() {
    // TODO: consider moving 'point' to pointer

    // @private {Array.<Object>} - All attached listeners (will be activated in order). See top-level documentation for
    //                             information about listener structure.
    this._listeners = [];

    // @private {boolean} - Whether there is a main listener "attached" to this pointer. This signals that the listener
    //                      is "doing" something with the pointer, and that it should be interrupted if other actions
    //                      need to take over the pointer behavior.
    this._attached = 0;

    // @private {Object|null} - Our main "attached" listener, if there is one (otherwise null)
    this._attachedListener = null;

    // @private {string|null} - See setCursor() for more information.
    this._cursor = null;

    phetAllocation && phetAllocation( 'Pointer' );
  }

  scenery.register( 'Pointer', Pointer );

  inherit( Object, Pointer, {
    /**
     * Sets a cursor that takes precedence over cursor values specified on the pointer's trail.
     * @public
     *
     * Typically this can be set when a drag starts (and returned to null when the drag ends), so that the cursor won't
     * change while dragging (regardless of what is actually under the pointer). This generally will only apply to the
     * Mouse subtype of Pointer.
     *
     * NOTE: Consider setting this only for attached listeners in the future (or have a cursor field on pointers).
     *
     * @param {string|null} cursor
     * @returns {Pointer} - For chaining
     */
    setCursor: function( cursor ) {
      this._cursor = cursor;

      return this; // TODO: is chaining actually used? Not that helpful of a pattern with pointers.
    },
    set cursor( value ) { return this.setCursor( value ); },

    /**
     * Returns the current cursor override (or null if there is one). See setCursor().
     * @public
     *
     * @returns {string|null}
     */
    getCursor: function() {
      return this._cursor;
    },
    get cursor() { return this.getCursor(); },

    /**
     * Returns a defensive copy of all listeners attached to this pointer.
     * @public (scenery-internal)
     *
     * @returns {Array.<Object>}
     */
    getListeners: function() {
      return this._listeners.slice();
    },
    get listeners() { return this.getListeners(); },

    /**
     * Adds an input listener to this pointer. If the attach flag is true, then it will be set as the "attached"
     * listener.
     * @public
     *
     * @param {Object} listener - See top-level documentation for description of the listener API
     * @param {boolean} [attach]
     */
    addInputListener: function( listener, attach ) {
      assert && assert( listener, 'A listener must be provided' );
      assert && assert( attach === undefined || typeof attach === 'boolean',
        'If provided, the attach parameter should be a boolean value' );

      assert && assert( !_.includes( this._listeners, listener ),
        'Attempted to add an input listener that was already added' );

      this._listeners.push( listener );

      if ( attach ) {
        this.attach( listener );
      }
    },

    /**
     * Removes an input listener from this pointer.
     * @public
     *
     * @param {Object} listener - See top-level documentation for description of the listener API
     */
    removeInputListener: function( listener ) {
      assert && assert( listener, 'A listener must be provided' );

      var index = _.indexOf( this._listeners, listener );
      assert && assert( index !== -1, 'Could not find the input listener to remove' );

      // If this listener is our attached listener, also detach it
      if ( this._attached && listener === this._attachedListener ) {
        this.detach( listener );
      }

      this._listeners.splice( index, 1 );
    },

    /**
     * Returns whether this pointer has an attached (primary) listener.
     * @public
     *
     * @returns {boolean}
     */
    isAttached: function() {
      return this._attached;
    },

    /**
     * If there is an attached listener, interrupt it.
     * @public
     *
     * After this executes, this pointer should not be attached.
     */
    interruptAttached: function() {
      if ( this._attached ) {
        this._attachedListener.interrupt(); // Any listener that uses the 'attach' API should have interrupt()
      }
    },

    /**
     * Interrupts all listeners on this pointer.
     * @public
     */
    interruptAll: function() {
      var listeners = this._listeners.slice();
      for ( var i = 0; i < listeners.length; i++ ) {
        var listener = listeners[ i ];
        listener.interrupt && listener.interrupt();
      }
    },

    /**
     * Marks the pointer as attached to this listener.
     * @private
     *
     * @param {Object} listener
     */
    attach: function( listener ) {
      assert && assert( !this._attached, 'Attempted to attach to an already attached pointer' );

      this._attached = true;
      this._attachedListener = listener;
    },

    /**
     * Marks the pointer as detached from a previously attached listener.
     * @private
     *
     * @param {Object} listener
     */
    detach: function( listener ) {
      assert && assert( this._attached, 'Cannot detach a listener if one is not attached' );
      assert && assert( this._attachedListener === listener, 'Cannot detach a different listener' );

      this._attached = false;
      this._attachedListener = null;
    },

    /**
     * Determines whether the point of the pointer has changed (used in mouse/touch/pen).
     * @protected
     *
     * @param {Vector2} point
     * @returns {boolean}
     */
    hasPointChanged: function( point ) {
      return this.point !== point && ( !point || !this.point || !this.point.equals( point ) );
    }
  } );

  return Pointer;
} );
