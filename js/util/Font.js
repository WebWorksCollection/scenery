// Copyright 2002-2012, University of Colorado

/**
 * Font handling for text drawing
 *
 * Examples:
 * new scenery.Font().font                      // "10px sans-serif" (the default)
 * new scenery.Font( { family: 'serif' } ).font // "10px serif"
 * new scenery.Font( { weight: 'bold' } ).font  // "bold 10px sans-serif"
 * new scenery.Font( { size: 16 } ).font        // "16px sans-serif"
 * var font = new scenery.Font( {
 *   family: '"Times New Roman", serif'
 * } );
 * font.style = 'italic';
 * font.lineHeight = 10;
 * font.font;                                   // "italic 10px/10 'Times New Roman', serif"
 * font.family;                                 // "'Times New Roman', serif"
 * font.weight;                                 // 400 (the default)
 *
 * Useful specs:
 * http://www.w3.org/TR/css3-fonts/
 *
 * @author Jonathan Olson <olsonsjc@gmail.com>
 */

define( function( require ) {
  "use strict";
  
  var assert = require( 'ASSERT/assert' )( 'scenery' );
  
  var scenery = require( 'SCENERY/scenery' );
  
  // options from http://www.w3.org/TR/css3-fonts/
  // font-family      v ---
  // font-weight      v normal | bold | bolder | lighter | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  // font-stretch     v normal | ultra-condensed | extra-condensed | condensed | semi-condensed | semi-expanded | expanded | extra-expanded | ultra-expanded
  // font-style       v normal | italic | oblique
  // font-size        v <absolute-size> | <relative-size> | <length> | <percentage>
  // font-size-adjust v none | auto | <number>
  // font             v [ [ <‘font-style’> || <font-variant-css21> || <‘font-weight’> || <‘font-stretch’> ]? <‘font-size’> [ / <‘line-height’> ]? <‘font-family’> ] | caption | icon | menu | message-box | small-caption | status-bar
  //                    <font-variant-css21> = [normal | small-caps]
  // font-synthesis   v none | [ weight || style ]
  
  scenery.Font = function( options ) {
    // internal string representation
    this._font = '10px sans-serif';
    
    // span for using the browser to compute font styles
    this.$span = $( document.createElement( 'span' ) );
    
    // cache values for all of the span's properties
    this.cachedValues = null;
    
    // allow listeners to be notified on any changes
    this.listeners = [];
    
    if ( assert ) {
      // only do this if assertions are enabled, otherwise we won't access it at all
      this.immutable = false;
    }
    
    var type = typeof options;
    if ( type === 'string' ) {
      this._font = options;
      this.$span.css( 'font', this._font ); // properly initialize the font instance
    } else if ( type === 'object' ) {
      this.$span.css( 'font', this._font ); // properly initialize the font instance
      this.mutate( options );
    } else {
      this.$span.css( 'font', this._font ); // properly initialize the font instance
    }
  };
  var Font = scenery.Font;
  
  Font.prototype = {
    constructor: Font,
    
    // invalidate cached data and notify listeners of the change
    invalidateFont: function() {
      assert && assert( !this.immutable, 'cannot change immutable font instance' );
      
      this.cachedValues = null;
      
      var listeners = this.listeners.slice( 0 );
      var length = listeners.length;
      
      for ( var i = 0; i < length; i++ ) {
        listeners[i]();
      }
    },
    
    // marks this Font instance as immutable. any further change will trigger an error (if assertions are enabled)
    setImmutable: function() {
      this.immutable = true;
    },
    
    getProperty: function( property ) {
      if ( !this.cachedValues ) {
        this.cachedValues = this.$span.css( [
          'font',
          'font-family',
          'font-weight',
          'font-stretch',
          'font-style',
          'font-size',
          'lineHeight'
        ] );
      }
      assert && assert( property in this.cachedValues );
      return this.cachedValues[property];
    },
    setProperty: function( property, value ) {
      // sanity check, in case some CSS changed somewhere
      this.$span.css( 'font', this._font );
      
      this.$span.css( property, value );
      this._font = this.$span.css( 'font' );
      
      this.invalidateFont();
      return this;
    },
    
    // direct access to the font string
    getFont: function() {
      return this._font;
    },
    setFont: function( value ) {
      if ( this._font !== value ) {
        this._font = value;
        this.invalidateFont();
      }
      return this;
    },
    
    // using the property mechanism
    getFamily: function() { return this.getProperty( 'font-family' ); },
    setFamily: function( value ) { return this.setProperty( 'font-family', value ); },
    
    getWeight: function() { return this.getProperty( 'font-weight' ); },
    setWeight: function( value ) { return this.setProperty( 'font-weight', value ); },
    
    getStretch: function() { return this.getProperty( 'font-stretch' ); },
    setStretch: function( value ) { return this.setProperty( 'font-stretch', value ); },
    
    getStyle: function() { return this.getProperty( 'font-style' ); },
    setStyle: function( value ) { return this.setProperty( 'font-style', value ); },
    
    getSize: function() { return this.getProperty( 'font-size' ); },
    setSize: function( value ) { return this.setProperty( 'font-size', value ); },
    
    // NOTE: Canvas spec forces line-height to normal
    getLineHeight: function() { return this.getProperty( 'line-height' ); },
    setLineHeight: function( value ) { return this.setProperty( 'line-height', value ); },
    
    set font( value ) { this.setFont( value ); },
    get font() { return this.getFont(); },
    
    set weight( value ) { this.setWeight( value ); },
    get weight() { return this.getWeight(); },
    
    set family( value ) { this.setFamily( value ); },
    get family() { return this.getFamily(); },
    
    set stretch( value ) { this.setStretch( value ); },
    get stretch() { return this.getStretch(); },
    
    set style( value ) { this.setStyle( value ); },
    get style() { return this.getStyle(); },
    
    set size( value ) { this.setSize( value ); },
    get size() { return this.getSize(); },
    
    set lineHeight( value ) { this.setLineHeight( value ); },
    get lineHeight() { return this.getLineHeight(); },
    
    // TODO: move this style of mutation out into more common code, if we use it again
    mutate: function( options ) {
      var font = this;
      
      _.each( this._mutatorKeys, function( key ) {
        if ( options[key] !== undefined ) {
          font[key] = options[key];
        }
      } );
    },
    
    toString: function() {
      return this.getFont();
    },
    
    /*---------------------------------------------------------------------------*
    * listeners
    *----------------------------------------------------------------------------*/
    
    // listener should be a callback expecting no arguments, listener() will be called when the font changes
    addFontListener: function( listener ) {
      assert && assert( !_.contains( this.listeners, listener ) );
      this.listeners.push( listener );
    },
    
    removeFontListener: function( listener ) {
      assert && assert( _.contains( this.listeners, listener ) );
      this.listeners.splice( _.indexOf( this.listeners, listener ), 1 );
    }
  };
  
  Font.prototype._mutatorKeys = [ 'font', 'weight', 'family', 'stretch', 'style', 'size', 'lineHeight' ];
  
  Font.DEFAULT = new Font();
  Font.DEFAULT.setImmutable();
  
  return Font;
} );
