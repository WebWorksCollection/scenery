// Copyright 2018, University of Colorado Boulder

/**
 * Catches keyup, keydown, and click events, and determines if we need to send fake events to
 * imitate button activation. Due to screen reader implementations it is likely the browser will never
 * receive keydown/keyup events on activation of certain elements, so we need to blah blah blah...
 *
 * TODO: Should this just be in A11yPointer? Probably not, we want this check before events
 * reach the A11yEventCatcherPointer.
 * 
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

define( require => {
  'use strict';

  const KeyboardUtil = require( 'SCENERY/accessibility/KeyboardUtil' );
  const scenery = require( 'SCENERY/scenery' );
  const timer = require( 'AXON/timer' );

  class A11yEventCatcher {

    /**
     * @param {Input} input
     */
    constructor( input ) {

      // {HTMLElement} the target a native DOM keydown event
      this.keyDownTarget = null;

      // {HTMLElement} the target of a native DOM keyup event
      this.keyUpTarget = null;

      // whether or not we are in the process of sending fake events through scenery in response to a click event
      // that did not receive 'keydown' or 'keyup' events.
      this.fakeEvent = false;
    }

    /**
     * Catch a click event. If we received this event after a keydown event or keyup event, 
     * Input.js has caught the input and dispatched events correctly. Otherwise, we received
     * a `click` event from an AT and need to dispatch a set of keydown and keyup events instead.
     *
     * @param {DOMEvent} event
     */
    handleClick( event ) {
      var clickTarget = event.target;
      if ( clickTarget === this.keyDownTarget || clickTarget === this.keyUpTarget ) {
        return;
      }
      else {
        this.fakeEvent = true;
        this.triggerDOMEvent( event.target, 'keydown', KeyboardUtil.KEY_ENTER );

        timer.setTimeout( () => {
          this.triggerDOMEvent( event.target, 'keyup', KeyboardUtil.KEY_ENTER );
          this.fakeEvent = false;
        }, 100 );
      }
    }

    /**
     * Signify that we have received a keydown event, if we receive a click event with the same target,
     * we won't need to trigger fake DOM events.
     *
     * @param {DOMEvent} event
     */
    handleKeyDown( event ) {
      if ( KeyboardUtil.isActivationKey( event.keyCode ) && !this.fakeEvent ) {
        this.keyDownTarget = event.target;
      }
    }

    /**
     * Signify that we whave received a keyup event, if we receive a click event with the same target shortly
     * after, we don't send fake DOM events.
     *
     * @param {DOMEvent} event
     */
    handleKeyUp( event ) {
      if ( KeyboardUtil.isActivationKey( event.keyCode ) && !this.fakeEvent ) {
        this.keyDownTarget = null;
        this.keyUpTarget = event.target;
      }
    }

    /**
     * Initiate a fake DOM event.
     *
     * NOTE: Taken directly from KeyboardFuzzer, refactor.
     * NOTE: How is platform support for this? Do we need to do this in a 'scenery' way instead with
     * Input.dispatchEvent?
     *
     * @param {HTMLElement} target
     * @param {string} eventType [description]
     * @param {number} keyCode
     *
     * @returns
     */
    triggerDOMEvent( target, eventType, keyCode ) {

      // TODO: assertions
      var eventObj = document.createEventObject ?
                     document.createEventObject() : document.createEvent( 'Events' );

      if ( eventObj.initEvent ) {
        eventObj.initEvent( eventType, true, true );
      }

      eventObj.keyCode = keyCode;
      eventObj.which = keyCode;

      target.dispatchEvent ? target.dispatchEvent( eventObj ) : target.fireEvent( 'on' + event, eventObj );
    }
  }

  return scenery.register( 'A11yEventCatcher', A11yEventCatcher );
} );