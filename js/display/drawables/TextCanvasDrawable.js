// Copyright 2013-2015, University of Colorado Boulder

/**
 * Canvas drawable for Text nodes.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';

  var inherit = require( 'PHET_CORE/inherit' );
  var scenery = require( 'SCENERY/scenery' );
  var Paintable = require( 'SCENERY/nodes/Paintable' );
  var CanvasSelfDrawable = require( 'SCENERY/display/CanvasSelfDrawable' );
  var SelfDrawable = require( 'SCENERY/display/SelfDrawable' );

  /**
   * A generated CanvasSelfDrawable whose purpose will be drawing our Text. One of these drawables will be created
   * for each displayed instance of a Text node.
   * @constructor
   *
   * @param {number} renderer - Renderer bitmask, see Renderer's documentation for more details.
   * @param {Instance} instance
   */
  function TextCanvasDrawable( renderer, instance ) {
    this.initialize( renderer, instance );
  }

  scenery.register( 'TextCanvasDrawable', TextCanvasDrawable );

  inherit( CanvasSelfDrawable, TextCanvasDrawable, {
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
     * @returns {TextCanvasDrawable} - Returns 'this' reference, for chaining
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

      // extra parameters we need to set, but should avoid setting if we aren't drawing anything
      if ( node.hasFill() || node.hasStroke() ) {
        wrapper.setFont( node._font.getFont() );
        wrapper.setDirection( node._direction );
      }

      if ( node.hasFill() ) {
        node.beforeCanvasFill( wrapper ); // defined in Paintable
        context.fillText( node.renderedText, 0, 0 );
        node.afterCanvasFill( wrapper ); // defined in Paintable
      }
      if ( node.hasStroke() ) {
        node.beforeCanvasStroke( wrapper ); // defined in Paintable
        context.strokeText( node.renderedText, 0, 0 );
        node.afterCanvasStroke( wrapper ); // defined in Paintable
      }
    },

    // stateless dirty functions
    markDirtyText: function() { this.markPaintDirty(); },
    markDirtyFont: function() { this.markPaintDirty(); },
    markDirtyBounds: function() { this.markPaintDirty(); },
    markDirtyDirection: function() { this.markPaintDirty(); },

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

  Paintable.PaintableStatelessDrawable.mixin( TextCanvasDrawable );

  // This sets up TextCanvasDrawable.createFromPool/dirtyFromPool and drawable.freeToPool() for the type, so
  // that we can avoid allocations by reusing previously-used drawables.
  SelfDrawable.Poolable.mixin( TextCanvasDrawable );

  return TextCanvasDrawable;
} );
