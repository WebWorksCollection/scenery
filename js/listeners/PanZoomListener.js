// Copyright 2017, University of Colorado Boulder

/**
 * TODO: doc
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
   * TODO: Have 'content' bounds (instead of using the targetNode's bounds), since some things may extend off the side
   *       of the content bounds.
   *
   * TODO: Support mutable target or pan bounds (adjust transform).
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
  }

  scenery.register( 'PanZoomListener', PanZoomListener );

  inherit( MultiListener, PanZoomListener, {
    reposition: function() {
      MultiListener.prototype.reposition.call( this );
      this.correctReposition();
    },

    repositionFromWheel: function( wheel ) {
      MultiListener.prototype.repositionFromWheel.call( this, wheel );
      this.correctReposition();
    },

    repositionFromKeys: function( keyPress ) {
      MultiListener.prototype.repositionFromKeys.call( this, keyPress );
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
    },

    setPanBounds: function( bounds ) {
      this._panBounds = bounds;
    },
    set panBounds( bounds ) { this.setPanBounds( bounds ); },

    getPanBounds: function( bounds ) {
      return this._panBounds;
    },
    get panBounds() { return this.getPanBounds(); },

    setTargetBounds: function( targetBounds ) {
      this._targetBounds = targetBounds;
    },
    set targetBounds( targetBounds ) { this.setTargetBounds( targetBounds ); },
    
    getTargetBounds: function() {
      return this._targetBounds;
    },
    get targetBounds() { return this.getTargetBounds(); }
  } );

  return PanZoomListener;
} );
