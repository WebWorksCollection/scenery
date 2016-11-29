// Copyright 2016, University of Colorado Boulder

/**
 * Canvas drawable for Path nodes.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';

  var inherit = require( 'PHET_CORE/inherit' );
  var scenery = require( 'SCENERY/scenery' );
  var CanvasSelfDrawable = require( 'SCENERY/display/CanvasSelfDrawable' );
  var SelfDrawable = require( 'SCENERY/display/SelfDrawable' );
  var PaintableStatelessDrawable = require( 'SCENERY/display/drawables/PaintableStatelessDrawable' );

  /**
   * A generated CanvasSelfDrawable whose purpose will be drawing our Path. One of these drawables will be created
   * for each displayed instance of a Path.
   * @constructor
   *
   * @param {number} renderer - Renderer bitmask, see Renderer's documentation for more details.
   * @param {Instance} instance
   */
  function PathCanvasDrawable( renderer, instance ) {
    this.initialize( renderer, instance );
  }

  scenery.register( 'PathCanvasDrawable', PathCanvasDrawable );

  inherit( CanvasSelfDrawable, PathCanvasDrawable, {
    /**
     * Initializes this drawable, starting its "lifetime" until it is disposed. This lifecycle can happen multiple
     * times, with instances generally created by the SelfDrawable.Poolable mixin (dirtyFromPool/createFromPool), and
     * disposal will return this drawable to the pool.
     * @public (scenery-internal)
     *
     * This acts as a pseudo-constructor that can be called multiple times, and effectively creates/resets the state
     * of the drawable to the initial state.
     *
     * @param {number} renderer - Renderer bitmask, see Renderer's documentation for more details.
     * @param {Instance} instance
     * @returns {PathCanvasDrawable} - Returns 'this' reference, for chaining
     */
    initialize: function( renderer, instance ) {
      this.initializeCanvasSelfDrawable( renderer, instance );
      this.initializePaintableStateless( renderer, instance );
      return this;
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
      var context = wrapper.context;

      if ( node.hasShape() ) {
        // TODO: fill/stroke delay optimizations?
        context.beginPath();
        node._shape.writeToContext( context );

        if ( node.hasFill() ) {
          node.beforeCanvasFill( wrapper ); // defined in Paintable
          context.fill();
          node.afterCanvasFill( wrapper ); // defined in Paintable
        }

        // Do not render strokes in Canvas if the lineWidth is 0, see https://github.com/phetsims/scenery/issues/523
        if ( node.hasStroke() && node.getLineWidth() > 0 ) {
          node.beforeCanvasStroke( wrapper ); // defined in Paintable
          context.stroke();
          node.afterCanvasStroke( wrapper ); // defined in Paintable
        }
      }
    },

    // stateless dirty functions
    markDirtyShape: function() { this.markPaintDirty(); },

    /**
     * Disposes the drawable.
     * @public
     * @override
     */
    dispose: function() {
      CanvasSelfDrawable.prototype.dispose.call( this );
      this.disposePaintableStateless();
    }
  } );

  PaintableStatelessDrawable.mixin( PathCanvasDrawable );

  // This sets up PathCanvasDrawable.createFromPool/dirtyFromPool and drawable.freeToPool() for the type, so
  // that we can avoid allocations by reusing previously-used drawables.
  SelfDrawable.Poolable.mixin( PathCanvasDrawable );

  return PathCanvasDrawable;
} );