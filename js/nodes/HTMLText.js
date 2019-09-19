// Copyright 2013-2019, University of Colorado Boulder

/**
 * HTML Text, with the same interface as Text
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( require => {
  'use strict';

  const inherit = require( 'PHET_CORE/inherit' );
  const scenery = require( 'SCENERY/scenery' );
  const Text = require( 'SCENERY/nodes/Text' ); // inherits from Text

  /**
   * @public
   * @constructor
   * @extends Text
   *
   * NOTE: Currently does not properly handle multi-line (<br>) text height, since it expects DOM text that will be an
   * inline element
   *
   * @param {string} text - The HTML-styled text to display
   * @param {Object} [options] - Passed to Text/Node
   */
  function HTMLText( text, options ) {
    // internal flag for Text
    this._isHTML = true;

    Text.call( this, text, options );
  }

  scenery.register( 'HTMLText', HTMLText );

  inherit( Text, HTMLText );

  return HTMLText;
} );
