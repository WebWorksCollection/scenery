// Copyright 2017, University of Colorado Boulder

/**
 * A Node for a focus highlight that takes a shape and creates a Path with the default styling of a focus highlight
 * for a11y. The FocusHighlight has two paths.  The FocusHighlight path is an 'outer' highlight that is a little
 * lighter in color and transparency.  It as a child 'inner' path that is darker and more opaque, which gives the
 * focus highlight the illusion that it fades out.
 *
 * @author - Michael Kauzmann (PhET Interactive Simulations)
 * @author Jesse Greenberg (PhET Interactive Simulations)
 */

define( function( require ) {
  'use strict';

  // modules
  var Color = require( 'SCENERY/util/Color' );
  var inherit = require( 'PHET_CORE/inherit' );
  var Path = require( 'SCENERY/nodes/Path' );
  var scenery = require( 'SCENERY/scenery' );
  var LineStyles = require( 'KITE/util/LineStyles' );
  var Vector2 = require( 'DOT/Vector2' );

  // constants
  var FOCUS_COLOR = new Color( 'rgba(212,19,106,0.5)' );
  var INNER_FOCUS_COLOR = new Color( 'rgba(250,40,135,0.9)' );

  // Determined by inspection, base widths of focus highlight, transform of shape/bounds will change highlight line width
  var INNER_LINE_WIDTH_BASE = 2.5;
  var OUTER_LINE_WIDTH_BASE = 4;

  /**
   * @constructor
   *
   * @param {Shape} shape - the shape for the focus highlight
   * @param {Object} options
   */
  function FocusHighlightPath( shape, options ) {

    Path.call( this, shape );

    options = _.extend( {

      // stroke options,  one for each highlight
      outerStroke: FOCUS_COLOR,
      innerStroke: INNER_FOCUS_COLOR,

      // line width options, one for each highlight, will be calculated based on transform of this path unless provided
      outerLineWidth: null,
      innerLineWidth: null,

      // remaining paintable options applied to both highlights
      lineDash: [],
      lineCap: LineStyles.DEFAULT_OPTIONS.lineCap,
      lineJoin: LineStyles.DEFAULT_OPTIONS.lineJoin,
      miterLimit: LineStyles.DEFAULT_OPTIONS.miterLimit,
      lineDashOffset: LineStyles.DEFAULT_OPTIONS.lineDashOffset
    }, options );

    this.options = options; // @private

    // options for this Path, the outer focus highlight
    var outerHighlightOptions = _.extend( {
      stroke: options.outerStroke,
    }, options );
    this.mutate( outerHighlightOptions );

    // create the 'inner' focus highlight, the slightly darker and more opaque path that is on the inside
    // of the outer path to give the focus highlight a 'fade-out' appearance
    this.innerHighlightPath = new Path( shape, {
      stroke: options.innerStroke,
      lineDash: options.lineDash,
      lineCap: options.lineCap,
      lineJoin: options.lineJoin,
      miterLimit: options.miterLimit,
      lineDashOffset: options.lineDashOffset
    } );
    this.addChild( this.innerHighlightPath );

    this.updateLineWidth();
  }

  scenery.register( 'FocusHighlightPath', FocusHighlightPath );

  return inherit( Path, FocusHighlightPath, {

    /**
     * Update the shape of the child path (inner highlight) and this path (outer highlight).
     *
     * @override
     * @param {Shape} shape
     */
    setShape: function( shape ) {
      Path.prototype.setShape.call( this, shape );
      this.innerHighlightPath && this.innerHighlightPath.setShape( shape );
    },

    /**
     * @public
     * Update the line width of both Paths based on transform. Can be overwritten (ridden?) by the options
     * passed in the constructor.
     */
    updateLineWidth: function() {
      this.lineWidth = this.getOuterLineWidth();
      this.innerHighlightPath.lineWidth = this.getInnerLineWidth();
    },

    /**
     * Given a node, return the lineWidth of this focus highlight.
     * @public
     * @returns {number}
     */
    getOuterLineWidth: function() {
      if ( this.options.outerLineWidth ) {
        return this.options.outerLineWidth;
      }
      return FocusHighlightPath.getOuterLineWidthFromNode( this );
    },

    /**
     * Given a node, return the lineWidth of this focus highlight.
     * @returns {number}
     */
    getInnerLineWidth: function() {
      if ( this.options.innerLineWidth ) {
        return this.options.innerLineWidth;
      }
      return FocusHighlightPath.getInnerLineWidthFromNode( this );
    }
  }, {

    /**
     * Get the outer line width of a focus highlight based on the node's scale and rotation transform information.
     * @public
     * @static
     * 
     * @param {Node} node
     * @return {number}
     */
    getInnerLineWidthFromNode: function( node ) {
      return INNER_LINE_WIDTH_BASE / FocusHighlightPath.getWidthMagnitudeFromTransform( node );
    },

    /**
     * Get the outer line width of a node, based on its scale and rotation transformation.
     * @public
     * @static
     *
     * @param {Node} node
     * @return {number}
     */
    getOuterLineWidthFromNode: function( node ) {
      return OUTER_LINE_WIDTH_BASE / FocusHighlightPath.getWidthMagnitudeFromTransform( node );
    },

    /**
     * Get a scalar width based on the node's transform excluding position.
     * @private
     * @static
     * 
     * @param {Node} node
     * @returns {number}
     */
    getWidthMagnitudeFromTransform: function( node ) {
      return node.transform.transformDelta2( Vector2.X_UNIT ).magnitude();
    }
  } );
} );