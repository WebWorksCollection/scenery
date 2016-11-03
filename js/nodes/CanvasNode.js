// Copyright 2013-2015, University of Colorado Boulder

/**
 * An abstract node (should be subtyped) that is drawn by user-provided custom Canvas code.
 *
 * The region that can be drawn in is handled manually, by controlling the canvasBounds property of this CanvasNode.
 * Any regions outside of the canvasBounds will not be guaranteed to be drawn. This can be set with canvasBounds in the
 * constructor, or later with node.canvasBounds = bounds or setCanvasBounds( bounds ).
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';

  var inherit = require( 'PHET_CORE/inherit' );
  var scenery = require( 'SCENERY/scenery' );

  var Node = require( 'SCENERY/nodes/Node' );
  var Renderer = require( 'SCENERY/display/Renderer' );
  var CanvasSelfDrawable = require( 'SCENERY/display/CanvasSelfDrawable' );
  var SelfDrawable = require( 'SCENERY/display/SelfDrawable' );

  var emptyArray = []; // constant, used for line-dash

  /**
   * @constructor
   *
   * @param {Object} [options] - Can contain Node's options, and/or CanvasNode options (e.g. canvasBound)
   */
  function CanvasNode( options ) {
    Node.call( this, options );

    // This shouldn't change, as we only support one renderer
    this.setRendererBitmask( Renderer.bitmaskCanvas );
  }

  scenery.register( 'CanvasNode', CanvasNode );

  inherit( Node, CanvasNode, {
    /**
     * {Array.<string>} - String keys for all of the allowed options that will be set by node.mutate( options ), in the
     * order they will be evaluated in.
     * @protected
     *
     * NOTE: See Node's _mutatorKeys documentation for more information on how this operates, and potential special
     *       cases that may apply.
     */
    _mutatorKeys: [ 'canvasBounds' ].concat( Node.prototype._mutatorKeys ),

    /**
     * Sets the bounds that are used for layout/repainting.
     * @public
     *
     * These bounds should always cover at least the area where the CanvasNode will draw in. If this is violated, this
     * node may be partially or completely invisible in Scenery's output.
     *
     * @param {Bounds2} selfBounds
     */
    setCanvasBounds: function( selfBounds ) {
      this.invalidateSelf( selfBounds );
    },
    set canvasBounds( value ) { this.setCanvasBounds( value ); },

    /**
     * Returns the previously-set canvasBounds, or Bounds2.NOTHING if it has not been set yet.
     * @public
     *
     * @returns {Bounds2}
     */
    getCanvasBounds: function() {
      return this.getSelfBounds();
    },
    get canvasBounds() { return this.getCanvasBounds(); },

    /**
     * Whether this Node itself is painted (displays something itself).
     * @public
     * @override
     *
     * @returns {boolean}
     */
    isPainted: function() {
      // Always true for CanvasNode
      return true;
    },

    /**
     * Override paintCanvas with a faster version, since fillRect and drawRect don't affect the current default path.
     * @public
     *
     * IMPORTANT NOTE: This function will be run from inside Scenery's Display.updateDisplay(), so it should not modify
     * or mutate any Scenery nodes (particularly anything that would cause something to be marked as needing a repaint).
     * Ideally, this function should have no outside effects other than painting to the Canvas provided.
     *
     * @param {CanvasRenderingContext2D} context
     */
    paintCanvas: function( context ) {
      throw new Error( 'CanvasNode needs paintCanvas implemented' );
    },

    /**
     * Should be called when this node needs to be repainted. When not called, Scenery assumes that this node does
     * NOT need to be repainted (although Scenery may repaint it due to other nodes needing to be repainted).
     * @public
     *
     * This sets a "dirty" flag, so that it will be repainted the next time it would be displayed.
     */
    invalidatePaint: function() {
      var stateLen = this._drawables.length;
      for ( var i = 0; i < stateLen; i++ ) {
        this._drawables[ i ].markDirty();
      }
    },

    /**
     * Draws the current Node's self representation, assuming the wrapper's Canvas context is already in the local
     * coordinate frame of this node.
     * @protected
     * @override
     *
     * @param {CanvasContextWrapper} wrapper
     */
    canvasPaintSelf: function( wrapper ) {
      this.paintCanvas( wrapper.context );
    },

    /**
     * Computes whether the provided point is "inside" (contained) in this Node's self content, or "outside".
     * @protected
     * @override
     *
     * If CanvasNode subtypes want to support being picked or hit-tested, it should override this function.
     *
     * @param {Vector2} point - Considered to be in the local coordinate frame
     * @returns {boolean}
     */
    containsPointSelf: function( point ) {
      return false;
    },

    /**
     * Creates a Canvas drawable for this CanvasNode.
     * @public (scenery-internal)
     * @override
     *
     * @param {number} renderer - In the bitmask format specified by Renderer, which may contain additional bit flags.
     * @param {Instance} instance - Instance object that will be associated with the drawable
     * @returns {CanvasSelfDrawable}
     */
    createCanvasDrawable: function( renderer, instance ) {
      return CanvasNode.CanvasNodeDrawable.createFromPool( renderer, instance );
    },

    /**
     * Returns a string containing constructor information for Node.string().
     * @protected
     * @override
     *
     * @param {string} propLines - A string representing the options properties that need to be set.
     * @returns {string}
     */
    getBasicConstructor: function( propLines ) {
      return 'new scenery.CanvasNode( {' + propLines + '} )'; // TODO: no real way to do this nicely?
    }
  } );

  /*---------------------------------------------------------------------------*
   * Canvas rendering
   *----------------------------------------------------------------------------*/

  /**
   * A generated CanvasSelfDrawable whose purpose will be drawing our CanvasNode. One of these drawables will be created
   * for each displayed instance of a CanvasNode.
   * @constructor
   * @mixes SelfDrawable.Poolable
   *
   * @param {number} renderer - Renderer bitmask, see Renderer's documentation for more details.
   * @param {Instance} instance
   */
  CanvasNode.CanvasNodeDrawable = function CanvasNodeDrawable( renderer, instance ) {
    this.initialize( renderer, instance );
  };
  inherit( CanvasSelfDrawable, CanvasNode.CanvasNodeDrawable, {
    /**
     * Initializes this drawable, starting its "lifetime" until it is disposed. This lifecycle can happen multiple
     * times, with instances generally created by the SelfDrawable.Poolable mixin (dirtyFromPool/createFromPool), and
     * disposal will return this drawable to the pool.
     * @private
     *
     * This acts as a pseudo-constructor that can be called multiple times, and effectively creates/resets the state
     * of the drawable to the initial state.
     *
     * @param {number} renderer - Renderer bitmask, see Renderer's documentation for more details.
     * @param {Instance} instance
     */
    initialize: function( renderer, instance ) {
      return this.initializeCanvasSelfDrawable( renderer, instance );
    },

    /**
     * Paints this drawable to a Canvas (the wrapper contains both a Canvas reference and its drawing context).
     * @public
     *
     * Assumes that the Canvas's context is already in the proper local coordinate frame for the node, and that any
     * other required effects (opacity, clipping, etc.) have already been prepared.
     *
     * This is part of the CanvasSelfDrawable API required to be implemented for subtypes.
     *
     * @param {CanvasContextWrapper} wrapper - Contains the Canvas and its drawing context
     * @param {Node} node - Our node that is being drawn
     */
    paintCanvas: function( wrapper, node ) {
      assert && assert( !node.selfBounds.isEmpty(), 'CanvasNode should not be used with an empty canvasBounds. ' +
                                                    'Please set canvasBounds (or use setCanvasBounds()) on ' + node.constructor.name );

      if ( !node.selfBounds.isEmpty() ) {
        var context = wrapper.context;
        context.save();

        // set back to Canvas default styles
        // TODO: are these necessary, or can we drop them for performance?
        context.fillStyle = 'black';
        context.strokeStyle = 'black';
        context.lineWidth = 1;
        context.lineCap = 'butt';
        context.lineJoin = 'miter';
        context.lineDash = emptyArray;
        context.lineDashOffset = 0;
        context.miterLimit = 10;

        node.paintCanvas( context );

        context.restore();
      }
    }
  } );
  // This sets up CanvasNodeDrawable.createFromPool/dirtyFromPool and drawable.freeToPool() for the type, so
  // that we can avoid allocations by reusing previously-used drawables.
  SelfDrawable.Poolable.mixin( CanvasNode.CanvasNodeDrawable );

  return CanvasNode;
} );
