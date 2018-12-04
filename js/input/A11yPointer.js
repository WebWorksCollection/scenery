// Copyright 2018, University of Colorado Boulder

/**
 * Tracks the state of accessible focus.
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

define( require => {
  'use strict';

  // modules
  // const Display = require( 'SCENERY/display/Display' ); // so requireJS doesn't balk about circular dependency
  const AccessibilityUtil = require( 'SCENERY/accessibility/AccessibilityUtil' );
  const AccessibleInstance = require( 'SCENERY/accessibility/AccessibleInstance' );
  const Focus = require( 'SCENERY/accessibility/Focus' );
  const FullScreen = require( 'SCENERY/util/FullScreen' );
  const Pointer = require( 'SCENERY/input/Pointer' ); // inherits from Pointer
  const scenery = require( 'SCENERY/scenery' );
  const Trail = require( 'SCENERY/util/Trail' );
  var KeyboardUtil = require( 'SCENERY/accessibility/KeyboardUtil' );

  class A11yPointer extends Pointer {
    constructor() {
      super( null, false );

      this.type = 'a11y';

      sceneryLog && sceneryLog.Pointer && sceneryLog.Pointer( 'Created ' + this.toString() );
    }

    /**
     * Set up listeners, attaching blur and focus listeners to the pointer once this A11yPointer has been attached
     * to a display.  
     * @private (scenery-internal)
     * 
     * @param  {Display} display
     */
    initializeListeners( display ) {
      this.addInputListener( {
        focus: () => {
          assert && assert( this.trail, 'trail should have been calculated for the focused node' );

          display.setFocusOverlayVisible( true );

          // NOTE: The "root" peer can't be focused (so it doesn't matter if it doesn't have a node).
          if ( this.trail.lastNode().focusable ) {
            scenery.Display.focus = new Focus( display, AccessibleInstance.guessVisualTrail( this.trail, display.rootNode ) );
            display.pointerFocus = null;
          }
        },
        blur: ( event ) => {
          scenery.Display.focus = null;
        },
        keydown: ( event ) => {
          scenery.Display.userGestureEmitter.emit();

          var domEvent = event.domEvent;

          // If navigating in full screen mode, prevent a bug where focus gets lost if fullscreen mode was initiated
          // from an iframe by keeping focus in the display. getNext/getPreviousFocusable will return active element
          // if there are no more elements in that direction. See https://github.com/phetsims/scenery/issues/883
          if ( FullScreen.isFullScreen() && domEvent.keyCode === KeyboardUtil.KEY_TAB ) {
            var rootElement = display.accessibleDOMElement;
            var nextElement = domEvent.shiftKey ? AccessibilityUtil.getPreviousFocusable( rootElement ) :
                                               AccessibilityUtil.getNextFocusable( rootElement );
            if ( nextElement === domEvent.target ) {
              domEvent.preventDefault();
            }
          }

          // if an accessible node was being interacted with a mouse, or had focus when sim is made inactive, this node
          // should receive focus upon resuming keyboard navigation
          if ( display.pointerFocus || display.activeNode ) {
            var active = display.pointerFocus || display.activeNode;
            var focusable = active.focusable;

            // if there is a single accessible instance, we can restore focus
            if ( active.getAccessibleInstances().length === 1 ) {

              // if all ancestors of this node are visible, so is the active node
              var nodeAndAncestorsVisible = true;
              var activeTrail = active.accessibleInstances[ 0 ].trail;
              for ( var i = activeTrail.nodes.length - 1; i >= 0; i-- ) {
                if ( !activeTrail.nodes[ i ].visible ) {
                  nodeAndAncestorsVisible = false;
                  break;
                }
              }

              if ( focusable && nodeAndAncestorsVisible ) {
                if ( domEvent.keyCode === KeyboardUtil.KEY_TAB ) {
                  active.focus();

                  // now get the previous focusable and focus it so the tab key will focus the active node
                  var previousFocus = AccessibilityUtil.getPreviousFocusable( display.accessibleDOMElement );
                  if ( previousFocus.getAttribute( 'data-trail-id' ) === event.trail.getUniqueId() ) {
                    active.blur();
                  }
                  else {
                    previousFocus.focus();
                  }

                  display.pointerFocus = null;
                  display.activeNode = null;
                }
              }
            }
          }
        }
      } );
    }

    /**
     * @param {Node} rootNode
     * @param {string} trailId
     * @public
     * @returns {Trail} - updated trail
     */
    updateTrail( rootNode, trailId ) {
      if ( this.trail && this.trail.getUniqueId() === trailId ) {
        return this.trail;
      }
      var trail = Trail.fromUniqueId( rootNode, trailId );
      this.trail = trail;
      return trail;
    }
  }

  return scenery.register( 'A11yPointer', A11yPointer );
} );