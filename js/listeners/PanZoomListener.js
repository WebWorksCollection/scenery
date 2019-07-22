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
  var NumberProperty = require( 'AXON/NumberProperty' );
  var Property = require( 'AXON/Property' );
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

    // @public - magnification scale for the model
    this.magnificationProperty = new NumberProperty( 1 );

    // @public - horizontal scroll amount from panning
    this.horizontalScrollProperty = new NumberProperty( 0 );

    // @public - vertical scroll amount from panning
    this.verticalScrollProperty = new NumberProperty( 0 );

    this.relativeHeightVisibleProperty = new NumberProperty( 1 );

    this.relativeWidthVisibleProperty = new NumberProperty( 1 );

    const transformedBounds = this._targetBounds.transformed( this._targetNode.getMatrix() );
    this.transformedPanBoundsProperty = new Property( transformedBounds );

    // this.magnificationProperty.link( ( magnification ) => {
    //   console.log( 'magnification: ' + magnification );
    // } );

    // this.horizontalScrollProperty.link( ( scroll ) => {
    //   console.log( 'horizontal scroll: ' + scroll );
    // } );

    // this.verticalScrollProperty.link( ( scroll ) => {
    //   console.log( 'vertical scroll:' + scroll );
    // } );
    
    // this.relativeWidthVisibleProperty.link( ( percent ) => {
    //   console.log( 'percentWidthVisible: ' + percent );
    // } );

    // this.relativeHeightVisibleProperty.link( ( percent ) => {
    //   console.log( 'percentHeightVisible:' + percent );
    // } );

    // this.transformedPanBoundsProperty.link( ( bounds ) => {
    //   console.log( bounds );
    // } );
 
    
  }

  scenery.register( 'PanZoomListener', PanZoomListener );

  inherit( MultiListener, PanZoomListener, {
    reposition: function() {
      MultiListener.prototype.reposition.call( this );
      this.correctReposition();
    },

    repositionFromWheel: function( wheel, event ) {
      MultiListener.prototype.repositionFromWheel.call( this, wheel, event );
      this.correctReposition();
    },

    repositionFromKeys: function( keyPress ) {
      MultiListener.prototype.repositionFromKeys.call( this, keyPress );
      this.correctReposition();
    },

    repositionCustom: function( localPoint, scale ) {
      MultiListener.prototype.repositionCustom.call( this, localPoint, scale );
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

      // update the transformed bounds after corrections above as it will be used for calculations
      const correctedTransformedBounds = this._targetBounds.transformed( this._targetNode.getMatrix() );
      this.transformedPanBoundsProperty.set( correctedTransformedBounds );

      this.magnificationProperty.set( this._targetNode.getScaleVector().x );

      const totalHorizontalPan = correctedTransformedBounds.getWidth() - this._panBounds.getWidth();
      const currentHorizontalPan = correctedTransformedBounds.getRight() - this._panBounds.getRight();
      const horizontalScroll = totalHorizontalPan === 0 ? 0 : 1 - currentHorizontalPan / totalHorizontalPan;
      this.horizontalScrollProperty.set( horizontalScroll );
      this.relativeWidthVisibleProperty.set( this._panBounds.getWidth() / correctedTransformedBounds.getWidth() );

      const totalVerticalPan = correctedTransformedBounds.getHeight() - this._panBounds.getHeight();
      const currentVerticalPan = correctedTransformedBounds.getTop() - this._panBounds.getTop();
      const verticalScroll = totalVerticalPan === 0 ? 0 : -currentVerticalPan / totalVerticalPan;
      this.verticalScrollProperty.set( verticalScroll );
      this.relativeHeightVisibleProperty.set( this._panBounds.getHeight() / correctedTransformedBounds.getHeight() );
    },

    /**
     * Get the visible bounds in the global coordinate frame after panning and zooming.
     *
     * @returns {}
     */
    getVisibleBounds: function() {

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
