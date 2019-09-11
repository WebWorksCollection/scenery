// Copyright 2017, University of Colorado Boulder

/**
 * TODO: doc
 *
 * TODO: unit tests
 *
 * TODO: add example usage
 *
 * TODO: Handle interrupts
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';

  var arrayRemove = require( 'PHET_CORE/arrayRemove' );
  var inherit = require( 'PHET_CORE/inherit' );
  var Matrix = require( 'DOT/Matrix' );
  var Matrix3 = require( 'DOT/Matrix3' );
  var Mouse = require( 'SCENERY/input/Mouse' );
  var scenery = require( 'SCENERY/scenery' );
  var SingularValueDecomposition = require( 'DOT/SingularValueDecomposition' );
  var Vector2 = require( 'DOT/Vector2' );

  /**
   * @constructor
   *
   * @param {Node} targetNode - The Node that should be transformed by this MultiListener.
   * @param {Object} [options] - See the constructor body (below) for documented options.
   */
  function MultiListener( targetNode, options ) {
    var self = this;

    options = _.extend( {
      mouseButton: 0, // TODO: see PressListener
      pressCursor: 'pointer', // TODO: see PressListener
      targetNode: null, // TODO: required? pass in at front
      allowScale: true,
      allowRotation: true,
      allowMultitouchInterruption: true,

      // {boolean} - if true, pointer movement after presses will initiate a translation. Can still
      // be prevented on this listener with Event.preventDefaultBehavior()
      allowMoveInterruption:  true,

      // limits for scaling
      minScale: 1, // TODO: values less than 1 are currently not supported
      maxScale: 4
    }, options );

    // TODO: type checks for options

    // @protected
    this._targetNode = targetNode;

    // @private - see options
    this._mouseButton = options.mouseButton;
    this._pressCursor = options.pressCursor;
    this._allowScale = options.allowScale;
    this._allowRotation = options.allowRotation;
    this._allowMultitouchInterruption = options.allowMultitouchInterruption;
    this._allowMoveInterruption = options.allowMoveInterruption;

    // @protected
    this._minScale = options.minScale;
    this._maxScale = options.maxScale;

    // @private {Array.<Press>} - list of Presses down on the screen, the number of pointers currently
    // touching down on the screen
    this._presses = [];

    // @private {Array.<Press>} - presses down that may have happened while a pointer was already attached - if at
    // any point the attached pointer is removed all of these presses become active (moved to this._presses)
    this._backgroundPresses = [];

    // @private - listener attached to a Pointer when a press (logical down) is received on a Node.
    this._pressListener = {
      move: function( event ) {
        if ( event.pointer.type === 'touch' ) {
          sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener pointer move' );
          sceneryLog && sceneryLog.InputListener && sceneryLog.push();

          self.movePress( self.findPress( event.pointer ) );

          sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
        }
      },

      up: function( event ) {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener pointer up' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        // TODO: consider logging press on the pointer itself?
        self.removePress( self.findPress( event.pointer ) );

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      },

      cancel: function( event ) {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener pointer cancel' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        var press = self.findPress( event.pointer );
        press.interrupted = true;

        self.removePress( press );

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      },

      interrupt: function() {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener pointer interrupt' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        // For the future, we could figure out how to track the pointer that calls this
        self.interrupt();

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      }
    };

    // added to the pointer to support background
    this._backgroundListener = {
      up: function( event ) {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener background up' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        self.removeBackgroundPress( self.findBackgroundPress( event.pointer ) );

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      },

      move: function( event ) {
        if ( self._allowMoveInterruption && !event.defaultPrevented ) {
          console.log( 'interrupting from background move, converting' );
          sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener attached, interrupting for press' );
          event.pointer.interruptAttached();
          self.convertBackgroundPresses();

          self.movePress( self.findPress( event.pointer ) );
        }
      },

      cancel: function( event ) {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener background cancel' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        self.removeBackgroundPress( self.findBackgroundPress( event.pointer ) );

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      },

      interrupt: function() {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener background interrupt' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        self.removeBackgroundPress( self.findBackgroundPress( event.pointer ) );

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      }
    };
  }

  scenery.register( 'MultiListener', MultiListener );

  inherit( Object, MultiListener, {

    findPress: function( pointer ) {
      for ( var i = 0; i < this._presses.length; i++ ) {
        if ( this._presses[ i ].pointer === pointer ) {
          return this._presses[ i ];
        }
      }
      assert && assert( false, 'Did not find press' );
      return null;
    },

    findBackgroundPress: function( pointer ) {
      // TODO: reduce duplication with findPress?
      for ( var i = 0; i < this._backgroundPresses.length; i++ ) {
        if ( this._backgroundPresses[ i ].pointer === pointer ) {
          return this._backgroundPresses[ i ];
        }
      }
      assert && assert( false, 'Did not find press' );
      return null;
    },

    // TODO: see PressListener
    down: function( event ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener down' );

      if ( event.pointer instanceof Mouse && event.domEvent.button !== this._mouseButton ) {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener abort: wrong mouse button' );

        return;
      }

      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      assert && assert( _.includes( event.trail.nodes, this._targetNode ),
        'MultiListener down trail does not include targetNode?' );

      var press = new Press( event.pointer, event.trail.subtrailTo( this._targetNode, false ) );

      if ( !event.pointer.isAttached() ) {
        console.log( 'not attached, normal' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener unattached, using press' );
        this.addPress( press );
        this.convertBackgroundPresses();
      }
      else if ( this._allowMultitouchInterruption ) {
        if ( this._presses.length || this._backgroundPresses.length ) {
          console.log( 'multi touch interruption' );
          sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener attached, interrupting for press' );
          press.pointer.interruptAttached();
          this.addPress( press );
          this.convertBackgroundPresses();
        }
        else {
          console.log( 'adding background preses from multitouch' );
          sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener attached, adding background press from multitouch' );
          this.addBackgroundPress( press );
        }
      }
      else if ( this._allowMoveInterruption )  {
        console.log( 'adding background press from move' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener attached, adding background press for move' );
        this.addBackgroundPress( press );
      }

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    /**
     * Translate the target node in a direction specified by deltaVector.
     * @public
     *
     * @param {Vector2} deltaVector
     */
    translateDelta: function( deltaVector ) {
      const targetPoint = this._targetNode.globalToParentPoint( this.panBounds.center );
      const sourcePoint = targetPoint.plus( deltaVector );
      this.translateToTarget( sourcePoint, targetPoint );
    },


    /**
     * Translate the targetNode from a local point to a target point. Both points should be in the global coordinate
     * frame.
     * @public
     *
     * @param {Vector} initialPoint - in global coordinate frame, source position
     * @param {Vector2} targetPoint - in global coordinate frame, target position
     */
    translateToTarget: function( initialPoint, targetPoint ) {

      // TODO: scratch things?
      const singleInitialPoint = this._targetNode.globalToParentPoint( initialPoint );
      const singleTargetPoint = this._targetNode.globalToParentPoint( targetPoint );
      var delta = singleTargetPoint.minus( singleInitialPoint );
      this._targetNode.matrix = Matrix3.translationFromVector( delta ).timesMatrix( this._targetNode.getMatrix() );
    },

    /**
     * Translate and scale to a target point. The result of this function should make it appear that we are scaling
     * in or out of a particular point on the target node. This actually modifies the matrix of the target node. To
     * accomplish zooming into a particular point, we compute a matrix that would transform the target node from
     * the target point, then apply scale, then translate the target back to the target point.
     * @public
     *
     * @param {Vector2} globalPoint - point to zoom in on, in the global coordinate frame
     * @param {number} scaleDelta
     */
    translateScaleToTarget: function( globalPoint, scaleDelta ) {
      const pointInLocalFrame = this._targetNode.globalToLocalPoint( globalPoint );
      const pointInParentFrame = this._targetNode.globalToParentPoint( globalPoint );

      var fromLocalPoint = Matrix3.translation( -pointInLocalFrame.x, -pointInLocalFrame.y );
      var toTargetPoint = Matrix3.translation( pointInParentFrame.x, pointInParentFrame.y );

      const nextScale = this.limitScale( this.getCurrentScale() + scaleDelta );

      // we first translate from target point, then apply scale, then translate back to target point ()
      // so that it appears as though we are zooming into that point
      const scaleMatrix = toTargetPoint.timesMatrix( Matrix3.scaling( nextScale ) ).timesMatrix( fromLocalPoint );
      this._targetNode.matrix = scaleMatrix;
    },

    /**
     * Reset the transform on the target node.
     */
    resetTransform() {
      this._targetNode.resetTransform();
    },

    /**
     * Returns true if some transformation is applied to the target node (within some allowed error).
     * @returns {boolean}
     */
    isTransformApplied() {
      return !this._targetNode.matrix.equalsEpsilon( Matrix3.IDENTITY, 1e-4 );
    },

    addPress: function( press ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener addPress' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      this._presses.push( press );

      press.pointer.cursor = this._pressCursor;
      press.pointer.addInputListener( this._pressListener, true );

      this.recomputeLocals();
      this.reposition();

      // TODO: handle interrupted?

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    movePress: function( press ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener movePress' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      this.reposition();

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    removePress: function( press ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener removePress' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      press.pointer.removeInputListener( this._pressListener );
      press.pointer.cursor = null;

      arrayRemove( this._presses, press );

      this.recomputeLocals();
      this.reposition();

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    addBackgroundPress: function( press ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener addBackgroundPress' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      // TODO: handle turning background presses into main presses here
      this._backgroundPresses.push( press );
      press.pointer.addInputListener( this._backgroundListener, false );

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    removeBackgroundPress: function( press ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener removeBackgroundPress' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      press.pointer.removeInputListener( this._backgroundListener );

      arrayRemove( this._backgroundPresses, press );

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    convertBackgroundPresses: function() {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener convertBackgroundPresses' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      var presses = this._backgroundPresses.slice();
      for ( var i = 0; i < presses.length; i++ ) {
        var press = presses[ i ];
        this.removeBackgroundPress( press );
        press.pointer.interruptAttached();
        this.addPress( press );
      }

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    reposition: function() {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener reposition' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      this._targetNode.matrix = this.computeMatrix();

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    recomputeLocals: function() {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener recomputeLocals' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      for ( var i = 0; i < this._presses.length; i++ ) {
        this._presses[ i ].recomputeLocalPoint();
      }

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    interrupt: function() {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener interrupt' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      while ( this._presses.length ) {
        this.removePress( this._presses[ this._presses.length - 1 ] );
      }

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    // @private?
    computeMatrix: function() {
      if ( this._presses.length === 0 ) {
        return this._targetNode.getMatrix();
      }
      else if ( this._presses.length === 1 ) {
        return this.computeSinglePressMatrix();
      }
      else if ( this._allowScale && this._allowRotation ) {
        return this.computeTranslationRotationScaleMatrix();
      } else if ( this._allowScale ) {
        return this.computeTranslationScaleMatrix();
      } else if ( this._allowRotation ) {
        return this.computeTranslationRotationMatrix();
      } else {
        return this.computeTranslationMatrix();
      }
    },

    // @private
    computeSinglePressMatrix: function() {
      // TODO: scratch things
      var singleTargetPoint = this._presses[ 0 ].targetPoint;
      var singleMappedPoint = this._targetNode.localToParentPoint( this._presses[ 0 ].localPoint );
      var delta = singleTargetPoint.minus( singleMappedPoint );
      return Matrix3.translationFromVector( delta ).timesMatrix( this._targetNode.getMatrix() );
    },

    // @private
    computeTranslationMatrix: function() {
      // translation only. linear least-squares simplifies to sum of differences
      var sum = new Vector2( 0, 0 );
      for ( var i = 0; i < this._presses.length; i++ ) {
        sum.add( this._presses[ i ].targetPoint );
        sum.subtract( this._presses[ i ].localPoint );
      }
      return Matrix3.translationFromVector( sum.dividedScalar( this._presses.length ) );
    },

    // @private
    computeTranslationScaleMatrix: function() {

      // TODO: minimize closures
      var localPoints = this._presses.map( function( press ) { return press.localPoint; } );
      var targetPoints = this._presses.map( function( press ) { return press.targetPoint; } );

      var localCentroid = new Vector2( 0, 0 );
      var targetCentroid = new Vector2( 0, 0 );

      localPoints.forEach( function( localPoint ) { localCentroid.add( localPoint ); } );
      targetPoints.forEach( function( targetPoint ) { targetCentroid.add( targetPoint ); } );

      localCentroid.divideScalar( this._presses.length );
      targetCentroid.divideScalar( this._presses.length );

      var localSquaredDistance = 0;
      var targetSquaredDistance = 0;

      localPoints.forEach( function( localPoint ) { localSquaredDistance += localPoint.distanceSquared( localCentroid ); } );
      targetPoints.forEach( function( targetPoint ) { targetSquaredDistance += targetPoint.distanceSquared( targetCentroid ); } );

      var scale = Math.sqrt( targetSquaredDistance / localSquaredDistance );
      scale = this.limitScale( scale );

      var translateToTarget = Matrix3.translation( targetCentroid.x, targetCentroid.y );
      var translateFromLocal = Matrix3.translation( -localCentroid.x, -localCentroid.y );

      return translateToTarget.timesMatrix( Matrix3.scaling( scale ) ).timesMatrix( translateFromLocal );
    },

    /**
     * Limit the provided scale by constraints of this MultiListener.
     * @param   {number} scale
     * @returns {number}
     */
    limitScale: function( scale ) {
      let correctedScale = Math.max( scale, this._minScale );
      correctedScale = Math.min( correctedScale, this._maxScale );
      return correctedScale;
    },

    /**
     * Get the current scale on the target node, assuming scale is the same in x and y.
     * @public
     *
     * @param {number} scale
     * @returns {number}
     */
    getCurrentScale: function( scale ) {

      // assume same scale in both x and y
      return this._targetNode.getScaleVector().x;
    },

    // @private
    computeTranslationRotationMatrix: function() {
      var i;
      var localMatrix = new Matrix( 2, this._presses.length );
      var targetMatrix = new Matrix( 2, this._presses.length );
      var localCentroid = new Vector2( 0, 0 );
      var targetCentroid = new Vector2( 0, 0 );
      for ( i = 0; i < this._presses.length; i++ ) {
        var localPoint = this._presses[ i ].localPoint;
        var targetPoint = this._presses[ i ].targetPoint;
        localCentroid.add( localPoint );
        targetCentroid.add( targetPoint );
        localMatrix.set( 0, i, localPoint.x );
        localMatrix.set( 1, i, localPoint.y );
        targetMatrix.set( 0, i, targetPoint.x );
        targetMatrix.set( 1, i, targetPoint.y );
      }
      localCentroid.divideScalar( this._presses.length );
      targetCentroid.divideScalar( this._presses.length );

      // determine offsets from the centroids
      for ( i = 0; i < this._presses.length; i++ ) {
        localMatrix.set( 0, i, localMatrix.get( 0, i ) - localCentroid.x );
        localMatrix.set( 1, i, localMatrix.get( 1, i ) - localCentroid.y );
        targetMatrix.set( 0, i, targetMatrix.get( 0, i ) - targetCentroid.x );
        targetMatrix.set( 1, i, targetMatrix.get( 1, i ) - targetCentroid.y );
      }
      var covarianceMatrix = localMatrix.times( targetMatrix.transpose() );
      var svd = new SingularValueDecomposition( covarianceMatrix );
      var rotation = svd.getV().times( svd.getU().transpose() );
      if ( rotation.det() < 0 ) {
        rotation = svd.getV().times( Matrix.diagonalMatrix( [ 1, -1 ] ) ).times( svd.getU().transpose() );
      }
      var rotation3 = new Matrix3().rowMajor( rotation.get( 0, 0 ), rotation.get( 0, 1 ), 0,
                                              rotation.get( 1, 0 ), rotation.get( 1, 1 ), 0,
                                              0, 0, 1 );
      var translation = targetCentroid.minus( rotation3.timesVector2( localCentroid ) );
      rotation3.set02( translation.x );
      rotation3.set12( translation.y );
      return rotation3;
    },

    // @private
    computeTranslationRotationScaleMatrix: function() {
      var i;
      var localMatrix = new Matrix( this._presses.length * 2, 4 );
      for ( i = 0; i < this._presses.length; i++ ) {
        // [ x  y 1 0 ]
        // [ y -x 0 1 ]
        var localPoint = this._presses[ i ].localPoint;
        localMatrix.set( 2 * i + 0, 0, localPoint.x );
        localMatrix.set( 2 * i + 0, 1, localPoint.y );
        localMatrix.set( 2 * i + 0, 2, 1 );
        localMatrix.set( 2 * i + 1, 0, localPoint.y );
        localMatrix.set( 2 * i + 1, 1, -localPoint.x );
        localMatrix.set( 2 * i + 1, 3, 1 );
      }
      var targetMatrix = new Matrix( this._presses.length * 2, 1 );
      for ( i = 0; i < this._presses.length; i++ ) {
        var targetPoint = this._presses[ i ].targetPoint;
        targetMatrix.set( 2 * i + 0, 0, targetPoint.x );
        targetMatrix.set( 2 * i + 1, 0, targetPoint.y );
      }
      var coefficientMatrix = SingularValueDecomposition.pseudoinverse( localMatrix ).times( targetMatrix );
      var m11 = coefficientMatrix.get( 0, 0 );
      var m12 = coefficientMatrix.get( 1, 0 );
      var m13 = coefficientMatrix.get( 2, 0 );
      var m23 = coefficientMatrix.get( 3, 0 );
      return new Matrix3().rowMajor( m11, m12, m13,
                                     -m12, m11, m23,
                                     0, 0, 1 );
    }
  } );

  function Press( pointer, trail ) {
    this.pointer = pointer;
    this.trail = trail;
    this.interrupted = false;

    this.localPoint = null;
    this.recomputeLocalPoint();
  }

  inherit( Object, Press, {

    /**
     * Compute the local point for this press, the global point in the local coordinate frame.
     */
    recomputeLocalPoint: function() {
      this.localPoint = this.trail.globalToLocalPoint( this.pointer.point );
    },

    /**
     * Compute the target point for this press, the global point in the parent coordinate frame.
     */
    getTargetPoint() {
      return this.trail.globalToParentPoint( this.pointer.point );
    },
    get targetPoint() { return this.getTargetPoint(); }
  } );

  return MultiListener;
} );
