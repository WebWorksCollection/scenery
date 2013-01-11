// Copyright 2002-2012, University of Colorado

/**
 * A node for the phet-scene scene graph. Supports only tree-style graphs at the moment.
 * Handles multiple layers with assorted types (canvas, svg, DOM, etc.), and bounds
 * computation
 *
 * TODO: investigate handling DAGs (directed acyclic graphs)
 *
 * @author Jonathan Olson
 */

var phet = phet || {};
phet.scene = phet.scene || {};

(function(){
    var Bounds2 = phet.math.Bounds2;
    var Shape = phet.scene.Shape;
    
    // TODO: consider an args-style constructor here!
    phet.scene.Node = function() {
        // TODO: actually handle visibility!
        this.visible = true;
        
        // type of layer to be created for content under this node.
        // if non-null, this node is a layer root, and layerType should be a layer constructor function
        this.layerType = null;
        
        this.children = [];
        this.transform = new phet.math.Transform3();
        this.parent = null;
        
        // layer-specific data, currently updated in the rebuildLayers step
        this._layerBeforeRender = null; // layer to swap to before rendering this node
        this._layerAfterRender = null; // layer to swap to after rendering this node
        
        // bounds handling
        this._bounds = Bounds2.NOTHING; // for this node and its children, in "parent" coordinates
        this._selfBounds = Bounds2.NOTHING; // just for this node, in "local" coordinates
        this._childBounds = Bounds2.NOTHING; // just for children, in "local" coordinates
        this._boundsDirty = true;
        this._selfBoundsDirty = true;
        this._childBoundsDirty = true;
        
        // shape used for rendering
        this._shape = null;
        // fill/stroke for shapes
        this.stroke = null;
        this.fill = null;
        
        this._lineDrawingStyles = new Shape.LineStyles();
    }
    
    var Node = phet.scene.Node;
    var Matrix3 = phet.math.Matrix3;
    
    Node.prototype = {
        constructor: Node,
        
        // main render function for the root
        renderFull: function() {
            phet.assert( this.parent == null );
            phet.assert( this.isLayerRoot() );
            
            // validating bounds, similar to Piccolo2d
            this.validateBounds();
            
            // TODO: render only dirty regions
            this.render( new phet.scene.RenderState() );
        },
        
        render: function( state ) {
            // switch layers if needed
            if( this._layerBeforeRender ) {
                state.switchToLayer( this._layerBeforeRender );
            }
            
            // apply this node's transform
            if ( !this.transform.isIdentity() ) {
                // TODO: consider a stack-based model for transforms?
                state.applyTransformationMatrix( this.transform.matrix );
            }
            
            // handle any pre-render tasks
            this.preRender( state );
            
            this.renderSelf( state );
            this.renderChildren( state );
            
            // handle any post-render tasks
            this.postRender( state );
            
            // apply the inverse of this node's transform
            if ( !this.transform.isIdentity() ) {
                state.applyTransformationMatrix( this.transform.inverse );
            }
            
            // switch layers if needed
            if( this._layerAfterRender ) {
                state.switchToLayer( this._layerAfterRender );
            }
        },
        
        // override to render typical leaf behavior (although possible to use for non-leaf nodes also)
        renderSelf: function ( state ) {
            
            // by default, render a shape if it exists
            if( this.hasShape() ) {
                if( state.isCanvasState() ) {
                    var layer = state.layer;
                    var context = layer.context;
                    
                    // TODO: fill/stroke delay optimizations?
                    context.beginPath();
                    this._shape.writeToContext( context );
                    
                    if( this.fill ) {
                        layer.setFillStyle( this.fill );
                        context.fill();
                    }
                    if( this.stroke ) {
                        layer.setStrokeStyle( this.stroke );
                        context.stroke();
                    }
                }
            }
        },
        
        // override to run before rendering of this node is done
        preRender: function ( state ) {
            
        },
        
        // override to run just after this node and its children are rendered
        postRender: function ( state ) {
            
        },
        
        renderChildren: function ( state ) {
            for ( var i = 0; i < this.children.length; i++ ) {
                this.children[i].render( state );
            }
        },
        
        addChild: function ( node ) {
            phet.assert( node !== null && node !== undefined );
            if ( this.isChild( node ) ) {
                return;
            }
            if ( node.parent !== null ) {
                node.parent.removeChild( node );
            }
            node.parent = this;
            this.children.push( node );
            
            this.invalidateBounds();
            this._childBoundsDirty = true;
        },
        
        removeChild: function ( node ) {
            phet.assert( this.isChild( node ) );
            
            node.parent = null;
            this.children.splice( this.children.indexOf( node ), 1 );
            
            this.invalidateBounds();
        },
        
        hasParent: function () {
            return this.parent !== null && this.parent !== undefined;
        },
        
        // remove this node from its parent
        detach: function () {
            if ( this.hasParent() ) {
                this.parent.removeChild( this );
            }
        },
        
        isChild: function ( potentialChild ) {
            phet.assert( (potentialChild.parent === this ) === (this.children.indexOf( potentialChild ) != -1) );
            return potentialChild.parent === this;
        },
        
        // does this node have an associated layerType (are the contents of this node rendered separately from its ancestors)
        isLayerRoot: function() {
            return this.layerType != null;
        },
        
        // the first layer associated with this node (can be multiple layers if children of this node are also layer roots)
        getLayer: function() {
            phet.assert( this.isLayerRoot() );
            return this._layerBeforeRender;
        },
        
        translate: function ( x, y ) {
            this.transform.append( Matrix3.translation( x, y ) );
            this.invalidateBounds();
        },
        
        // scale( s ) is also supported
        scale: function ( x, y ) {
            this.transform.append( Matrix3.scaling( x, y ) );
            this.invalidateBounds();
        },
        
        rotate: function ( angle ) {
            this.transform.append( Matrix3.rotation2( angle ) );
            this.invalidateBounds();
        },
        
        // called on the root node when any layer-relevant changes are made
        // TODO: add flags for this to happen, and call during renderFull. set flags on necessary functions
        rebuildLayers: function( main ) {
            // verify that this node is the effective root
            phet.assert( this.parent == null );
            
            // root needs to contain a layer type reference
            phet.assert( this.layerType != null );
            
            // remove everything from our container, so we can fill it in with fresh layers
            main.empty();
            
            // for handling layers in depth-first fashion
            function recursiveRebuild( node, baseLayerType ) {
                var hasLayer = node.layerType != null;
                if( !hasLayer ) {
                    // sanity checks, in case a layerType was removed
                    node._layerBeforeRender = null;
                    node._layerAfterRender = null;
                } else {
                    // create the layers for before/after
                    node._layerBeforeRender = new node.layerType( main );
                    node._layerAfterRender = new baseLayerType( main );
                    
                    // change the base layer type for the layer children
                    baseLayerType = node.layerType;
                }
                
                // for stacking, add the "before" layer before recursion
                if( hasLayer ) {
                    main.append( node._layerBeforeRender );
                }
                
                // handle layers for children
                _.each( node.children, function( child ) {
                    recursiveRebuild( child, baseLayerType );
                } );
                
                // and the "after" layer after recursion, on top of any child layers
                if( hasLayer ) {
                    main.append( node._layerAfterRender );
                }
            }
            
            // get the layer constructor
            var rootLayerType = this.layerType;
            
            // create the first layer (will be the only layer if no other nodes have a layerType)
            var startingLayer = new rootLayerType( main );
            main.append( startingLayer );
            this._layerBeforeRender = startingLayer;
            // no "after" layer needed for the root, since nothing is rendered after it
            this._layerAfterRender = null;
            
            _.each( this.children, function( child ) {
                recursiveRebuild( child, rootLayerType );
            } );
        },
        
        // bounds assumed to be in the local coordinate frame, below this node's transform
        markDirtyRegion: function( bounds ) {
            var layer = this.findLayer();
            
            // if there is no layer, ignore the markDirtyRegion call
            if( layer != null ) {
                layer.markDirtyRegion( this.localToGlobalBounds( bounds ) );
            }
        },
        
        // the bounds for content in renderSelf(), in "local" coordinates
        getSelfBounds: function() {
            return this._selfBounds;
        },
        
        // the bounds for content in render(), in "parent" coordinates
        getBounds: function() {
            this.validateBounds();
            return this._bounds;
        },
        
        // ensure that cached bounds stored on this node (and all children) are accurate
        validateBounds: function() {
            // TODO: why is _selfBoundsDirty even needed?
            if( this._selfBoundsDirty ) {
                this._selfBoundsDirty = false;
            }
            
            // validate bounds of children if necessary
            if( this._childBoundsDirty ) {
                // have each child validate their own bounds
                _.each( this.children, function( child ) {
                    child.validateBounds();
                } );
                
                // and recompute our _childBounds
                this._childBounds = Bounds2.NOTHING;
                var that = this;
                _.each( this.children, function( child ) {
                    that._childBounds = that._childBounds.union( child._bounds );
                } );
                
                this._childBoundsDirty = false;
            }
            
            // TODO: layout here?
            
            if( this._boundsDirty ) {
                var oldBounds = this._bounds;
                
                var that = this;
                
                var newBounds = this.localToParentBounds( this._selfBounds ).union( that.localToParentBounds( this._childBounds ) );
                
                if( !newBounds.equals( oldBounds ) ) {
                    this._bounds = newBounds;
                    
                    if( this.parent != null ) {
                        this.parent.invalidateBounds();
                    }
                    this.markDirtyRegion( this.parentToLocalBounds( oldBounds ) );
                    
                    // TODO: fire off event listeners?
                }
                
                this._boundsDirty = false;
            }
        },
        
        // find the first layer root of which this node is an ancestor.
        findLayerRoot: function() {
            var node = this;
            while( node != null ) {
                if( node.isLayerRoot() ) {
                    return node;
                }
                node = node.parent;
            }
            
            // no layer root found
            return null;
        },
        
        // find the layer that this node will be rendered to
        findLayer: function() {
            var root = this.findLayerRoot();
            return root != null ? root.getLayer() : null;
        },
        
        // mark the bounds of this node as invalid, so it is recomputed before it is accessed again
        invalidateBounds: function() {
            this._boundsDirty = true;
            
            // and set flags for all ancestors
            var node = this.parent;
            while( node != null ) {
                // TODO: for performance, consider cutting this once we detect a node with this as true
                node._childBoundsDirty = true;
                node = node.parent;
            }
        },
        
        // sets the bounds of the content rendered by renderSelf()
        setSelfBounds: function( newBounds ) {
            // if these bounds are different than current self bounds
            if( !this._selfBounds.equals( newBounds ) ) {
                // mark the old region to be repainted
                this.markDirtyRegion( this._selfBounds );
                
                // set repaint flags
                this._selfBoundsDirty = true;
                this.invalidateBounds();
                
                // record the new bounds
                this._selfBounds = newBounds;
            }
        },
        
        // apply this node's transform to the point
        localToParentPoint: function( point ) {
            return this.transform.transformPosition2( point );
        },
        
        localToParentBounds: function( bounds ) {
            return this.transform.transformBounds2( bounds );
        },
        
        // apply the inverse of this node's transform to the point
        parentToLocalPoint: function( point ) {
            return this.transform.inversePosition2( point );
        },
        
        parentToLocalBounds: function( bounds ) {
            return this.transform.inverseBounds2( bounds );
        },
        
        // apply this node's transform (and then all of its parents' transforms) to the point
        localToGlobalPoint: function( point ) {
            var node = this;
            while( node != null ) {
                point = node.transform.transformPosition2( point );
                node = node.parent;
            }
            return point;
        },
        
        localToGlobalBounds: function( bounds ) {
            var node = this;
            while( node != null ) {
                bounds = node.transform.transformBounds2( bounds );
                node = node.parent;
            }
            return bounds;
        },
        
        globalToLocalPoint: function( point ) {
            var node = this;
            
            // we need to apply the transformations in the reverse order, so we temporarily store them
            var transforms = [];
            while( node != null ) {
                transforms.push( node.transform );
                node = node.parent;
            }
            
            // iterate from the back forwards (from the root node to here)
            for( var i = transforms.length - 1; i >=0; i-- ) {
                point = transforms[i].inversePosition2( point );
            }
            return point;
        },
        
        globalToLocalBounds: function( bounds ) {
            var node = this;
            
            // we need to apply the transformations in the reverse order, so we temporarily store them
            var transforms = [];
            while( node != null ) {
                transforms.push( node.transform );
                node = node.parent;
            }
            
            // iterate from the back forwards (from the root node to here)
            for( var i = transforms.length - 1; i >=0; i-- ) {
                bounds = transforms[i].inverseBounds2( bounds );
            }
            return bounds;
        },
        
        // checking for whether a point (in parent coordinates) is contained in this sub-tree
        containsPoint: function( point ) {
            // update bounds for pruning
            this.validateBounds();
            
            // bail quickly if this doesn't hit our computed bounds
            if( !this._bounds.containsPoint( point ) ) { return false; }
            
            // point in the local coordinate frame. computed after the main bounds check, so we can bail out there efficiently
            var localPoint = this.transform.inversePosition2( point );
            
            // check children first, since they are rendered later
            if( this.children.length > 0 && this._childBounds.containsPoint( localPoint ) ) {
                
                // manual iteration here so we can return directly, and so we can iterate backwards (last node is in front)
                for( var i = this.children.length - 1; i >= 0; i-- ) {
                    var child = this.children[i];
                    
                    // the child will have the point in its parent's coordinate frame (i.e. this node's frame)
                    if( child.containsPoint( localPoint ) ) {
                        return true;
                    }
                }
            }
            
            // didn't hit our children, so check ourself as a last resort
            if( this._selfBounds.containsPoint( point ) ) {
                return this.containsPointSelf( point );
            }
        },
        
        // override for computation of whether a point is inside the content rendered in renderSelf
        containsPointSelf: function( point ) {
            return false;
        },
        
        hasShape: function() {
            return this._shape != null;
        },
        
        // sets the shape drawn, or null to remove the shape
        setShape: function( shape ) {
            this._shape = shape;
            
            this.setSelfBounds( shape.computeBounds( ) );
        }
    };
})();