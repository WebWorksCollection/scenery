// Copyright 2002-2013, University of Colorado

/**
 * Tracks the mouse state
 *
 * @author Jonathan Olson <olsonsjc@gmail.com>
 */

define( function( require ) {
  'use strict';
  
  var inherit = require( 'PHET_CORE/inherit' );
  var scenery = require( 'SCENERY/scenery' );
  
  var Pointer = require( 'SCENERY/input/Pointer' ); // inherits from Pointer
  
  scenery.Mouse = function Mouse() {
    Pointer.call( this );
    
    this.point = null;
    
    this.leftDown = false;
    this.middleDown = false;
    this.rightDown = false;
    
    this.isMouse = true;
    
    this.trail = null;
    
    // overrides the cursor of whatever is under it when set
    this._cursor = null;
    
    this.type = 'mouse';
  };
  var Mouse = scenery.Mouse;
  
  inherit( Pointer, Mouse, {
    set cursor( value ) { return this.setCursor( value ); },
    get cursor() { return this._cursor; },
    
    setCursor: function( value ) {
      this._cursor = value;
      return this; // allow chaining
    },
    
    clearCursor: function() {
      this.setCursor( null );
    },
    
    down: function( point, event ) {
      // if ( this.point ) { this.point.freeToPool(); }
      this.point = point;
      switch( event.button ) {
        case 0: this.leftDown = true; break;
        case 1: this.middleDown = true; break;
        case 2: this.rightDown = true; break;
      }
    },
    
    up: function( point, event ) {
      // if ( this.point ) { this.point.freeToPool(); }
      this.point = point;
      switch( event.button ) {
        case 0: this.leftDown = false; break;
        case 1: this.middleDown = false; break;
        case 2: this.rightDown = false; break;
      }
    },
    
    move: function( point, event ) {
      // if ( this.point ) { this.point.freeToPool(); }
      this.point = point;
    },
    
    over: function( point, event ) {
      // if ( this.point ) { this.point.freeToPool(); }
      this.point = point;
    },
    
    out: function( point, event ) {
      // if ( this.point ) { this.point.freeToPool(); }
      // TODO: how to handle the mouse out-of-bounds
      this.point = null;
    },
    
    toString: function() {
      return 'Mouse';
    }
  } );
  
  return Mouse;
} );
