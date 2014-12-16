//  Copyright 2002-2014, University of Colorado Boulder

/**
 * Simplified isolated test harness for a webgl renderer.
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var TriangleSystem = require( 'SCENERY/display/webgl/TriangleSystem' );
  var vertexShaderSource = require( 'text!SCENERY/display/webgl/color2d.vert' );
  var fragmentShaderSource = require( 'text!SCENERY/display/webgl/color2d.frag' );

  /**
   *
   * @constructor
   */
  function TestWebGL() {
  }

  return inherit( Object, TestWebGL, {

    /**
     * Create a mrdoob stats instance which can be used to profile the simulation.
     * @returns {Stats}
     */
    createStats: function() {
      var stats = new Stats();
      stats.setMode( 0 ); // 0: fps, 1: ms

      // align top-left
      stats.domElement.style.position = 'absolute';
      stats.domElement.style.left = '0px';
      stats.domElement.style.top = '0px';

      return stats;
    },

    /**
     * Initialize the simulation and start it animating.
     */
    start: function() {
      var stats = this.createStats();
      document.body.appendChild( stats.domElement );

      var canvas = document.getElementById( "canvas" );

      // Handle retina displays as described in https://www.khronos.org/webgl/wiki/HandlingHighDPI
      // First, set the display size of the canvas.
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";

      // Next, set the size of the drawingBuffer
      var devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;

      // Code inspired by http://www.webglacademy.com/#1
      var gl;
      try {
        gl = canvas.getContext( "experimental-webgl", {antialias: true} ); // TODO: {antialias:true?}
      }
      catch( e ) {
        return false;
      }

      var toShader = function( source, type, typeString ) {
        var shader = gl.createShader( type );
        gl.shaderSource( shader, source );
        gl.compileShader( shader );
        if ( !gl.getShaderParameter( shader, gl.COMPILE_STATUS ) ) {
          console.log( "ERROR IN " + typeString + " SHADER : " + gl.getShaderInfoLog( shader ) );
          return false;
        }
        return shader;
      };

      var vertexShader = toShader( vertexShaderSource, gl.VERTEX_SHADER, "VERTEX" );
      var fragmentShader = toShader( fragmentShaderSource, gl.FRAGMENT_SHADER, "FRAGMENT" );

      var shaderProgram = gl.createProgram();
      gl.attachShader( shaderProgram, vertexShader );
      gl.attachShader( shaderProgram, fragmentShader );

      gl.linkProgram( shaderProgram );

      var positionAttribLocation = gl.getAttribLocation( shaderProgram, 'aPosition' );
      var colorAttributeLocation = gl.getAttribLocation( shaderProgram, 'aVertexColor' );

      gl.enableVertexAttribArray( positionAttribLocation );
      gl.enableVertexAttribArray( colorAttributeLocation );

      gl.useProgram( shaderProgram );

      // Manages the indices within a single array, so that disjoint geometries can be represented easily here.
      // TODO: Compare this same idea to triangle strips
      var trianglesGeometry = new TriangleSystem();
      var vertexArray = trianglesGeometry.vertexArray;
      var colors = trianglesGeometry.colors;

      var rectangles = [];

      var numRectangles = 500;
      for ( var i = 0; i < numRectangles; i++ ) {
        var x = (Math.random() * 2 - 1) * 0.9;
        var y = (Math.random() * 2 - 1) * 0.9;
        rectangles.push( trianglesGeometry.createRectangle( x, y, 0.02, 0.02, x, y, 1, 1 ) );
      }

      var numStars = 500;
      var stars = [];
      for ( var k = 0; k < numStars; k++ ) {
        x = (Math.random() * 2 - 1) * 0.9;
        y = (Math.random() * 2 - 1) * 0.9;
        var scale = Math.random() * 0.2;
        var star = trianglesGeometry.createStar( x, y, 0.15 * scale, 0.4 * scale, Math.PI + Math.random() * Math.PI * 2, Math.random(), Math.random(), Math.random(), 1 );
        stars.push( star );
      }

      var vertexBuffer = gl.createBuffer();
      gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
      gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertexArray ), gl.DYNAMIC_DRAW );

      // Set up different colors for each triangle
      var vertexColorBuffer = gl.createBuffer();
      gl.bindBuffer( gl.ARRAY_BUFFER, vertexColorBuffer );
      gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( colors ), gl.STATIC_DRAW );

      gl.clearColor( 0.0, 0.0, 0.0, 0.0 );

      var animate = function() {
        window.requestAnimationFrame( animate );

        stats.begin();

        gl.viewport( 0.0, 0.0, canvas.width, canvas.height );
        gl.clear( gl.COLOR_BUFFER_BIT );

        gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );

        // Update the vertex locations
        //see http://stackoverflow.com/questions/5497722/how-can-i-animate-an-object-in-webgl-modify-specific-vertices-not-full-transfor
        gl.bufferSubData( gl.ARRAY_BUFFER, 0, new Float32Array( vertexArray ) );
        gl.vertexAttribPointer( positionAttribLocation, 2, gl.FLOAT, false, 0, 0 );

        // Send the colors to the GPU
        gl.bindBuffer( gl.ARRAY_BUFFER, vertexColorBuffer );
        gl.vertexAttribPointer( colorAttributeLocation, 4, gl.FLOAT, false, 0, 0 );

        // Show one oscillation per second so it is easy to count time
        var x = 0.2 * Math.cos( Date.now() / 1000 * 2 * Math.PI );
        for ( var i = 0; i < rectangles.length; i++ ) {
          var rectangle = rectangles[i];
          rectangle.setXWidth( rectangle.initialState.x + x, rectangle.initialState.width );
        }

        for ( var mm = 0; mm < stars.length / 2; mm++ ) {
          var star = stars[mm];
          star.setStar( star.initialState._x, star.initialState._y, star.initialState._innerRadius, star.initialState._outerRadius, star.initialState._totalAngle + Date.now() / 1000 );
        }

        gl.drawArrays( gl.TRIANGLES, 0, vertexArray.length / 2 );
        gl.flush();

        stats.end();
      };
      window.requestAnimationFrame( animate );
    }
  } );
} );