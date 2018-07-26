// Copyright 2013-2017, University of Colorado Boulder

/**
 * [[EXPERIMENTAL]] Assists mixins by applying a method after any existing prototype method
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';

  var scenery = require( 'SCENERY/scenery' );

  function protoAfter( prototype, eventName, method ) {
    var original = prototype[ eventName ];

    if ( original ) {
      prototype[ eventName ] = function() {
        var args = Array.prototype.slice.call( arguments );
        original.apply( this, args );
        method.apply( this, args );
      };
    }
    else {
      prototype[ eventName ] = method;
    }
  }

  scenery.register( 'protoAfter', protoAfter );

  return protoAfter;
} );