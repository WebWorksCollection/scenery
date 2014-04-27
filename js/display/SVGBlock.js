// Copyright 2002-2014, University of Colorado

/**
 * TODO docs
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';
  
  var inherit = require( 'PHET_CORE/inherit' );
  var Poolable = require( 'PHET_CORE/Poolable' );
  var cleanArray = require( 'PHET_CORE/cleanArray' );
  var scenery = require( 'SCENERY/scenery' );
  var Drawable = require( 'SCENERY/display/Drawable' );
  var SVGGroup = require( 'SCENERY/display/SVGGroup' );
  
  scenery.SVGBlock = function SVGBlock( renderer, transformRootInstance, filterRootInstance ) {
    this.initialize( renderer, transformRootInstance, filterRootInstance );
  };
  var SVGBlock = scenery.SVGBlock;
  
  inherit( Drawable, SVGBlock, {
    initialize: function( renderer, transformRootInstance, filterRootInstance ) {
      this.initializeDrawable( renderer );
      
      this.transformRootInstance = transformRootInstance;
      this.filterRootInstance = filterRootInstance;
      
      this.dirtyOrderGroups = cleanArray( this.dirtyOrderGroups );
      
      if ( !this.domElement ) {
        // main SVG element
        this.svg = document.createElementNS( scenery.svgns, 'svg' );
        // this.svg.setAttribute( 'width', width );
        // this.svg.setAttribute( 'height', height );
        this.svg.setAttribute( 'stroke-miterlimit', 10 ); // to match our Canvas brethren so we have the same default behavior
        // this.svg.style.position = 'absolute';
        // this.svg.style.left = '0';
        // this.svg.style.top = '0';
        // this.svg.style.clip = 'rect(0px,' + width + 'px,' + height + 'px,0px)';
        this.svg.style['pointer-events'] = 'none';
        
        // the <defs> block that we will be stuffing gradients and patterns into
        this.defs = document.createElementNS( scenery.svgns, 'defs' );
        this.svg.appendChild( this.defs );
        
        this.domElement = this.svg;
      }
      
      var instanceClosestToRoot = transformRootInstance.trail.nodes.length > filterRootInstance.trail.nodes.length ? filterRootInstance : transformRootInstance;
      
      this.rootGroup = SVGGroup.createFromPool( this, instanceClosestToRoot, null );
      this.svg.appendChild( this.rootGroup.svgGroup );
      
      // TODO: add count of boundsless objects?
      // TODO: dirty list of nodes (each should go dirty only once, easier than scanning all?)
    },
    
    markDirtyGroupOrder: function( block ) {
      this.dirtyOrderGroups.push( block );
      this.markDirty(); // TODO: ensure that this works?
    },
    
    update: function() {
      //OHTWO TODO: call here!
      while ( this.dirtyOrderGroups.length ) {
        this.dirtyOrderGroups.pop().reorder();
      }
    },
    
    dispose: function() {
      // clear references
      this.transformRootInstance = null;
      this.filterRootInstance = null;
      this.dirtyOrderGroups = cleanArray( this.dirtyOrderGroups );
      
      this.svg.removeChild( this.rootGroup );
      this.rootGroup.dispose();
      this.rootGroup = null;
      
      Drawable.prototype.dispose.call( this );
    },
    
    markDirtyDrawable: function( drawable ) {
      
    },
    
    addDrawable: function( drawable ) {
      SVGGroup.addDrawable( this, drawable );
    },
    
    removeDrawable: function( drawable ) {
      SVGGroup.removeDrawable( this, drawable );
    }
  } );
  
  /* jshint -W064 */
  Poolable( SVGBlock, {
    constructorDuplicateFactory: function( pool ) {
      return function( renderer, transformRootInstance, filterRootInstance ) {
        if ( pool.length ) {
          return pool.pop().initialize( renderer, transformRootInstance, filterRootInstance );
        } else {
          return new SVGBlock( renderer, transformRootInstance, filterRootInstance );
        }
      };
    }
  } );
  
  return SVGBlock;
} );
