// Copyright 2017-2019, University of Colorado Boulder

/**
 * A scenery-internal type for tracking what currently has focus in Display.  This is the value for
 * the static Display.focusProperty.  If a focused node is shared between two Displays, only one
 * instance will have focus.
 *
 * @author Jesse Greenberg
 */
define( require => {
  'use strict';

  // modules
  const inherit = require( 'PHET_CORE/inherit' );
  const scenery = require( 'SCENERY/scenery' );

  /**
   * Constructor.
   * @param {Display} display - Display containing the focused node
   * @param {Trail} trail - Trail to the focused node
   */
  function Focus( display, trail ) {

    // @public (read-only)
    this.display = display;
    this.trail = trail;
  }

  scenery.register( 'Focus', Focus );

  return inherit( Object, Focus );
} );