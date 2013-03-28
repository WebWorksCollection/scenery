// Copyright 2002-2012, University of Colorado

/**
 * A Path draws a Shape with a specific type of fill and stroke.
 *
 * @author Jonathan Olson <olsonsjc@gmail.com>
 */

define( function( require ) {
  "use strict";
  
  var assert = require( 'ASSERT/assert' )( 'scenery' );
  
  var inherit = require( 'PHET_CORE/inherit' );
  var scenery = require( 'SCENERY/scenery' );
  
  var Node = require( 'SCENERY/nodes/Node' );
  var Renderer = require( 'SCENERY/layers/Renderer' );
  var fillable = require( 'SCENERY/nodes/Fillable' );
  var strokable = require( 'SCENERY/nodes/Strokable' );
  var objectCreate = require( 'SCENERY/util/Util' ).objectCreate;
  
  scenery.Path = function Path( options ) {
    // TODO: consider directly passing in a shape object (or at least handling that case)
    this._shape = null;
    
    // ensure we have a parameter object
    options = options || {};
    
    this.initializeStrokable();
    
    Node.call( this, options );
  };
  var Path = scenery.Path;
  
  inherit( Path, Node, {
    // sets the shape drawn, or null to remove the shape
    setShape: function( shape ) {
      if ( this._shape !== shape ) {
        this._shape = shape;
        this.invalidateShape();
      }
      return this;
    },
    
    getShape: function() {
      return this._shape;
    },
    
    invalidateShape: function() {
      this.markOldSelfPaint();
      
      if ( this.hasShape() ) {
        this.invalidateSelf( this._shape.computeBounds( this._stroke ? this._lineDrawingStyles : null ) );
        this.invalidatePaint();
      }
    },
    
    // hook stroke mixin changes to invalidation
    invalidateStroke: function() {
      this.invalidateShape();
    },
    
    hasShape: function() {
      return this._shape !== null;
    },
    
    // TODO: change from state to layer?
    paintCanvas: function( state ) {
      if ( this.hasShape() ) {
        var layer = state.layer;
        var context = layer.context;

        // TODO: fill/stroke delay optimizations?
        context.beginPath();
        this._shape.writeToContext( context );

        if ( this._fill ) {
          this.beforeCanvasFill( layer ); // defined in Fillable
          context.fill();
          this.afterCanvasFill( layer ); // defined in Fillable
        }
        if ( this._stroke ) {
          this.beforeCanvasStroke( layer ); // defined in Strokable
          context.stroke();
          this.afterCanvasStroke( layer ); // defined in Strokable
        }
      }
    },
    
    paintWebGL: function( state ) {
      throw new Error( 'Path.prototype.paintWebGL unimplemented' );
    },
    
    // svg element, the <defs> block, and the associated group for this node's transform
    createSVGFragment: function( svg, defs, group ) {
      return document.createElementNS( 'http://www.w3.org/2000/svg', 'path' );
    },
    
    updateSVGFragment: function( path ) {
      if ( this.hasShape() ) {
        path.setAttribute( 'd', this._shape.getSVGPath() );
      } else if ( path.hasAttribute( 'd' ) ) {
        path.removeAttribute( 'd' );
      }
      
      path.setAttribute( 'style', this.getSVGFillStyle() + this.getSVGStrokeStyle() );
    },
    
    // support patterns, gradients, and anything else we need to put in the <defs> block
    updateSVGDefs: function( svg, defs ) {
      // remove old definitions if they exist
      this.removeSVGDefs( svg, defs );
      
      // add new ones if applicable
      this.addSVGFillDef( svg, defs );
      this.addSVGStrokeDef( svg, defs );
    },
    
    // cleans up references created with udpateSVGDefs()
    removeSVGDefs: function( svg, defs ) {
      this.removeSVGFillDef( svg, defs );
      this.removeSVGStrokeDef( svg, defs );
    },
    
    hasSelf: function() {
      return true;
    },
    
    // override for computation of whether a point is inside the self content
    // point is considered to be in the local coordinate frame
    containsPointSelf: function( point ) {
      if ( !this.hasShape() ) {
        return false;
      }
      
      var result = this._shape.containsPoint( point );
      
      // also include the stroked region in the hit area if applicable
      if ( !result && this._includeStrokeInHitRegion && this.hasStroke() ) {
        result = this._shape.getStrokedShape( this._lineDrawingStyles ).containsPoint( point );
      }
      return result;
    },
    
    // whether this node's self intersects the specified bounds, in the local coordinate frame
    intersectsBoundsSelf: function( bounds ) {
      // TODO: should a shape's stroke be included?
      return this.hasShape() ? this._shape.intersectsBounds( bounds ) : false;
    },
    
    set shape( value ) { this.setShape( value ); },
    get shape() { return this.getShape(); }
  } );
  
  Path.prototype._mutatorKeys = [ 'shape' ].concat( Node.prototype._mutatorKeys );
  
  Path.prototype._supportedRenderers = [ Renderer.Canvas, Renderer.SVG ];
  
  // mix in fill/stroke handling code. for now, this is done after 'shape' is added to the mutatorKeys so that stroke parameters
  // get set first
  fillable( Path );
  strokable( Path );
  
  return Path;
} );


