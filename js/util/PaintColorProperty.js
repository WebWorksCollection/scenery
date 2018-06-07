// Copyright 2018, University of Colorado Boulder

/**
 * TODO: doc
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';

  var inherit = require( 'PHET_CORE/inherit' );
  var Paint = require( 'SCENERY/util/Paint' );
  var PaintObserver = require( 'SCENERY/display/PaintObserver' );
  var Property = require( 'AXON/Property' );
  var scenery = require( 'SCENERY/scenery' );

  /**
   * @constructor
   * @extends {Property.<Color>}
   *
   * @param {null|string|Color|Property.<string|Color>|LinearGradient|RadialGradient|Pattern} paint
   * @param {Object} [options]
   */
  function PaintColorProperty( paint, options ) {
    var initialColor = Paint.toColor( paint );

    options = _.extend( {
      // {number} - 0 applies no change. Positive numbers brighten the color up to 1 (white). Negative numbers darken
      // the color up to -1 (black).
      factor: 0
    }, options );

    Property.call( this, initialColor, options );

    // @private {null|string|Color|Property.<string|Color>|LinearGradient|RadialGradient|Pattern}
    this._paint = null;

    // @private {number}
    this._factor = options.factor;

    // @private {function} - Our "paint changed" listener, will update the value of this Property.
    this._changeListener = this.invalidatePaint.bind( this );

    // @private {PaintObserver}
    this._paintObserver = new PaintObserver( this._changeListener );

    this.setPaint( paint );
  }

  scenery.register( 'PaintColorProperty', PaintColorProperty );

  inherit( Property, PaintColorProperty, {
    /**
     * Sets the current paint of the PaintColorProperty.
     * @public
     *
     * @param {null|string|Color|Property.<string|Color>|LinearGradient|RadialGradient|Pattern} paint
     */
    setPaint: function( paint ) {
      assert && assert( Paint.isPaint( paint ) );

      this._paint = paint;
      this._paintObserver.setPrimary( paint );
    },
    set paint( value ) { this.setPaint( value ); },

    /**
     * Returns the current paint.
     * @public
     *
     * @returns {null|string|Color|Property.<string|Color>|LinearGradient|RadialGradient|Pattern}
     */
    getPaint: function() {
      return this._paint;
    },
    get paint() { return this.getPaint(); },

    /**
     * Sets the current value used for adjusting the brightness or darkness (luminance) of the color.
     * @public
     *
     * 0 applies no change. Positive numbers brighten the color up to 1 (white). Negative numbers darken the color up
     * to -1 (black).
     *
     * @param {number} factor
     */
    setFactor: function( factor ) {
      assert && assert( typeof factor === 'number' && factor >= -1 && factor <= 1 );

      if ( this.factor !== factor ) {
        this._factor = factor;

        this.invalidatePaint();
      }
    },
    set factor( value ) { this.setFactor( value ); },

    /**
     * Returns the current value used for adjusting the brightness or darkness (luminance) of the color.
     * @public
     *
     * @returns {number}
     */
    getFactor: function() {
      return this._factor;
    },
    get factor() { return this.getFactor(); },

    /**
     * Updates the value of this property.
     * @private
     */
    invalidatePaint: function() {
      this.value = Paint.toColor( this._paint ).colorUtilsBrightness( this._factor );
    },

    /**
     * Releases references.
     * @public
     * @override
     */
    dispose: function() {
      this.paint = null;

      Property.prototype.dispose.call( this );
    }
  } );

  return PaintColorProperty;
} );
