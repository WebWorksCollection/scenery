// Copyright 2002-2013, University of Colorado

/**
 * A node for the Scenery scene graph. Supports general directed acyclic graphics (DAGs).
 * Handles multiple layers with assorted types (Canvas 2D, SVG, DOM, WebGL, etc.).
 *
 * @author Jonathan Olson <olsonsjc@gmail.com>
 */

define( function( require ) {
  'use strict';
  
  var Bounds2 = require( 'DOT/Bounds2' );
  var Transform3 = require( 'DOT/Transform3' );
  var Matrix3 = require( 'DOT/Matrix3' );
  var Vector2 = require( 'DOT/Vector2' );
  var clamp = require( 'DOT/Util' ).clamp;
  
  var Shape = require( 'KITE/Shape' );
  
  var scenery = require( 'SCENERY/scenery' );
  var NodeEvents = require( 'SCENERY/util/FixedNodeEvents' ); // uncapitalized, because of JSHint (TODO: find the flag)
  var LayerStrategy = require( 'SCENERY/layers/LayerStrategy' ); // used to set the default layer strategy on the prototype
  // require( 'SCENERY/layers/Renderer' ); // commented out so Require.js doesn't balk at the circular dependency
  
  // TODO: FIXME: Why do I have to comment out this dependency?
  // require( 'SCENERY/util/Trail' );
  // require( 'SCENERY/util/TrailPointer' );
  
  var globalIdCounter = 1;
  
  /*
   * Available keys for use in the options parameter object for a vanilla Node (not inherited), in the order they are executed in:
   *
   * children:         A list of children to add (in order)
   * cursor:           Will display the specified CSS cursor when the mouse is over this Node or one of its descendents. The Scene needs to have input listeners attached with an initialize method first.
   * visible:          If false, this node (and its children) will not be displayed (or get input events)
   * pickable:         If false, this node (and its children) will not get input events
   * translation:      Sets the translation of the node to either the specified dot.Vector2 value, or the x,y values from an object (e.g. translation: { x: 1, y: 2 } )
   * x:                Sets the x-translation of the node
   * y:                Sets the y-translation of the node
   * rotation:         Sets the rotation of the node in radians
   * scale:            Sets the scale of the node. Supports either a number (same x-y scale), or a dot.Vector2 / object with ob.x and ob.y to set the scale for each axis independently
   * left:             Sets the x-translation so that the left (min X) of the bounding box (in the parent coordinate frame) is at the specified value
   * right:            Sets the x-translation so that the right (max X) of the bounding box (in the parent coordinate frame) is at the specified value
   * top:              Sets the y-translation so that the top (min Y) of the bounding box (in the parent coordinate frame) is at the specified value
   * bottom:           Sets the y-translation so that the bottom (min Y) of the bounding box (in the parent coordinate frame) is at the specified value
   * centerX:          Sets the x-translation so that the horizontal center of the bounding box (in the parent coordinate frame) is at the specified value
   * centerY:          Sets the y-translation so that the vertical center of the bounding box (in the parent coordinate frame) is at the specified value
   * renderer:         Forces Scenery to use the specific renderer (canvas/svg) to display this node (and if possible, children). Accepts both strings (e.g. 'canvas', 'svg', etc.) or actual Renderer objects (e.g. Renderer.Canvas, Renderer.SVG, etc.)
   * rendererOptions:  Parameter object that is passed to the created layer, and can affect how the layering process works.
   * layerSplit:       Forces a split between layers before and after this node (and its children) have been rendered. Useful for performance with Canvas-based renderers.
   * layerSplitBefore: Forces a split between layers before this node (and its children) have been rendered. Useful for performance with Canvas-based renderers.
   * layerSplitAfter:  Forces a split between layers after this node (and its children) have been rendered. Useful for performance with Canvas-based renderers.
   */
  scenery.Node = function Node( options ) {
    var self = this;
    
    // assign a unique ID to this node (allows trails to get a unique list of IDs)
    this._id = globalIdCounter++;
    
    // all of the Instances tracking this Node (across multiple layers and scenes)
    this._instances = [];
    
    // Whether this node (and its children) will be visible when the scene is updated. Visible nodes by default will not be pickable either
    this._visible = true;
    
    // Opacity from 0 to 1
    this._opacity = 1;
    
    // Whether hit testing will check for this node (and its children).
    this._pickable = true;
    
    // This node and all children will be clipped by this shape (in addition to any other clipping shapes).
    // The shape should be in the local coordinate frame
    this._clipShape = null;
    
    // areas for hit intersection. if set on a Node, no descendants can handle events
    this._mouseArea = null; // {Shape} for mouse position          in the local coordinate frame
    this._touchArea = null; // {Shape} for touch and pen position  in the local coordinate frame
    
    // the CSS cursor to be displayed over this node. null should be the default (inherit) value
    this._cursor = null;
    
    this._children = []; // ordered
    this._parents = []; // unordered
    
    this._peers = []; // array of peer factories: { element: ..., options: ... }, where element can be an element or a string
    this._liveRegions = []; // array of live region instances
    
    /*
     * Set up the transform reference. we add a listener so that the transform itself can be modified directly
     * by reference, or node.transform = <transform> / node.setTransform() can be used to change the transform reference.
     * Both should trigger the necessary event notifications for Scenery to keep track internally.
     */
    this._transform = new Transform3();
    this._transformListener = {
      // TODO: performance handling so we don't need to do two recursions!
      before: function() { self.beforeTransformChange(); },
      after: function() { self.afterTransformChange(); }
    };
    this._transform.addTransformListener( this._transformListener );
    
    this._inputListeners = []; // for user input handling (mouse/touch)
    this.initializeNodeEvents(); // for internal events like paint invalidation, layer invalidation, etc.
    
    // TODO: add getter/setters that will be able to invalidate whether this node is under any pointers, etc.
    this._includeStrokeInHitRegion = false;
    
    // bounds handling
    this._bounds = Bounds2.NOTHING;      // for this node and its children, in "parent" coordinates
    this._selfBounds = Bounds2.NOTHING;  // just for this node, in "local" coordinates
    this._childBounds = Bounds2.NOTHING; // just for children, in "local" coordinates
    this._boundsDirty = true;
    this._selfBoundsDirty = this.isPainted();
    this._childBoundsDirty = true;
    
    // Similar to bounds, but includes any mouse/touch areas respectively. They are validated separately (immediately after normal bounds validation),
    // and are only non-null if there are mouseAreas/touchAreas in this node or any descendants. null indicates that the normal bounds can be treated
    // as the mouse/touch bounds, and hit pruning can use those instead. These are needed because mouse/touch areas (and thus pruning bounds) can be
    // larger than the actual bounds (display bounds, _bounds above)
    this._mouseBounds = null;
    this._mouseBoundsDirty = true;
    this._touchBounds = null;
    this._touchBoundsDirty = true;
    
    // dirty region handling
    this._paintDirty = false;        // whether the self paint is dirty (just this node, none of its children)
    this._subtreePaintDirty = false; // whether the subtree paint is dirty (this node and its children, usually after a transform)
    this._childPaintDirty = false;   // whether the child paint is dirty (excluding self paint, just used for finding _paintDirty, _selfPaintDirty)
    
    // what type of renderer should be forced for this node.
    this._renderer = null;
    this._rendererOptions = null; // options that will determine the layer type
    this._rendererLayerType = null; // cached layer type that is used by the LayerStrategy
    
    // whether layers should be split before and/or after this node. setting both will put this node and its children into a separate layer
    this._layerSplitBefore = false;
    this._layerSplitAfter = false;
    
    if ( options ) {
      this.mutate( options );
    }
  };
  var Node = scenery.Node;
  
  Node.prototype = {
    constructor: Node,
    
    insertChild: function( index, node ) {
      sceneryAssert && sceneryAssert( node !== null && node !== undefined, 'insertChild cannot insert a null/undefined child' );
      sceneryAssert && sceneryAssert( !_.contains( this._children, node ), 'Parent already contains child' );
      sceneryAssert && sceneryAssert( node !== this, 'Cannot add self as a child' );
      
      node._parents.push( this );
      this._children.splice( index, 0, node );
      
      node.invalidateBounds();
      this._boundsDirty = true; // like calling this.invalidateBounds(), but we already marked all ancestors with dirty child bounds
      
      this.markForInsertion( node, index );
      this.notifyStitch( false );
      
      node.invalidateSubtreePaint();
    },
    
    addChild: function( node ) {
      this.insertChild( this._children.length, node );
    },
    
    removeChild: function( node ) {
      sceneryAssert && sceneryAssert( node );
      sceneryAssert && sceneryAssert( this.isChild( node ) );
      
      var indexOfChild = _.indexOf( this._children, node );
      
      this.removeChildWithIndex( node, indexOfChild );
    },
    
    removeChildAt: function( index ) {
      sceneryAssert && sceneryAssert( index >= 0 );
      sceneryAssert && sceneryAssert( index < this._children.length );
      
      var node = this._children[index];
      
      this.removeChildWithIndex( node, index );
    },
    
    // meant for internal use
    removeChildWithIndex: function( node, indexOfChild ) {
      sceneryAssert && sceneryAssert( node );
      sceneryAssert && sceneryAssert( this.isChild( node ) );
      sceneryAssert && sceneryAssert( this._children[indexOfChild] === node );
      
      node.markOldPaint( false );
      
      var indexOfParent = _.indexOf( node._parents, this );
      
      this.markForRemoval( node, indexOfChild );
      
      node._parents.splice( indexOfParent, 1 );
      this._children.splice( indexOfChild, 1 );
      
      this.invalidateBounds();
      this._childBoundsDirty = true; // force recomputation of child bounds after removing a child
      
      this.notifyStitch( false );
    },
    
    removeAllChildren: function() {
      this.setChildren( [] );
    },
    
    // TODO: efficiency by batching calls?
    setChildren: function( children ) {
      if ( this._children !== children ) {
        // remove all children in a way where we don't have to copy the child array for safety
        while ( this._children.length ) {
          this.removeChild( this._children[this._children.length-1] );
        }
        
        var len = children.length;
        for ( var i = 0; i < len; i++ ) {
          this.addChild( children[i] );
        }
      }
    },
    
    getChildren: function() {
      return this._children.slice( 0 ); // create a defensive copy
    },
    
    getChildrenCount: function() {
      return this._children.length;
    },
    
    getParents: function() {
      return this._parents.slice( 0 ); // create a defensive copy
    },
    
    getChildAt: function( index ) {
      return this._children[index];
    },
    
    indexOfParent: function( parent ) {
      return _.indexOf( this._parents, parent );
    },
    
    indexOfChild: function( child ) {
      return _.indexOf( this._children, child );
    },
    
    moveToFront: function() {
      var self = this;
      _.each( this._parents.slice( 0 ), function( parent ) {
        parent.moveChildToFront( self );
      } );
    },
    
    moveChildToFront: function( child ) {
      if ( this.indexOfChild( child ) !== this._children.length - 1 ) {
        this.removeChild( child );
        this.addChild( child );
      }
    },
    
    moveToBack: function() {
      var self = this;
      _.each( this._parents.slice( 0 ), function( parent ) {
        parent.moveChildToBack( self );
      } );
    },
    
    moveChildToBack: function( child ) {
      if ( this.indexOfChild( child ) !== 0 ) {
        this.removeChild( child );
        this.insertChild( 0, child );
      }
    },
    
    // remove this node from its parents
    detach: function() {
      var that = this;
      _.each( this._parents.slice( 0 ), function( parent ) {
        parent.removeChild( that );
      } );
    },
    
    // currently, there is no way to remove peers. if a string is passed as the element pattern, it will be turned into an element
    addPeer: function( element, options ) {
      sceneryAssert && sceneryAssert( !this.instances.length, 'Cannot call addPeer after a node has instances (yet)' );
      
      this._peers.push( { element: element, options: options } );
    },

    /**               
     * @param property any object that has es5 getter for 'value' es5 setter for value, and 
     */
    addLiveRegion: function( property, options ) {
      this._liveRegions.push( {property: property, options: options} );
    },
    
    // ensure that cached bounds stored on this node (and all children) are accurate
    validateBounds: function() {
      var that = this;
      var i;
      
      if ( this._selfBoundsDirty ) {
        // note: this should only be triggered if the bounds were actually changed, since we have a guard in place at invalidateSelf()
        this._selfBoundsDirty = false;
        
        // TODO: consider changing to parameter object (that may be a problem for the GC overhead)
        this.fireEvent( 'selfBounds', this._selfBounds );
      }
      
      // validate bounds of children if necessary
      if ( this._childBoundsDirty ) {
        
        // have each child validate their own bounds
        i = this._children.length;
        while ( i-- ) {
          this._children[i].validateBounds();
        }
        
        var oldChildBounds = this._childBounds;
        
        // and recompute our _childBounds
        this._childBounds = Bounds2.NOTHING.copy();
        
        i = this._children.length;
        while ( i-- ) {
          this._childBounds.includeBounds( this._children[i]._bounds );
        }
        
        // run this before firing the event
        this._childBoundsDirty = false;
        
        if ( !this._childBounds.equals( oldChildBounds ) ) {
          // TODO: consider changing to parameter object (that may be a problem for the GC overhead)
          this.fireEvent( 'childBounds', this._childBounds );
        }
      }
      
      // TODO: layout here?
      
      if ( this._boundsDirty ) {
        // run this before firing the event
        this._boundsDirty = false;
        
        var oldBounds = this._bounds;
        
        // converts local to parent bounds. mutable methods used to minimize number of created bounds instances (we create one so we don't change references to the old one)
        var newBounds = this.transformBoundsFromLocalToParent( this._selfBounds.copy().includeBounds( this._childBounds ) );
        var changed = !newBounds.equals( oldBounds );
        
        if ( changed ) {
          this._bounds = newBounds;
          
          i = this._parents.length;
          while ( i-- ) {
            this._parents[i].invalidateBounds();
          }
          
          // TODO: consider changing to parameter object (that may be a problem for the GC overhead)
          this.fireEvent( 'bounds', this._bounds );
        }
      }
      
      // if there were side-effects, run the validation again until we are clean
      if ( this._selfBoundsDirty || this._childBoundsDirty || this._boundsDirty ) {
        // TODO: if there are side-effects in listeners, this could overflow the stack. we should report an error instead of locking up
        this.validateBounds();
      }
      
      // double-check that all of our bounds handling has been accurate
      if ( sceneryAssertExtra ) {
        // new scope for safety
        (function(){
          var epsilon = 0.000001;
          
          var childBounds = Bounds2.NOTHING.copy();
          _.each( that.children, function( child ) { childBounds.includeBounds( child._bounds ); } );
          
          var fullBounds = that.localToParentBounds( that._selfBounds ).union( that.localToParentBounds( childBounds ) );
          
          sceneryAssertExtra && sceneryAssertExtra( that._childBounds.equalsEpsilon( childBounds, epsilon ), 'Child bounds mismatch after validateBounds: ' +
                                                                                                    that._childBounds.toString() + ', expected: ' + childBounds.toString() );
          sceneryAssertExtra && sceneryAssertExtra( that._bounds.equalsEpsilon( fullBounds, epsilon ), 'Bounds mismatch after validateBounds: ' +
                                                                                              that._bounds.toString() + ', expected: ' + fullBounds.toString() );
        })();
      }
    },
    
    validateMouseBounds: function() {
      var that = this;
      
      sceneryAssert && sceneryAssert( !this._selfBoundsDirty && !this._childBoundsDirty && !this._boundsDirty, 'Bounds must be validated before calling validateMouseBounds' );
      
      if ( this._mouseBoundsDirty ) {
        var hasMouseAreas = false;
        
        this._mouseBounds = this._selfBounds.copy(); // start with the self bounds, then add from there
        
        // union of all children's mouse bounds (if they exist)
        var i = this._children.length;
        while ( i-- ) {
          var child = this._children[i];
          child.validateMouseBounds();
          if ( child._mouseBounds ) {
            hasMouseAreas = true;
            that._mouseBounds.includeBounds( child._mouseBounds );
          }
        }
        
        // do this before the transformation to the parent coordinate frame
        if ( this._mouseArea ) {
          hasMouseAreas = true;
          this._mouseBounds.includeBounds( this._mouseArea.bounds );
        }
        
        if ( hasMouseAreas ) {
          // transform it to the parent coordinate frame\
          this.transformBoundsFromLocalToParent( this._mouseBounds );
          
          // and include the normal bounds, so that we don't have to 
          this._mouseBounds.includeBounds( this._bounds );
        } else {
          this._mouseBounds = null; // no mouse areas under this node
        }
        
        this._mouseBoundsDirty = false;
      }
    },
    
    validateTouchBounds: function() {
      var that = this;
      
      sceneryAssert && sceneryAssert( !this._selfBoundsDirty && !this._childBoundsDirty && !this._boundsDirty, 'Bounds must be validated before calling validateTouchBounds' );
      
      if ( this._touchBoundsDirty ) {
        var hasTouchAreas = false;
        
        this._touchBounds = this._selfBounds.copy(); // start with the self bounds, then add from there
        
        // union of all children's touch bounds (if they exist)
        var i = this._children.length;
        while ( i-- ) {
          var child = this._children[i];
          child.validateTouchBounds();
          if ( child._touchBounds ) {
            hasTouchAreas = true;
            that._touchBounds.includeBounds( child._touchBounds );
          }
        }
        
        // do this before the transformation to the parent coordinate frame
        if ( this._touchArea ) {
          hasTouchAreas = true;
          this._touchBounds.includeBounds( this._touchArea.bounds );
        }
        
        if ( hasTouchAreas ) {
          // transform it to the parent coordinate frame
          this.transformBoundsFromLocalToParent( this._touchBounds );
          
          // and include the normal bounds, so that we don't have to 
          this._touchBounds.includeBounds( this._bounds );
        } else {
          this._touchBounds = null; // no touch areas under this node
        }
        
        this._touchBoundsDirty = false;
      }
    },
    
    validatePaint: function() {
      if ( this._paintDirty ) {
        sceneryAssert && sceneryAssert( this.isPainted(), 'Only painted nodes can have self dirty paint' );
        if ( !this._subtreePaintDirty ) {
          // if the subtree is clean, just notify the self (only will hit one layer, instead of possibly multiple ones)
          this.notifyDirtySelfPaint();
        }
        this._paintDirty = false;
      }
      
      if ( this._subtreePaintDirty ) {
        this.notifyDirtySubtreePaint();
        this._subtreePaintDirty = false;
      }
      
      // clear flags and recurse
      if ( this._childPaintDirty ) {
        this._childPaintDirty = false;
        
        var children = this._children;
        var length = children.length;
        for ( var i = 0; i < length; i++ ) {
          children[i].validatePaint();
        }
      }
    },
    
    // mark the bounds of this node as invalid, so it is recomputed before it is accessed again
    invalidateBounds: function() {
      this._boundsDirty = true;
      this._mouseBoundsDirty = true;
      this._touchBoundsDirty = true;
      
      // and set flags for all ancestors
      var i = this._parents.length;
      while ( i-- ) {
        this._parents[i].invalidateChildBounds();
      }
    },
    
    // recursively tag all ancestors with _childBoundsDirty
    invalidateChildBounds: function() {
      // don't bother updating if we've already been tagged
      if ( !this._childBoundsDirty ) {
        this._childBoundsDirty = true;
        this._mouseBoundsDirty = true;
        this._touchBoundsDirty = true;
        var i = this._parents.length;
        while ( i-- ) {
          this._parents[i].invalidateChildBounds();
        }
      }
    },
    
    // mark the paint of this node as invalid, so its new region will be painted
    invalidatePaint: function() {
      sceneryAssert && sceneryAssert( this.isPainted(), 'Can only call invalidatePaint on a painted node' );
      this._paintDirty = true;
      
      // and set flags for all ancestors
      var i = this._parents.length;
      while ( i-- ) {
        this._parents[i].invalidateChildPaint();
      }
    },
    
    invalidateSubtreePaint: function() {
      this._subtreePaintDirty = true;
      
      // and set flags for all ancestors
      var i = this._parents.length;
      while ( i-- ) {
        this._parents[i].invalidateChildPaint();
      }
    },
    
    // recursively tag all ancestors with _childPaintDirty
    invalidateChildPaint: function() {
      // don't bother updating if we've already been tagged
      if ( !this._childPaintDirty ) {
        this._childPaintDirty = true;
        var i = this._parents.length;
        while ( i-- ) {
          this._parents[i].invalidateChildPaint();
        }
      }
    },
    
    // called to notify that self rendering will display different paint, with possibly different bounds
    invalidateSelf: function( newBounds ) {
      sceneryAssert && sceneryAssert( newBounds.isEmpty() || newBounds.isFinite() , "Bounds must be empty or finite in invalidateSelf");
      
      // mark the old region to be repainted, regardless of whether the actual bounds change
      this.notifyBeforeSelfChange();
      
      // if these bounds are different than current self bounds
      if ( !this._selfBounds.equals( newBounds ) ) {
        // set repaint flags
        this._selfBoundsDirty = true;
        this.invalidateBounds();
        
        // record the new bounds
        this._selfBounds = newBounds;
      }
      
      this.invalidatePaint();
    },
    
    markOldSelfPaint: function() {
      this.notifyBeforeSelfChange();
    },
    
    // should be called whenever something triggers changes for how this node is layered
    markLayerRefreshNeeded: function() {
      this.markForLayerRefresh();
      this.notifyStitch( true );
    },
    
    // marks the last-rendered bounds of this node and optionally all of its descendants as needing a repaint
    markOldPaint: function( justSelf ) {
      // TODO: rearchitecture
      if ( justSelf ) {
        this.notifyBeforeSelfChange();
      } else {
        this.notifyBeforeSubtreeChange();
      }
    },
    
    isChild: function( potentialChild ) {
      var ourChild = _.contains( this._children, potentialChild );
      var itsParent = _.contains( potentialChild._parents, this );
      sceneryAssert && sceneryAssert( ourChild === itsParent );
      return ourChild;
    },
    
    // the bounds for self content in "local" coordinates.
    getSelfBounds: function() {
      return this._selfBounds;
    },
    
    getChildBounds: function() {
      this.validateBounds();
      return this._childBounds;
    },
    
    // the bounds for content in render(), in "parent" coordinates
    getBounds: function() {
      this.validateBounds();
      return this._bounds;
    },
    
    // like getBounds() in the "parent" coordinate frame, but includes only visible nodes
    getVisibleBounds: function() {
      // defensive copy, since we use mutable modifications below
      var bounds = this._selfBounds.copy();
      
      var i = this._children.length;
      while ( i-- ) {
        var child = this._children[i];
        if ( child.isVisible() ) {
          bounds.includeBounds( child.getVisibleBounds() );
        }
      }
      
      sceneryAssert && sceneryAssert( bounds.isFinite() || bounds.isEmpty(), 'Visible bounds should not be infinite' );
      return this.localToParentBounds( bounds );
    },
    
    trailUnderPointer: function( pointer ) {
      var options = {};
      if ( pointer.isMouse ) { options.isMouse = true; }
      if ( pointer.isTouch ) { options.isTouch = true; }
      if ( pointer.isPen ) { options.isPen = true; }
      
      return this.trailUnderPoint( pointer.point, options );
    },
    
    /*
     * Return a trail to the top node (if any, otherwise null) whose self-rendered area contains the
     * point (in parent coordinates).
     *
     * If options.pruneInvisible is false, invisible nodes will be allowed in the trail.
     * If options.pruneUnpickable is false, unpickable nodes will be allowed in the trail.
     */
    trailUnderPoint: function( point, options ) {
      sceneryAssert && sceneryAssert( point, 'trailUnderPointer requires a point' );
      
      if ( options === undefined ) { options = {}; }
      
      var pruneInvisible = ( options.pruneInvisible === undefined ) ? true : options.pruneInvisible;
      var pruneUnpickable = ( options.pruneUnpickable === undefined ) ? true : options.pruneUnpickable;
      
      if ( pruneInvisible && !this.isVisible() ) {
        return null;
      }
      if ( pruneUnpickable && !this.isPickable() ) {
        return null;
      }
      
      // update bounds for pruning
      this.validateBounds();
      if ( options.isMouse ) { this.validateMouseBounds(); }
      if ( options.isTouch ) { this.validateTouchBounds(); }
      
      var hasHitAreas = options && ( ( options.isMouse && this._mouseBounds ) || ( options.isTouch && this._touchBounds ) || options.isPen );
      
      // bail quickly if this doesn't hit our computed bounds
      if ( hasHitAreas ? (
            // if we have hit areas, prune based on the respective hit bounds (mouseBounds/touchBounds)
            ( options.isMouse && !this._mouseBounds.containsPoint( point ) ) ||
            ( options.isTouch && !this._touchBounds.containsPoint( point ) )
            // otherwise, prune based on the normal bounds
          ) : !this._bounds.containsPoint( point ) ) {
        return null; // not in our bounds, so this point can't possibly be contained
      }
      
      // point in the local coordinate frame. computed after the main bounds check, so we can bail out there efficiently
      var localPoint = this.parentToLocalPoint( point );
      
      // check children first, since they are rendered later
      if ( this._children.length > 0 && ( hasHitAreas || this._childBounds.containsPoint( localPoint ) ) ) {
        
        // manual iteration here so we can return directly, and so we can iterate backwards (last node is in front)
        for ( var i = this._children.length - 1; i >= 0; i-- ) {
          var child = this._children[i];
          
          var childHit = child.trailUnderPoint( localPoint, options );
          
          // the child will have the point in its parent's coordinate frame (i.e. this node's frame)
          if ( childHit ) {
            childHit.addAncestor( this, i );
            return childHit;
          }
        }
      }

      // tests for mouse and touch hit areas before testing containsPointSelf
      if ( hasHitAreas ) {
        if ( options.isMouse && this._mouseArea ) {
          return this._mouseArea.containsPoint( localPoint ) ? new scenery.Trail( this ) : null;
        }
        if ( ( options.isTouch || options.isPen ) && this._touchArea ) {
          return this._touchArea.containsPoint( localPoint ) ? new scenery.Trail( this ) : null;
        }
      }
      
      // didn't hit our children, so check ourself as a last resort
      if ( hasHitAreas || this._selfBounds.containsPoint( localPoint ) ) {
        if ( this.containsPointSelf( localPoint ) ) {
          return new scenery.Trail( this );
        }
      }
      
      // signal no hit
      return null;
    },
    
    // checking for whether a point (in parent coordinates) is contained in this sub-tree
    containsPoint: function( point ) {
      return this.trailUnderPoint( point ) !== null;
    },
    
    // override for computation of whether a point is inside the self content
    // point is considered to be in the local coordinate frame
    containsPointSelf: function( point ) {
      // if self bounds are not null default to checking self bounds
      return this._selfBounds.containsPoint( point );
    },
    
    // whether this node's self intersects the specified bounds, in the local coordinate frame
    intersectsBoundsSelf: function( bounds ) {
      // if self bounds are not null, child should override this
      return this._selfBounds.intersectsBounds( bounds );
    },
    
    isPainted: function() {
      return false;
    },
    
    hasParent: function() {
      return this._parents.length !== 0;
    },
    
    hasChildren: function() {
      return this._children.length > 0;
    },
    
    walkDepthFirst: function( callback ) {
      callback( this );
      var length = this._children.length;
      for ( var i = 0; i < length; i++ ) {
        this._children[i].walkDepthFirst( callback );
      }
    },
    
    getChildrenWithinBounds: function( bounds ) {
      var result = [];
      var length = this._children.length;
      for ( var i = 0; i < length; i++ ) {
        var child = this._children[i];
        if ( !child._bounds.intersection( bounds ).isEmpty() ) {
          result.push( child );
        }
      }
      return result;
    },
    
    // TODO: set this up with a mix-in for a generic notifier?
    addInputListener: function( listener ) {
      // don't allow listeners to be added multiple times
      if ( _.indexOf( this._inputListeners, listener ) === -1 ) {
        this._inputListeners.push( listener );
      }
      return this;
    },
    
    removeInputListener: function( listener ) {
      // ensure the listener is in our list
      sceneryAssert && sceneryAssert( _.indexOf( this._inputListeners, listener ) !== -1 );
      
      this._inputListeners.splice( _.indexOf( this._inputListeners, listener ), 1 );
      return this;
    },
    
    getInputListeners: function() {
      return this._inputListeners.slice( 0 ); // defensive copy
    },
    
    /*
     * Dispatches an event across all possible Trails ending in this node.
     *
     * For example, if the scene has two children A and B, and both of those nodes have X as a child,
     * dispatching an event on X will fire the event with the following trails:
     * on X     with trail [ X ]
     * on A     with trail [ A, X ]
     * on scene with trail [ scene, A, X ]
     * on B     with trail [ B, X ]
     * on scene with trail [ scene, B, X ]
     *
     * This allows you to add a listener on any node to get notifications for all of the trails that the
     * event is relevant for (e.g. marks dirty paint region for both places X was on the scene).
     */
    dispatchEvent: function( type, args ) {
      sceneryEventLog && sceneryEventLog( this.constructor.name + '.dispatchEvent ' + type );
      var trail = new scenery.Trail();
      trail.setMutable(); // don't allow this trail to be set as immutable for storage
      args.trail = trail; // this reference shouldn't be changed be listeners (or errors will occur)
      
      // store a branching flag, since if we don't branch at all, we don't have to walk our trail back down.
      var branches = false;
      
      function recursiveEventDispatch( node ) {
        trail.addAncestor( node );
        
        node.fireEvent( type, args );
        
        var parents = node._parents;
        var length = parents.length;
        
        // make sure to set the branch flag here before iterating (don't move it)
        branches = branches || length > 1;
        
        for ( var i = 0; i < length; i++ ) {
          recursiveEventDispatch( parents[i] );
        }
        
        // if there were no branches, we will not fire another listener once we have reached here
        if ( branches ) {
          trail.removeAncestor();
        }
      }
      
      recursiveEventDispatch( this );
    },
    
    // TODO: consider renaming to translateBy to match scaleBy
    translate: function( x, y, prependInstead ) {
      if ( typeof x === 'number' ) {
        // translate( x, y, prependInstead )
        if ( !x && !y ) { return; } // bail out if both are zero
        if ( prependInstead ) {
          this.prependTranslation(x,y);
        } else {
          this.appendMatrix( Matrix3.translation( x, y ) );
        }
      } else {
        // translate( vector, prependInstead )
        var vector = x;
        if ( !vector.x && !vector.y ) { return; } // bail out if both are zero
        this.translate( vector.x, vector.y, y ); // forward to full version
      }
    },
    
    // scale( s ) is also supported, which will scale both dimensions by the same amount. renamed from 'scale' to satisfy the setter/getter
    scale: function( x, y, prependInstead ) {
      if ( typeof x === 'number' ) {
        if ( y === undefined ) {
          // scale( scale )
          if ( x === 1 ) { return; } // bail out if we are scaling by 1 (identity)
          this.appendMatrix( Matrix3.scaling( x, x ) );
        } else {
          // scale( x, y, prependInstead )
          if ( x === 1 && y === 1 ) { return; } // bail out if we are scaling by 1 (identity)
          if ( prependInstead ) {
            this.prependMatrix( Matrix3.scaling( x, y ) );
          } else {
            this.appendMatrix( Matrix3.scaling( x, y ) );
          }
        }
      } else {
        // scale( vector, prependInstead ) or scale( { x: x, y: y }, prependInstead )
        var vector = x;
        this.scale( vector.x, vector.y, y ); // forward to full version
      }
    },
    
    // TODO: consider naming to rotateBy to match scaleBy (due to scale property / method name conflict)
    rotate: function( angle, prependInstead ) {
      if ( angle % ( 2 * Math.PI ) === 0 ) { return; } // bail out if our angle is effectively 0
      if ( prependInstead ) {
        this.prependMatrix( Matrix3.rotation2( angle ) );
      } else {
        this.appendMatrix( Matrix3.rotation2( angle ) );
      }
    },
    
    // point should be in the parent coordinate frame
    // TODO: determine whether this should use the appendMatrix method
    rotateAround: function( point, angle ) {
      var matrix = Matrix3.translation( -point.x, -point.y );
      matrix = Matrix3.rotation2( angle ).timesMatrix( matrix );
      matrix = Matrix3.translation( point.x, point.y ).timesMatrix( matrix );
      this.prependMatrix( matrix );
    },
    
    getX: function() {
      return this.getTranslation().x;
    },
    
    setX: function( x ) {
      sceneryAssert && sceneryAssert( typeof x === 'number' );
      
      this.setTranslation( x, this.getY() );
      return this;
    },
    
    getY: function() {
      return this.getTranslation().y;
    },
    
    setY: function( y ) {
      sceneryAssert && sceneryAssert( typeof y === 'number' );
      
      this.setTranslation( this.getX(), y );
      return this;
    },
    
    // returns a vector with an entry for each axis, e.g. (5,2) for an Affine-style matrix with rows ((5,0,0),(0,2,0),(0,0,1))
    getScaleVector: function() {
      return this._transform.getMatrix().getScaleVector();
    },
    
    // supports setScaleMagnitude( 5 ) for both dimensions, setScaleMagnitude( 5, 3 ) for each dimension separately, or setScaleMagnitude( new Vector2( x, y ) )
    setScaleMagnitude: function( a, b ) {
      var currentScale = this.getScaleVector();
      
      if ( typeof a === 'number' ) {
        if ( b === undefined ) {
          // to map setScaleMagnitude( scale ) => setScaleMagnitude( scale, scale )
          b = a;
        }
        // setScaleMagnitude( x, y )
        this.appendMatrix( Matrix3.scaling( a / currentScale.x, b / currentScale.y ) );
      } else {
        // setScaleMagnitude( vector ), where we set the x-scale to vector.x and y-scale to vector.y
        this.appendMatrix( Matrix3.scaling( a.x / currentScale.x, a.y / currentScale.y ) );
      }
      return this;
    },
    
    getRotation: function() {
      return this._transform.getMatrix().getRotation();
    },
    
    setRotation: function( rotation ) {
      sceneryAssert && sceneryAssert( typeof rotation === 'number' );
      
      this.appendMatrix( Matrix3.rotation2( rotation - this.getRotation() ) );
      return this;
    },
    
    // supports setTranslation( x, y ) or setTranslation( new Vector2( x, y ) ) .. or technically setTranslation( { x: x, y: y } )
    setTranslation: function( a, b ) {
      var m = this._transform.getMatrix();
      var tx = m.m02();
      var ty = m.m12();

      var dx, dy;
      
      if ( typeof a === 'number' ) {
        dx = a - tx;
        dy = b - ty;
      } else {
        dx = a.x - tx;
        dy = a.y - ty;
      }
      
      this.translate( dx, dy, true );
      
      return this;
    },
    
    getTranslation: function() {
      return this._transform.getMatrix().getTranslation();
    },
    
    // append a transformation matrix to our local transform
    appendMatrix: function( matrix ) {
      this._transform.append( matrix );
    },
    
    // prepend a transformation matrix to our local transform
    prependMatrix: function( matrix ) {
      this._transform.prepend( matrix );
    },

    // prepend an x,y translation to our local transform without allocating a matrix for it, see #119
    prependTranslation: function( x,y ) {
      this._transform.prependTranslation( x,y );
    },
    
    setMatrix: function( matrix ) {
      this._transform.set( matrix );
    },
    
    getMatrix: function() {
      return this._transform.getMatrix();
    },
    
    // change the actual transform reference (not just the actual transform)
    setTransform: function( transform ) {
      sceneryAssert && sceneryAssert( transform.isFinite(), 'Transform should not have infinite/NaN values' );
      
      if ( this._transform !== transform ) {
        // since our referenced transform doesn't change, we need to trigger the before/after ourselves
        this.beforeTransformChange();
        
        // swap the transform and move the listener to the new one
        this._transform.removeTransformListener( this._transformListener ); // don't leak memory!
        this._transform = transform;
        this._transform.prependTransformListener( this._transformListener );
        
        this.afterTransformChange();
      }
    },
    
    getTransform: function() {
      // for now, return an actual copy. we can consider listening to changes in the future
      return this._transform;
    },
    
    resetTransform: function() {
      this.setMatrix( Matrix3.IDENTITY );
    },
    
    // called before our transform is changed
    beforeTransformChange: function() {
      // mark our old bounds as dirty, so that any dirty region repainting will include not just our new position, but also our old position
      this.notifyBeforeSubtreeChange();
    },
    
    // called after our transform is changed
    afterTransformChange: function() {
      this.notifyTransformChange();
      
      this.invalidateBounds();
      this.invalidateSubtreePaint();
    },
    
    // the left bound of this node, in the parent coordinate frame
    getLeft: function() {
      return this.getBounds().minX;
    },
    
    // shifts this node horizontally so that its left bound (in the parent coordinate frame) is 'left'
    setLeft: function( left ) {
      sceneryAssert && sceneryAssert( typeof left === 'number' );
      
      this.translate( left - this.getLeft(), 0, true );
      return this; // allow chaining
    },
    
    // the right bound of this node, in the parent coordinate frame
    getRight: function() {
      return this.getBounds().maxX;
    },
    
    // shifts this node horizontally so that its right bound (in the parent coordinate frame) is 'right'
    setRight: function( right ) {
      sceneryAssert && sceneryAssert( typeof right === 'number' );
      
      this.translate( right - this.getRight(), 0, true );
      return this; // allow chaining
    },
    
    getCenter: function() {
      return this.getBounds().getCenter();
    },
    
    setCenter: function( center ) {
      sceneryAssert && sceneryAssert( center instanceof Vector2 );
      
      this.translate( center.minus( this.getCenter() ), true );
      return this;
    },
    
    getCenterX: function() {
      return this.getBounds().getCenterX();
    },
    
    setCenterX: function( x ) {
      sceneryAssert && sceneryAssert( typeof x === 'number' );
      
      this.translate( x - this.getCenterX(), 0, true );
      return this; // allow chaining
    },
    
    getCenterY: function() {
      return this.getBounds().getCenterY();
    },
    
    setCenterY: function( y ) {
      sceneryAssert && sceneryAssert( typeof y === 'number' );
      
      this.translate( 0, y - this.getCenterY(), true );
      return this; // allow chaining
    },
    
    // the top bound of this node, in the parent coordinate frame
    getTop: function() {
      return this.getBounds().minY;
    },
    
    // shifts this node vertically so that its top bound (in the parent coordinate frame) is 'top'
    setTop: function( top ) {
      sceneryAssert && sceneryAssert( typeof top === 'number' );
      
      this.translate( 0, top - this.getTop(), true );
      return this; // allow chaining
    },
    
    // the bottom bound of this node, in the parent coordinate frame
    getBottom: function() {
      return this.getBounds().maxY;
    },
    
    // shifts this node vertically so that its bottom bound (in the parent coordinate frame) is 'bottom'
    setBottom: function( bottom ) {
      sceneryAssert && sceneryAssert( typeof bottom === 'number' );
      
      this.translate( 0, bottom - this.getBottom(), true );
      return this; // allow chaining
    },
    
    getWidth: function() {
      return this.getBounds().getWidth();
    },
    
    getHeight: function() {
      return this.getBounds().getHeight();
    },
    
    getId: function() {
      return this._id;
    },
    
    isVisible: function() {
      return this._visible;
    },
    
    setVisible: function( visible ) {
      sceneryAssert && sceneryAssert( typeof visible === 'boolean' );
      
      if ( visible !== this._visible ) {
        if ( this._visible ) {
          this.notifyBeforeSubtreeChange();
        }
        
        this._visible = visible;
        
        this.notifyVisibilityChange();
      }
      return this;
    },
    
    getOpacity: function() {
      return this._opacity;
    },
    
    setOpacity: function( opacity ) {
      sceneryAssert && sceneryAssert( typeof opacity === 'number' );
      
      var clampedOpacity = clamp( opacity, 0, 1 );
      if ( clampedOpacity !== this._opacity ) {
        this.notifyBeforeSubtreeChange();
        
        this._opacity = clampedOpacity;
        
        this.notifyOpacityChange();
      }
    },
    
    isPickable: function() {
      return this._pickable;
    },
    
    setPickable: function( pickable ) {
      sceneryAssert && sceneryAssert( typeof pickable === 'boolean' );
      
      if ( this._pickable !== pickable ) {
        // no paint or invalidation changes for now, since this is only handled for the mouse
        this._pickable = pickable;
        
        // TODO: invalidate the cursor somehow?
      }
    },
    
    setCursor: function( cursor ) {
      sceneryAssert && sceneryAssert( typeof cursor === 'string' || cursor === null );
      
      // TODO: consider a mapping of types to set reasonable defaults
      /*
      auto default none inherit help pointer progress wait crosshair text vertical-text alias copy move no-drop not-allowed
      e-resize n-resize w-resize s-resize nw-resize ne-resize se-resize sw-resize ew-resize ns-resize nesw-resize nwse-resize
      context-menu cell col-resize row-resize all-scroll url( ... ) --> does it support data URLs?
       */
      
      // allow the 'auto' cursor type to let the ancestors or scene pick the cursor type
      this._cursor = cursor === "auto" ? null : cursor;
    },
    
    getCursor: function() {
      return this._cursor;
    },
    
    setMouseArea: function( shape ) {
      sceneryAssert && sceneryAssert( shape === null || shape instanceof Shape, 'mouseArea needs to be a kite.Shape, or null' );
      
      if ( this._mouseArea !== shape ) {
        this._mouseArea = shape; // TODO: could change what is under the mouse, invalidate!
        
        this.invalidateBounds();
      }
    },
    
    getMouseArea: function() {
      return this._mouseArea;
    },
    
    setTouchArea: function( shape ) {
      sceneryAssert && sceneryAssert( shape === null || shape instanceof Shape, 'touchArea needs to be a kite.Shape, or null' );
      
      if ( this._touchArea !== shape ) {
        this._touchArea = shape; // TODO: could change what is under the touch, invalidate!
        
        this.invalidateBounds();
      }
    },
    
    getTouchArea: function() {
      return this._touchArea;
    },
    
    updateLayerType: function() {
      if ( this._renderer && this._rendererOptions ) {
        // TODO: factor this check out! Make RendererOptions its own class?
        // TODO: FIXME: support undoing this!
        // ensure that if we are passing a CSS transform, we pass this node as the baseNode
        if ( this._rendererOptions.cssTransform || this._rendererOptions.cssTranslation || this._rendererOptions.cssRotation || this._rendererOptions.cssScale ) {
          this._rendererOptions.baseNode = this;
        } else if ( this._rendererOptions.hasOwnProperty( 'baseNode' ) ) {
          delete this._rendererOptions.baseNode; // don't override, let the scene pass in the scene
        }
        // if we set renderer and rendererOptions, only then do we want to trigger a specific layer type
        this._rendererLayerType = this._renderer.createLayerType( this._rendererOptions );
      } else {
        this._rendererLayerType = null; // nothing signaled, since we want to support multiple layer types (including if we specify a renderer)
      }
    },
    
    getRendererLayerType: function() {
      return this._rendererLayerType;
    },
    
    hasRendererLayerType: function() {
      return !!this._rendererLayerType;
    },
    
    setRenderer: function( renderer ) {
      var newRenderer;
      if ( typeof renderer === 'string' ) {
        sceneryAssert && sceneryAssert( scenery.Renderer[renderer], 'unknown renderer in setRenderer: ' + renderer );
        newRenderer = scenery.Renderer[renderer];
      } else if ( renderer instanceof scenery.Renderer ) {
        newRenderer = renderer;
      } else if ( !renderer ) {
        newRenderer = null;
      } else {
        throw new Error( 'unrecognized type of renderer: ' + renderer );
      }
      if ( newRenderer !== this._renderer ) {
        sceneryAssert && sceneryAssert( !this.isPainted() || !newRenderer || _.contains( this._supportedRenderers, newRenderer ), 'renderer ' + newRenderer + ' not supported by ' + this.constructor.name );
        this._renderer = newRenderer;
        
        this.updateLayerType();
        this.markLayerRefreshNeeded();
      }
    },
    
    getRenderer: function() {
      return this._renderer;
    },
    
    hasRenderer: function() {
      return !!this._renderer;
    },
    
    setRendererOptions: function( options ) {
      // TODO: consider checking options based on the specified 'renderer'?
      this._rendererOptions = options;
      
      this.updateLayerType();
      this.markLayerRefreshNeeded();
    },
    
    getRendererOptions: function() {
      return this._rendererOptions;
    },
    
    hasRendererOptions: function() {
      return !!this._rendererOptions;
    },
    
    setLayerSplitBefore: function( split ) {
      sceneryAssert && sceneryAssert( typeof split === 'boolean' );
      
      if ( this._layerSplitBefore !== split ) {
        this._layerSplitBefore = split;
        this.markLayerRefreshNeeded();
      }
    },
    
    isLayerSplitBefore: function() {
      return this._layerSplitBefore;
    },
    
    setLayerSplitAfter: function( split ) {
      sceneryAssert && sceneryAssert( typeof split === 'boolean' );
      
      if ( this._layerSplitAfter !== split ) {
        this._layerSplitAfter = split;
        this.markLayerRefreshNeeded();
      }
    },
    
    isLayerSplitAfter: function() {
      return this._layerSplitAfter;
    },
    
    setLayerSplit: function( split ) {
      sceneryAssert && sceneryAssert( typeof split === 'boolean' );
      
      if ( split !== this._layerSplitBefore || split !== this._layerSplitAfter ) {
        this._layerSplitBefore = split;
        this._layerSplitAfter = split;
        this.markLayerRefreshNeeded();
      }
    },
    
    // returns a unique trail (if it exists) where each node in the ancestor chain has 0 or 1 parents
    getUniqueTrail: function() {
      var trail = new scenery.Trail();
      var node = this;
      
      while ( node ) {
        trail.addAncestor( node );
        sceneryAssert && sceneryAssert( node._parents.length <= 1 );
        node = node._parents[0]; // should be undefined if there aren't any parents
      }
      
      return trail;
    },
    
    // all nodes in the connected component, returned in an arbitrary order
    getConnectedNodes: function() {
      var result = [];
      var fresh = this._children.concat( this._parents ).concat( this );
      while ( fresh.length ) {
        var node = fresh.pop();
        if ( !_.contains( result, node ) ) {
          result.push( node );
          fresh = fresh.concat( node._children, node._parents );
        }
      }
      return result;
    },
    
    getTopologicallySortedNodes: function() {
      // see http://en.wikipedia.org/wiki/Topological_sorting
      var edges = {};
      var s = [];
      var l = [];
      var n;
      _.each( this.getConnectedNodes(), function( node ) {
        edges[node.id] = {};
        _.each( node.children, function( m ) {
          edges[node.id][m.id] = true;
        } );
        if ( !node.parents.length ) {
          s.push( node );
        }
      } );
      function handleChild( m ) {
        delete edges[n.id][m.id];
        if ( _.every( edges, function( children ) { return !children[m.id]; } ) ) {
          // there are no more edges to m
          s.push( m );
        }
      }
      
      while ( s.length ) {
        n = s.pop();
        l.push( n );
        
        _.each( n.children, handleChild );
      }
      
      // ensure that there are no edges left, since then it would contain a circular reference
      sceneryAssert && sceneryAssert( _.every( edges, function( children ) {
        return _.every( children, function( final ) { return false; } );
      } ), 'circular reference check' );
      
      return l;
    },
    
    // verify that this.addChild( child ) it wouldn't cause circular references
    canAddChild: function( child ) {
      if ( this === child || _.contains( this.children, child ) ) {
        return false;
      }
      
      // see http://en.wikipedia.org/wiki/Topological_sorting
      // TODO: remove duplication with above handling?
      var edges = {};
      var s = [];
      var l = [];
      var n;
      _.each( this.getConnectedNodes().concat( child.getConnectedNodes() ), function( node ) {
        edges[node.id] = {};
        _.each( node.children, function( m ) {
          edges[node.id][m.id] = true;
        } );
        if ( !node.parents.length && node !== child ) {
          s.push( node );
        }
      } );
      edges[this.id][child.id] = true; // add in our 'new' edge
      function handleChild( m ) {
        delete edges[n.id][m.id];
        if ( _.every( edges, function( children ) { return !children[m.id]; } ) ) {
          // there are no more edges to m
          s.push( m );
        }
      }
      
      while ( s.length ) {
        n = s.pop();
        l.push( n );
        
        _.each( n.children, handleChild );
        
        // handle our new edge
        if ( n === this ) {
          handleChild( child );
        }
      }
      
      // ensure that there are no edges left, since then it would contain a circular reference
      return _.every( edges, function( children ) {
        return _.every( children, function( final ) { return false; } );
      } );
    },
    
    debugText: function() {
      var startPointer = new scenery.TrailPointer( new scenery.Trail( this ), true );
      var endPointer = new scenery.TrailPointer( new scenery.Trail( this ), false );
      
      var depth = 0;
      
      startPointer.depthFirstUntil( endPointer, function( pointer ) {
        if ( pointer.isBefore ) {
          // hackish way of multiplying a string
          var padding = new Array( depth * 2 ).join( ' ' );
          console.log( padding + pointer.trail.lastNode().getId() + ' ' + pointer.trail.toString() );
        }
        depth += pointer.isBefore ? 1 : -1;
      }, false );
    },
    
    /*
     * Renders this node to a canvas. If toCanvas( callback ) is used, the canvas will contain the node's
     * entire bounds.
     *
     * callback( canvas, x, y ) is called, where x and y offsets are computed if not specified.
     */
    toCanvas: function( callback, x, y, width, height ) {
      var self = this;
      
      var padding = 2; // padding used if x and y are not set
      
      var bounds = this.getBounds();
      x = x !== undefined ? x : Math.ceil( padding - bounds.minX );
      y = y !== undefined ? y : Math.ceil( padding - bounds.minY );
      width = width !== undefined ? width : Math.ceil( x + bounds.getWidth() + padding );
      height = height !== undefined ? height : Math.ceil( y + bounds.getHeight() + padding );
      
      var canvas = document.createElement( 'canvas' );
      canvas.width = width;
      canvas.height = height;
      var context = canvas.getContext( '2d' );
      
      var $div = $( document.createElement( 'div' ) );
      $div.width( width ).height( height );
      var scene = new scenery.Scene( $div );
      
      scene.addChild( self );
      scene.x = x;
      scene.y = y;
      scene.updateScene();
      
      scene.renderToCanvas( canvas, context, function() {
        callback( canvas, x, y );
        
        // let us be garbage collected
        scene.removeChild( self );
      } );
    },
    
    // gives a data URI, with the same parameter handling as Node.toCanvas()
    toDataURL: function( callback, x, y, width, height ) {
      this.toCanvas( function( canvas, x, y ) {
        // this x and y shadow the outside parameters, and will be different if the outside parameters are undefined
        callback( canvas.toDataURL(), x, y );
      }, x, y, width, height );
    },
    
    // gives an HTMLImageElement with the same parameter handling as Node.toCanvas(). guaranteed to be asynchronous
    toImage: function( callback, x, y, width, height ) {
      this.toDataURL( function( url, x, y ) {
        // this x and y shadow the outside parameters, and will be different if the outside parameters are undefined
        var img = document.createElement( 'img' );
        img.onload = function() {
          callback( img, x, y );
          try {
            delete img.onload;
          } catch ( e ) {} // fails on Safari 5.1
        };
        img.src = url;
      }, x, y, width, height );
    },
    
    // will call callback( node )
    toImageNodeAsynchronous: function( callback, x, y, width, height ) {
      this.toImage( function( image, x, y ) {
        callback( new scenery.Node( { children: [
          new scenery.Image( image, { x: -x, y: -y } )
        ] } ) );
      }, x, y, width, height );
    },
    
    // fully synchronous, but returns a node that can only be rendered in Canvas
    toCanvasNodeSynchronous: function( x, y, width, height ) {
      var result;
      this.toCanvas( function( canvas, x, y ) {
        result = new scenery.Node( { children: [
          new scenery.Image( canvas, { x: -x, y: -y } )
        ] } );
      }, x, y, width, height );
      sceneryAssert && sceneryAssert( result, 'toCanvasNodeSynchronous requires that the node can be rendered only using Canvas' );
      return result;
    },
    
    // synchronous, but Image will not have the correct bounds immediately (that will be asynchronous)
    toDataURLNodeSynchronous: function( x, y, width, height ) {
      var result;
      this.toDataURL( function( dataURL, x, y ) {
        result = new scenery.Node( { children: [
          new scenery.Image( dataURL, { x: -x, y: -y } )
        ] } );
      }, x, y, width, height );
      sceneryAssert && sceneryAssert( result, 'toDataURLNodeSynchronous requires that the node can be rendered only using Canvas' );
      return result;
    },
    
    /*---------------------------------------------------------------------------*
    * Instance handling
    *----------------------------------------------------------------------------*/
    
    getInstances: function() {
      return this._instances;
    },
    
    addInstance: function( instance ) {
      sceneryAssert && sceneryAssert( instance.getNode() === this, 'Must be an instance of this Node' );
      sceneryAssert && sceneryAssert( !_.find( this._instances, function( other ) { return instance.equals( other ); } ), 'Cannot add duplicates of an instance to a Node' );
      this._instances.push( instance );
      if ( this._instances.length === 1 ) {
        this.firstInstanceAdded();
      }
    },
    
    firstInstanceAdded: function() {
      // no-op, meant to be overridden in the prototype chain
    },
    
    // returns undefined if there is no instance.
    getInstanceFromTrail: function( trail ) {
      var result;
      var len = this._instances.length;
      if ( len === 1 ) {
        // don't bother with checking the trail, but assertion should assure that it's what we're looking for
        result = this._instances[0];
      } else {
        var i = len;
        while ( i-- ) {
          if ( this._instances[i].trail.equals( trail ) ) {
            result = this._instances[i];
            break;
          }
        }
        // leave it as undefined if we don't find one
      }
      sceneryAssert && sceneryAssert( result, 'Could not find an instance for the trail ' + trail.toString() );
      sceneryAssert && sceneryAssert( result.trail.equals( trail ), 'Instance has an incorrect Trail' );
      return result;
    },
    
    removeInstance: function( instance ) {
      var index = _.indexOf( this._instances, instance ); // actual instance equality (NOT capitalized, normal meaning)
      sceneryAssert && sceneryAssert( index !== -1, 'Cannot remove an Instance from a Node if it was not there' );
      this._instances.splice( index, 1 );
      if ( this._instances.length === 0 ) {
        this.lastInstanceRemoved();
      }
    },
    
    lastInstanceRemoved: function() {
      // no-op, meant to be overridden in the prototype chain
    },
    
    notifyVisibilityChange: function() {
      var i = this._instances.length;
      while ( i-- ) {
        this._instances[i].notifyVisibilityChange();
      }
    },
    
    notifyOpacityChange: function() {
      var i = this._instances.length;
      while ( i-- ) {
        this._instances[i].notifyOpacityChange();
      }
    },
    
    notifyBeforeSelfChange: function() {
      var i = this._instances.length;
      while ( i-- ) {
        this._instances[i].notifyBeforeSelfChange();
      }
    },
    
    notifyBeforeSubtreeChange: function() {
      var i = this._instances.length;
      while ( i-- ) {
        this._instances[i].notifyBeforeSubtreeChange();
      }
    },
    
    notifyDirtySelfPaint: function() {
      var i = this._instances.length;
      while ( i-- ) {
        this._instances[i].notifyDirtySelfPaint();
      }
    },
    
    notifyDirtySubtreePaint: function() {
      var i = this._instances.length;
      while ( i-- ) {
        this._instances[i].notifyDirtySubtreePaint();
      }
    },
    
    notifyTransformChange: function() {
      var i = this._instances.length;
      while ( i-- ) {
        this._instances[i].notifyTransformChange();
      }
    },
    
    notifyBoundsAccuracyChange: function() {
      var i = this._instances.length;
      while ( i-- ) {
        this._instances[i].notifyBoundsAccuracyChange();
      }
    },
    
    notifyStitch: function( match ) {
      var i = this._instances.length;
      while ( i-- ) {
        this._instances[i].notifyStitch( match );
      }
    },
    
    markForLayerRefresh: function() {
      var i = this._instances.length;
      while ( i-- ) {
        this._instances[i].markForLayerRefresh();
      }
    },
    
    markForInsertion: function( child, index ) {
      var i = this._instances.length;
      while ( i-- ) {
        this._instances[i].markForInsertion( child, index );
      }
    },
    
    markForRemoval: function( child, index ) {
      var i = this._instances.length;
      while ( i-- ) {
        this._instances[i].markForRemoval( child, index );
      }
    },
    
    /*---------------------------------------------------------------------------*
    * Coordinate transform methods
    *----------------------------------------------------------------------------*/
    
    // apply this node's transform to the point
    localToParentPoint: function( point ) {
      return this._transform.transformPosition2( point );
    },
    
    // apply this node's transform to the bounds
    localToParentBounds: function( bounds ) {
      return this._transform.transformBounds2( bounds );
    },
    
    // apply the inverse of this node's transform to the point
    parentToLocalPoint: function( point ) {
      return this._transform.inversePosition2( point );
    },
    
    // apply the inverse of this node's transform to the bounds
    parentToLocalBounds: function( bounds ) {
      return this._transform.inverseBounds2( bounds );
    },
    
    // mutable optimized form of localToParentBounds
    transformBoundsFromLocalToParent: function( bounds ) {
      return bounds.transform( this._transform.getMatrix() );
    },
    
    // returns the matrix (fresh copy) that transforms points from the local coordinate frame into the global coordinate frame
    getLocalToGlobalMatrix: function() {
      var node = this;
      
      // we need to apply the transformations in the reverse order, so we temporarily store them
      var matrices = [];
      
      // concatenation like this has been faster than getting a unique trail, getting its transform, and applying it
      while ( node ) {
        matrices.push( node._transform.getMatrix() );
        sceneryAssert && sceneryAssert( node._parents[1] === undefined, 'getLocalToGlobalMatrix unable to work for DAG' );
        node = node._parents[0];
      }
      
      var matrix = new Matrix3(); // will be modified in place
      
      // iterate from the back forwards (from the root node to here)
      for ( var i = matrices.length - 1; i >=0; i-- ) {
        matrix.multiplyMatrix( matrices[i] );
      }
      
      // NOTE: always return a fresh copy, getGlobalToLocalMatrix depends on it to minimize instance usage!
      return matrix;
    },
    
    // equivalent to getUniqueTrail().getTransform(), but faster.
    getUniqueTransform: function() {
      return new Transform3( this.getLocalToGlobalMatrix() );
    },
    
    // returns the matrix (fresh copy) that transforms points in the global coordinate frame into the local coordinate frame
    getGlobalToLocalMatrix: function() {
      return this.getLocalToGlobalMatrix().invert();
    },
    
    // apply this node's transform (and then all of its parents' transforms) to the point
    localToGlobalPoint: function( point ) {
      var node = this;
      var resultPoint = point.copy();
      while ( node ) {
        // in-place multiplication
        node._transform.getMatrix().multiplyVector2( resultPoint );
        sceneryAssert && sceneryAssert( node._parents[1] === undefined, 'localToGlobalPoint unable to work for DAG' );
        node = node._parents[0];
      }
      return resultPoint;
    },
    
    globalToLocalPoint: function( point ) {
      var node = this;
      // TODO: performance: test whether it is faster to get a total transform and then invert (won't compute individual inverses)
      
      // we need to apply the transformations in the reverse order, so we temporarily store them
      var transforms = [];
      while ( node ) {
        transforms.push( node._transform );
        sceneryAssert && sceneryAssert( node._parents[1] === undefined, 'globalToLocalPoint unable to work for DAG' );
        node = node._parents[0];
      }
      
      // iterate from the back forwards (from the root node to here)
      var resultPoint = point.copy();
      for ( var i = transforms.length - 1; i >=0; i-- ) {
        // in-place multiplication
        transforms[i].getInverse().multiplyVector2( resultPoint );
      }
      return resultPoint;
    },
    
    // apply this node's transform (and then all of its parents' transforms) to the bounds
    localToGlobalBounds: function( bounds ) {
      // apply the bounds transform only once, so we can minimize the expansion encountered from multiple rotations
      // it also seems to be a bit faster this way
      return bounds.transformed( this.getLocalToGlobalMatrix() );
    },
    
    globalToLocalBounds: function( bounds ) {
      // apply the bounds transform only once, so we can minimize the expansion encountered from multiple rotations
      return bounds.transformed( this.getGlobalToLocalMatrix() );
    },
    
    // like localToGlobalPoint, but without applying this node's transform
    parentToGlobalPoint: function( point ) {
      sceneryAssert && sceneryAssert( this.parents.length <= 1, 'parentToGlobalPoint unable to work for DAG' );
      return this.parents.length ? this.parents[0].localToGlobalPoint( point ) : point;
    },
    
    // like localToGlobalBounds, but without applying this node's transform
    parentToGlobalBounds: function( bounds ) {
      sceneryAssert && sceneryAssert( this.parents.length <= 1, 'parentToGlobalBounds unable to work for DAG' );
      return this.parents.length ? this.parents[0].localToGlobalBounds( bounds ) : bounds;
    },
    
    globalToParentPoint: function( point ) {
      sceneryAssert && sceneryAssert( this.parents.length <= 1, 'globalToParentPoint unable to work for DAG' );
      return this.parents.length ? this.parents[0].globalToLocalPoint( point ) : point;
    },
    
    globalToParentBounds: function( bounds ) {
      sceneryAssert && sceneryAssert( this.parents.length <= 1, 'globalToParentBounds unable to work for DAG' );
      return this.parents.length ? this.parents[0].globalToLocalBounds( bounds ) : bounds;
    },
    
    // get the Bounds2 of this node in the global coordinate frame.  Does not work for DAG.
    getGlobalBounds: function() {
      sceneryAssert && sceneryAssert( this.parents.length <= 1, 'globalBounds unable to work for DAG' );
      return this.parentToGlobalBounds( this.getBounds() );
    },
    
    // get the Bounds2 of any other node by converting to the global coordinate frame.  Does not work for DAG.
    boundsOf: function( node ) {
      return this.globalToLocalBounds( node.getGlobalBounds() );
    },
    
    // get the Bounds2 of this node in the coordinate frame of the parameter node. Does not work for DAG cases.
    boundsTo: function( node ) {
      return node.globalToLocalBounds( this.getGlobalBounds() );
    },
    
    /*---------------------------------------------------------------------------*
    * ES5 get/set
    *----------------------------------------------------------------------------*/
    
    set layerSplit( value ) { this.setLayerSplit( value ); },
    get layerSplit() { throw new Error( 'You can\'t get a layerSplit property, since it modifies two separate properties' ); },
    
    set layerSplitBefore( value ) { this.setLayerSplitBefore( value ); },
    get layerSplitBefore() { return this.isLayerSplitBefore(); },
    
    set layerSplitAfter( value ) { this.setLayerSplitAfter( value ); },
    get layerSplitAfter() { return this.isLayerSplitAfter(); },
    
    set renderer( value ) { this.setRenderer( value ); },
    get renderer() { return this.getRenderer(); },
    
    set rendererOptions( value ) { this.setRendererOptions( value ); },
    get rendererOptions() { return this.getRendererOptions(); },
    
    set cursor( value ) { this.setCursor( value ); },
    get cursor() { return this.getCursor(); },
    
    set mouseArea( value ) { this.setMouseArea( value ); },
    get mouseArea() { return this.getMouseArea(); },
    
    set touchArea( value ) { this.setTouchArea( value ); },
    get touchArea() { return this.getTouchArea(); },
    
    set visible( value ) { this.setVisible( value ); },
    get visible() { return this.isVisible(); },
    
    set opacity( value ) { this.setOpacity( value ); },
    get opacity() { return this.getOpacity(); },
    
    set pickable( value ) { this.setPickable( value ); },
    get pickable() { return this.isPickable(); },
    
    set transform( value ) { this.setTransform( value ); },
    get transform() { return this.getTransform(); },
    
    set matrix( value ) { this.setMatrix( value ); },
    get matrix() { return this.getMatrix(); },
    
    set translation( value ) { this.setTranslation( value ); },
    get translation() { return this.getTranslation(); },
    
    set rotation( value ) { this.setRotation( value ); },
    get rotation() { return this.getRotation(); },
    
    set x( value ) { this.setX( value ); },
    get x() { return this.getX(); },
    
    set y( value ) { this.setY( value ); },
    get y() { return this.getY(); },
    
    set left( value ) { this.setLeft( value ); },
    get left() { return this.getLeft(); },
    
    set right( value ) { this.setRight( value ); },
    get right() { return this.getRight(); },
    
    set top( value ) { this.setTop( value ); },
    get top() { return this.getTop(); },
    
    set bottom( value ) { this.setBottom( value ); },
    get bottom() { return this.getBottom(); },
    
    set center( value ) { this.setCenter( value ); },
    get center() { return this.getCenter(); },
    
    set centerX( value ) { this.setCenterX( value ); },
    get centerX() { return this.getCenterX(); },
    
    set centerY( value ) { this.setCenterY( value ); },
    get centerY() { return this.getCenterY(); },
    
    set children( value ) { this.setChildren( value ); },
    get children() { return this.getChildren(); },
    
    get parents() { return this.getParents(); },
    
    get width() { return this.getWidth(); },
    get height() { return this.getHeight(); },
    get bounds() { return this.getBounds(); },
    get selfBounds() { return this.getSelfBounds(); },
    get childBounds() { return this.getChildBounds(); },
    get globalBounds() { return this.getGlobalBounds(); },
    get visibleBounds() { return this.getVisibleBounds(); },
    get id() { return this.getId(); },
    get instances() { return this.getInstances(); },
    
    mutate: function( options ) {
      var node = this;
      
      _.each( this._mutatorKeys, function( key ) {
        if ( options[key] !== undefined ) {
          var descriptor = Object.getOwnPropertyDescriptor( Node.prototype, key );
          
          // if the key refers to a function that is not ES5 writable, it will execute that function with the single argument
          if ( descriptor && typeof descriptor.value === 'function' ) {
            node[key]( options[key] );
          } else {
            node[key] = options[key];
          }
        }
      } );
      
      return this; // allow chaining
    },
    
    toString: function( spaces, includeChildren ) {
      spaces = spaces || '';
      var props = this.getPropString( spaces + '  ', includeChildren === undefined ? true : includeChildren );
      return spaces + this.getBasicConstructor( props ? ( '\n' + props + '\n' + spaces ) : '' );
    },
    
    getBasicConstructor: function( propLines ) {
      return 'new scenery.Node( {' + propLines + '} )';
    },
    
    getPropString: function( spaces, includeChildren ) {
      var self = this;
      
      var result = '';
      function addProp( key, value, nowrap ) {
        if ( result ) {
          result += ',\n';
        }
        if ( !nowrap && typeof value === 'string' ) {
          result += spaces + key + ': \'' + value + '\'';
        } else {
          result += spaces + key + ': ' + value;
        }
      }
      
      if ( this._children.length && includeChildren ) {
        var childString = '';
        _.each( this._children, function( child ) {
          if ( childString ) {
            childString += ',\n';
          }
          childString += child.toString( spaces + '  ' );
        } );
        addProp( 'children', '[\n' + childString + '\n' + spaces + ']', true );
      }
      
      // direct copy props
      if ( this.cursor ) { addProp( 'cursor', this.cursor ); }
      if ( !this.visible ) { addProp( 'visible', this.visible ); }
      if ( !this.pickable ) { addProp( 'pickable', this.pickable ); }
      if ( this.opacity !== 1 ) { addProp( 'opacity', this.opacity ); }
      
      if ( !this.transform.isIdentity() ) {
        var m = this.transform.getMatrix();
        addProp( 'matrix', 'new dot.Matrix3( ' + m.m00() + ', ' + m.m01() + ', ' + m.m02() + ', ' +
                                                 m.m10() + ', ' + m.m11() + ', ' + m.m12() + ', ' +
                                                 m.m20() + ', ' + m.m21() + ', ' + m.m22() + ' )', true );
      }
      
      if ( this.renderer ) {
        addProp( 'renderer', this.renderer.name );
        if ( this.rendererOptions ) {
          // addProp( 'rendererOptions', JSON.stringify( this.rendererOptions ), true );
        }
      }
      
      if ( this._layerSplitBefore ) {
        addProp( 'layerSplitBefore', true );
      }
      
      if ( this._layerSplitAfter ) {
        addProp( 'layerSplitAfter', true );
      }
      
      return result;
    }
  };
  
  /*
   * This is an array of property (setter) names for Node.mutate(), which are also used when creating nodes with parameter objects.
   *
   * E.g. new scenery.Node( { x: 5, rotation: 20 } ) will create a Path, and apply setters in the order below (node.x = 5; node.rotation = 20)
   *
   * The order below is important! Don't change this without knowing the implications.
   * NOTE: translation-based mutators come before rotation/scale, since typically we think of their operations occuring "after" the rotation / scaling
   * NOTE: left/right/top/bottom/centerX/centerY are at the end, since they rely potentially on rotation / scaling changes of bounds that may happen beforehand
   * TODO: using more than one of {translation,x,left,right,centerX} or {translation,y,top,bottom,centerY} should be considered an error
   * TODO: move fill / stroke setting to mixins
   */
  Node.prototype._mutatorKeys = [ 'children', 'cursor', 'visible', 'pickable', 'opacity', 'matrix', 'translation', 'x', 'y', 'rotation', 'scale',
                                  'left', 'right', 'top', 'bottom', 'center', 'centerX', 'centerY', 'renderer', 'rendererOptions',
                                  'layerSplit', 'layerSplitBefore', 'layerSplitAfter', 'mouseArea', 'touchArea' ];
  
  Node.prototype._supportedRenderers = [];
  
  Node.prototype.layerStrategy = LayerStrategy;
  
  // mix-in the events for Node
  /* jshint -W064 */
  NodeEvents( Node );
  
  return Node;
} );
