// Copyright 2018, University of Colorado Boulder

/**
 * A KeyStateTracker with additional support for signifying when "zoom" commands are expected from the keyboard.
 *
 * @author Jesse Greenberg
 */
define( require => {
  'use strict';

  // modules
  const scenery = require( 'SCENERY/scenery' );
  const KeyStateTracker = require( 'SCENERY/accessibility/KeyStateTracker' );

  class ZoomKeyStateTracker extends KeyStateTracker {
    constructor() {
      super();
    }

    zoomInCommandDown() {

    }

    zoomOutCommandDown() {

    }
  }

  return scenery.register( 'ZoomKeyStateTracker', ZoomKeyStateTracker );
} );
