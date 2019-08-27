// Copyright 2017, University of Colorado Boulder

/**
 * A MultiListener which constrains the repositioning to defined bounds. One can optionally define panBounds, which will
 * enforce that the target node fully fills content at all times, and targetBounds, which are the bounds that
 * should fill the panBounds in case the target node bounds don't accurately describe the target node.
 *
 * TODO: unit tests
 *
 * TODO: add example usage
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';

  var Bounds2 = require( 'DOT/Bounds2' );
  var inherit = require( 'PHET_CORE/inherit' );
  var MultiListener = require( 'SCENERY/listeners/MultiListener' );
  var scenery = require( 'SCENERY/scenery' );

  /**
   * @constructor
   * @extends MultiListener
   *
   * TODO: If scale !~=1, allow interrupting other pointers when multitouch begins (say pan area is filled with button)
   *
   * @param {Node} targetNode - The Node that should be transformed by this PanZoomListener.
   * @param {Bounds2} panBounds - Bounds that should be fully filled with content at all times.
   * @param {Object} [options] - See the constructor body (below) for documented options.
   */
  function PanZoomListener( targetNode, options ) {
    options = _.extend( {
      allowScale: true,
      allowRotation: false,
      pressCursor: null,
      panBounds: Bounds2.NOTHING, // these bounds should be fully filled with content at all times
      targetBounds: null // these bounds are adjusted by target transformation
    }, options );

    // TODO: type checks for options

    MultiListener.call( this, targetNode, options );

    // @private {Bounds2} - bounds for the panning area, this area will be fully filled with target content at all times
    this._panBounds = options.panBounds;

    // @private {null|Bounds2} - set of bounds that should fill panBounds -
    this._targetBounds = options.targetBounds || targetNode.bounds;

    // @private {Bounds2} - the panBounds transformed so that they are in the coordinate frame of the targetNode.
    this.transformedPanBounds = this.panBounds.transformed( this._targetNode.matrix.inverted() );
  }

  scenery.register( 'PanZoomListener', PanZoomListener );

  inherit( MultiListener, PanZoomListener, {
    reposition: function() {
      MultiListener.prototype.reposition.call( this );
      this.correctReposition();
    },

    translateToTarget: function( localPoint, targetPoint, scale ) {
      MultiListener.prototype.translateToTarget.call( this, localPoint, targetPoint, scale );
      this.correctReposition();
    },

    translateScaleToTarget: function( localPoint, parentPoint, scaleDelta ) {
      MultiListener.prototype.translateScaleToTarget.call( this, localPoint, parentPoint, scaleDelta );
      this.correctReposition();
    },

    /**
     * Reset the transform on the target node and make sure that the node is within bounds defined by correctPosition.
     * @override
     */
    resetTransform: function() {
      MultiListener.prototype.resetTransform.call( this );
      this.correctReposition();
    },

    /**
     * If the targetNode is larger than than the panBounds specified, keep the panBounds completely filled
     * with targetNode content.
     *
     * TODO: Otherwise, allow targetNode to be dragged within panBounds OR limit scale of targetNode.
     */
    correctReposition: function() {
      const transformedBounds = this._targetBounds.transformed( this._targetNode.getMatrix() );

      // Don't let panning go through if the node is full contained by the pan bounds
      if ( transformedBounds.left > this._panBounds.left ) {
        this._targetNode.left = this._panBounds.left - ( transformedBounds.left - this._targetNode.left );
      }
      if ( transformedBounds.top > this._panBounds.top ) {
        this._targetNode.top = this._panBounds.top - ( transformedBounds.top - this._targetNode.top );
      }
      if ( transformedBounds.right < this._panBounds.right ) {
        this._targetNode.right = this._panBounds.right + ( this._targetNode.right - transformedBounds.right );
      }
      if ( transformedBounds.bottom < this._panBounds.bottom ) {
        this._targetNode.bottom = this._panBounds.bottom + ( this._targetNode.bottom - transformedBounds.bottom );
      }

      this.transformedPanBounds = this.panBounds.transformed( this._targetNode.matrix.inverted() );
    },

    /**
     * Set the pan bounds - bounds which should be totally filled by targetNode bounds (or targetBounds).
     * @param {Bounds2} bounds
     */
    setPanBounds: function( bounds ) {
      this._panBounds = bounds;
      this.correctReposition();
    },
    set panBounds( bounds ) { this.setPanBounds( bounds ); },

    /**
     * Get the panBounds.
     *
     * @returns {Bounds2}
     */
    getPanBounds: function() {
      return this._panBounds;
    },
    get panBounds() { return this.getPanBounds(); },

    /**
     * Set the target bounds which should totally fill the panBounds at all times. Useful if the targetNode has bounds
     * which don't accurately describe the Node. For example, if an overlay plane is on top of the node that extends
     * across the node with dimensions that are larger than the visible node.
     *
     * @param {Bounds2} targetBounds
     */
    setTargetBounds: function( targetBounds ) {
      this._targetBounds = targetBounds;
      this.correctReposition();
    },
    set targetBounds( targetBounds ) { this.setTargetBounds( targetBounds ); },

    /**
     * Get the target bounds.
     *
     * @returns {Bounds2}
     */
    getTargetBounds: function() {
      return this._targetBounds;
    },
    get targetBounds() { return this.getTargetBounds(); }

  } );

  return PanZoomListener;
} );
