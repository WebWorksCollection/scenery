// Copyright 2018, University of Colorado Boulder

/**
 * Utilities for full-screen support
 * Used to live at 'JOIST/FullScreen'. Moved to 'SCENERY/util/FullScreen' on 4/10/2018
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
define( require => {
  'use strict';

  // modules
  const detectPrefix = require( 'PHET_CORE/detectPrefix' );
  const detectPrefixEvent = require( 'PHET_CORE/detectPrefixEvent' );
  const platform = require( 'PHET_CORE/platform' );
  const Property = require( 'AXON/Property' );
  const scenery = require( 'SCENERY/scenery' );

  // get prefixed (and properly capitalized) property names
  const exitFullscreenPropertyName = detectPrefix( document, 'exitFullscreen' ) ||
                                   detectPrefix( document, 'cancelFullScreen' ); // Firefox
  const fullscreenElementPropertyName = detectPrefix( document, 'fullscreenElement' ) ||
                                      detectPrefix( document, 'fullScreenElement' ); // Firefox capitalization
  const fullscreenEnabledPropertyName = detectPrefix( document, 'fullscreenEnabled' ) ||
                                      detectPrefix( document, 'fullScreenEnabled' ); // Firefox capitalization
  let fullscreenChangeEvent = detectPrefixEvent( document, 'fullscreenchange' );

  // required capitalization workaround for now
  if ( fullscreenChangeEvent === 'msfullscreenchange' ) {
    fullscreenChangeEvent = 'MSFullscreenChange';
  }

  var FullScreen = {

    // @public
    isFullScreen: function() {
      return !!document[ fullscreenElementPropertyName ];
    },

    // @public
    isFullScreenEnabled: function() {
      return document[ fullscreenEnabledPropertyName ] && !platform.safari7;
    },

    /**
     * @public
     * @param {Display} display
     */
    enterFullScreen: function( display ) {
      const requestFullscreenPropertyName = detectPrefix( document.body, 'requestFullscreen' ) ||
                                          detectPrefix( document.body, 'requestFullScreen' ); // Firefox capitalization
                                          
      if ( !platform.ie9 && !platform.ie10 ) {
        display.domElement[ requestFullscreenPropertyName ] && display.domElement[ requestFullscreenPropertyName ]();
      }
      else if ( typeof window.ActiveXObject !== 'undefined' ) { // Older IE.
        const wscript = new window.ActiveXObject( 'WScript.Shell' );
        if ( wscript !== null ) {
          wscript.SendKeys( '{F11}' );
        }
      }
    },

    // @public
    exitFullScreen: function() {
      document[ exitFullscreenPropertyName ] && document[ exitFullscreenPropertyName ]();
    },

    /**
     * @public
     * @param {Display} display
     */
    toggleFullScreen: function( display ) {
      if ( FullScreen.isFullScreen() ) {
        FullScreen.exitFullScreen();
      }
      else {
        FullScreen.enterFullScreen( display );
      }
    },

    isFullScreenProperty: new Property( false )
  };

  // update isFullScreenProperty on potential changes
  document.addEventListener( fullscreenChangeEvent, function( evt ) {
    FullScreen.isFullScreenProperty.set( FullScreen.isFullScreen() );
  } );

  scenery.register( 'FullScreen', FullScreen );

  return FullScreen;
} );