// Copyright 2002-2012, University of Colorado

/**
 * Text
 *
 * TODO: newlines
 *
 * @author Jonathan Olson
 */

var phet = phet || {};
phet.scene = phet.scene || {};

(function(){
  "use strict";
  
  phet.scene.Text = function( text, params ) {
    this.fontStyles = new Text.FontStyles(); // will be filled in later, due to dependency resolution
    
    // ensure we have a parameter object
    params = params || {};
    
    // default to black filled text
    if ( params.fill === undefined ) {
      params.fill = '#000000';
    }
    
    if ( text !== undefined ) {
      // set the text parameter so that setText( text ) is effectively called in the mutator from the super call
      params.text = text;
    }
    phet.scene.Node.call( this, params );
    
    // this.setText( text );
  };
  var Text = phet.scene.Text;
  
  Text.prototype = phet.Object.create( phet.scene.Node.prototype );
  Text.prototype.constructor = Text;
  
  Text.prototype.setText = function( text ) {
    this._text = text;
    this.invalidateText();
    return this;
  };
  
  Text.prototype.getText = function() {
    return this._text;
  };
  
  Text.prototype.invalidateText = function() {
    // TODO: faster bounds determination? getBBox()?
    // investigate http://mudcu.be/journal/2011/01/html5-typographic-metrics/
    this.invalidateSelf( phet.scene.canvasTextBoundsAccurate( this._text, this.fontStyles ) );
  };
  
  Text.prototype.renderSelf = function( state ) {
    // TODO: add SVG / DOM support
    if ( state.isCanvasState() ) {
      var layer = state.layer;
      var context = layer.context;
      if ( this.hasFill() ) {
        layer.setFillStyle( this.getFill() );
        layer.setFont( this.fontStyles.font );
        layer.setTextAlign( this.fontStyles.textAlign );
        layer.setTextBaseline( this.fontStyles.textBaseline );
        layer.setDirection( this.fontStyles.direction );
        
        context.fillText( this._text, 0, 0 );
      }
    }
  };
  
  Text.prototype.setFont = function( font ) {
    this.fontStyles.font = font;
    this.invalidateText();
    return this;
  };
  
  Text.prototype.getFont = function() {
    return this.fontStyles.font;
  };
  
  Text.prototype.setTextAlign = function( textAlign ) {
    this.fontStyles.textAlign = textAlign;
    this.invalidateText();
    return this;
  };
  
  Text.prototype.getTextAlign = function() {
    return this.fontStyles.textAlign;
  };
  
  Text.prototype.setTextBaseline = function( textBaseline ) {
    this.fontStyles.textBaseline = textBaseline;
    this.invalidateText();
    return this;
  };
  
  Text.prototype.getTextBaseline = function() {
    return this.fontStyles.textBaseline;
  };
  
  Text.prototype.setDirection = function( direction ) {
    this.fontStyles.direction = direction;
    this.invalidateText();
    return this;
  };
  
  Text.prototype.getDirection = function() {
    return this.fontStyles.direction;
  };
  
  // TODO: mixins for fill!
  Text.prototype._mutatorKeys = [ 'text', 'font', 'textAlign', 'textBaseline', 'direction' ].concat( phet.scene.Node.prototype._mutatorKeys );
  
  Object.defineProperty( Text.prototype, 'text', { set: Text.prototype.setText, get: Text.prototype.getText } );
  Object.defineProperty( Text.prototype, 'font', { set: Text.prototype.setFont, get: Text.prototype.getFont } );
  Object.defineProperty( Text.prototype, 'textAlign', { set: Text.prototype.setTextAlign, get: Text.prototype.getTextAlign } );
  Object.defineProperty( Text.prototype, 'textBaseline', { set: Text.prototype.setTextBaseline, get: Text.prototype.getTextBaseline } );
  Object.defineProperty( Text.prototype, 'direction', { set: Text.prototype.setDirection, get: Text.prototype.getDirection } );
  
  Text.FontStyles = function( args ) {
    if ( args === undefined ) {
      args = {};
    }
    this.font = args.font !== undefined ? args.font : '10px sans-serif';
    this.textAlign = args.textAlign !== undefined ? args.textAlign : 'start'; // start, end, left, right, center
    this.textBaseline = args.textBaseline !== undefined ? args.textBaseline : 'alphabetic'; // top, hanging, middle, alphabetic, ideographic, bottom
    this.direction = args.direction !== undefined ? args.direction : 'ltr'; // ltr, rtl, inherit -- consider inherit deprecated, due to how we compute text bounds in an off-screen canvas
  };
})();


