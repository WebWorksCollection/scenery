// Copyright 2017-2020, University of Colorado Boulder

/**
 * Node tests
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import BooleanProperty from '../../../axon/js/BooleanProperty.js';
import Property from '../../../axon/js/Property.js';
import TinyProperty from '../../../axon/js/TinyProperty.js';
import Bounds2 from '../../../dot/js/Bounds2.js';
import Range from '../../../dot/js/Range.js';
import Vector2 from '../../../dot/js/Vector2.js';
import Shape from '../../../kite/js/Shape.js';
import HSlider from '../../../sun/js/HSlider.js';
import Tandem from '../../../tandem/js/Tandem.js';
import Display from '../display/Display.js';
import Touch from '../input/Touch.js';
import Node from './Node.js';
import Rectangle from './Rectangle.js';

QUnit.module( 'Node' );

function fakeTouchPointer( vector ) {
  return new Touch( 0, vector, {} );
}

QUnit.test( 'Mouse and Touch areas', function( assert ) {
  const node = new Node();
  const rect = new Rectangle( 0, 0, 100, 50 );
  rect.pickable = true;

  node.addChild( rect );

  assert.ok( !!rect.hitTest( new Vector2( 10, 10 ) ), 'Rectangle intersection' );
  assert.ok( !!rect.hitTest( new Vector2( 90, 10 ) ), 'Rectangle intersection' );
  assert.ok( !rect.hitTest( new Vector2( -10, 10 ) ), 'Rectangle no intersection' );

  node.touchArea = Shape.rectangle( -50, -50, 100, 100 );

  assert.ok( !!node.hitTest( new Vector2( 10, 10 ) ), 'Node intersection' );
  assert.ok( !!node.hitTest( new Vector2( 90, 10 ) ), 'Node intersection' );
  assert.ok( !node.hitTest( new Vector2( -10, 10 ) ), 'Node no intersection' );

  assert.ok( !!node.trailUnderPointer( fakeTouchPointer( new Vector2( 10, 10 ) ) ), 'Node intersection (isTouch)' );
  assert.ok( !!node.trailUnderPointer( fakeTouchPointer( new Vector2( 90, 10 ) ) ), 'Node intersection (isTouch)' );
  assert.ok( !!node.trailUnderPointer( fakeTouchPointer( new Vector2( -10, 10 ) ) ), 'Node intersection (isTouch)' );

  node.clipArea = Shape.rectangle( 0, 0, 50, 50 );

  // points outside the clip area shouldn't register as hits
  assert.ok( !!node.trailUnderPointer( fakeTouchPointer( new Vector2( 10, 10 ) ) ), 'Node intersection (isTouch with clipArea)' );
  assert.ok( !node.trailUnderPointer( fakeTouchPointer( new Vector2( 90, 10 ) ) ), 'Node no intersection (isTouch with clipArea)' );
  assert.ok( !node.trailUnderPointer( fakeTouchPointer( new Vector2( -10, 10 ) ) ), 'Node no intersection (isTouch with clipArea)' );
} );


const epsilon = 0.000000001;

QUnit.test( 'Points (parent and child)', function( assert ) {
  const a = new Node();
  const b = new Node();
  a.addChild( b );
  a.x = 10;
  b.y = 10;

  assert.ok( new Vector2( 5, 15 ).equalsEpsilon( b.localToParentPoint( new Vector2( 5, 5 ) ), epsilon ), 'localToParentPoint on child' );
  assert.ok( new Vector2( 15, 5 ).equalsEpsilon( a.localToParentPoint( new Vector2( 5, 5 ) ), epsilon ), 'localToParentPoint on root' );

  assert.ok( new Vector2( 5, -5 ).equalsEpsilon( b.parentToLocalPoint( new Vector2( 5, 5 ) ), epsilon ), 'parentToLocalPoint on child' );
  assert.ok( new Vector2( -5, 5 ).equalsEpsilon( a.parentToLocalPoint( new Vector2( 5, 5 ) ), epsilon ), 'parentToLocalPoint on root' );

  assert.ok( new Vector2( 15, 15 ).equalsEpsilon( b.localToGlobalPoint( new Vector2( 5, 5 ) ), epsilon ), 'localToGlobalPoint on child' );
  assert.ok( new Vector2( 15, 5 ).equalsEpsilon( a.localToGlobalPoint( new Vector2( 5, 5 ) ), epsilon ), 'localToGlobalPoint on root (same as localToparent)' );

  assert.ok( new Vector2( -5, -5 ).equalsEpsilon( b.globalToLocalPoint( new Vector2( 5, 5 ) ), epsilon ), 'globalToLocalPoint on child' );
  assert.ok( new Vector2( -5, 5 ).equalsEpsilon( a.globalToLocalPoint( new Vector2( 5, 5 ) ), epsilon ), 'globalToLocalPoint on root (same as localToparent)' );

  assert.ok( new Vector2( 15, 5 ).equalsEpsilon( b.parentToGlobalPoint( new Vector2( 5, 5 ) ), epsilon ), 'parentToGlobalPoint on child' );
  assert.ok( new Vector2( 5, 5 ).equalsEpsilon( a.parentToGlobalPoint( new Vector2( 5, 5 ) ), epsilon ), 'parentToGlobalPoint on root' );

  assert.ok( new Vector2( -5, 5 ).equalsEpsilon( b.globalToParentPoint( new Vector2( 5, 5 ) ), epsilon ), 'globalToParentPoint on child' );
  assert.ok( new Vector2( 5, 5 ).equalsEpsilon( a.globalToParentPoint( new Vector2( 5, 5 ) ), epsilon ), 'globalToParentPoint on root' );

} );

QUnit.test( 'Bounds (parent and child)', function( assert ) {
  const a = new Node();
  const b = new Node();
  a.addChild( b );
  a.x = 10;
  b.y = 10;

  const bounds = new Bounds2( 4, 4, 20, 30 );

  assert.ok( new Bounds2( 4, 14, 20, 40 ).equalsEpsilon( b.localToParentBounds( bounds ), epsilon ), 'localToParentBounds on child' );
  assert.ok( new Bounds2( 14, 4, 30, 30 ).equalsEpsilon( a.localToParentBounds( bounds ), epsilon ), 'localToParentBounds on root' );

  assert.ok( new Bounds2( 4, -6, 20, 20 ).equalsEpsilon( b.parentToLocalBounds( bounds ), epsilon ), 'parentToLocalBounds on child' );
  assert.ok( new Bounds2( -6, 4, 10, 30 ).equalsEpsilon( a.parentToLocalBounds( bounds ), epsilon ), 'parentToLocalBounds on root' );

  assert.ok( new Bounds2( 14, 14, 30, 40 ).equalsEpsilon( b.localToGlobalBounds( bounds ), epsilon ), 'localToGlobalBounds on child' );
  assert.ok( new Bounds2( 14, 4, 30, 30 ).equalsEpsilon( a.localToGlobalBounds( bounds ), epsilon ), 'localToGlobalBounds on root (same as localToParent)' );

  assert.ok( new Bounds2( -6, -6, 10, 20 ).equalsEpsilon( b.globalToLocalBounds( bounds ), epsilon ), 'globalToLocalBounds on child' );
  assert.ok( new Bounds2( -6, 4, 10, 30 ).equalsEpsilon( a.globalToLocalBounds( bounds ), epsilon ), 'globalToLocalBounds on root (same as localToParent)' );

  assert.ok( new Bounds2( 14, 4, 30, 30 ).equalsEpsilon( b.parentToGlobalBounds( bounds ), epsilon ), 'parentToGlobalBounds on child' );
  assert.ok( new Bounds2( 4, 4, 20, 30 ).equalsEpsilon( a.parentToGlobalBounds( bounds ), epsilon ), 'parentToGlobalBounds on root' );

  assert.ok( new Bounds2( -6, 4, 10, 30 ).equalsEpsilon( b.globalToParentBounds( bounds ), epsilon ), 'globalToParentBounds on child' );
  assert.ok( new Bounds2( 4, 4, 20, 30 ).equalsEpsilon( a.globalToParentBounds( bounds ), epsilon ), 'globalToParentBounds on root' );
} );

QUnit.test( 'Points (order of transforms)', function( assert ) {
  const a = new Node();
  const b = new Node();
  const c = new Node();
  a.addChild( b );
  b.addChild( c );
  a.x = 10;
  b.scale( 2 );
  c.y = 10;

  assert.ok( new Vector2( 20, 30 ).equalsEpsilon( c.localToGlobalPoint( new Vector2( 5, 5 ) ), epsilon ), 'localToGlobalPoint' );
  assert.ok( new Vector2( -2.5, -7.5 ).equalsEpsilon( c.globalToLocalPoint( new Vector2( 5, 5 ) ), epsilon ), 'globalToLocalPoint' );
  assert.ok( new Vector2( 20, 10 ).equalsEpsilon( c.parentToGlobalPoint( new Vector2( 5, 5 ) ), epsilon ), 'parentToGlobalPoint' );
  assert.ok( new Vector2( -2.5, 2.5 ).equalsEpsilon( c.globalToParentPoint( new Vector2( 5, 5 ) ), epsilon ), 'globalToParentPoint' );
} );

QUnit.test( 'Bounds (order of transforms)', function( assert ) {
  const a = new Node();
  const b = new Node();
  const c = new Node();
  a.addChild( b );
  b.addChild( c );
  a.x = 10;
  b.scale( 2 );
  c.y = 10;

  const bounds = new Bounds2( 4, 4, 20, 30 );

  assert.ok( new Bounds2( 18, 28, 50, 80 ).equalsEpsilon( c.localToGlobalBounds( bounds ), epsilon ), 'localToGlobalBounds' );
  assert.ok( new Bounds2( -3, -8, 5, 5 ).equalsEpsilon( c.globalToLocalBounds( bounds ), epsilon ), 'globalToLocalBounds' );
  assert.ok( new Bounds2( 18, 8, 50, 60 ).equalsEpsilon( c.parentToGlobalBounds( bounds ), epsilon ), 'parentToGlobalBounds' );
  assert.ok( new Bounds2( -3, 2, 5, 15 ).equalsEpsilon( c.globalToParentBounds( bounds ), epsilon ), 'globalToParentBounds' );
} );

QUnit.test( 'Trail and Node transform equivalence', function( assert ) {
  const a = new Node();
  const b = new Node();
  const c = new Node();
  a.addChild( b );
  b.addChild( c );
  a.x = 10;
  b.scale( 2 );
  c.y = 10;

  const trailMatrix = c.getUniqueTrail().getMatrix();
  const nodeMatrix = c.getUniqueTransform().getMatrix();
  assert.ok( trailMatrix.equalsEpsilon( nodeMatrix, epsilon ), 'Trail and Node transform equivalence' );
} );

if ( Tandem.PHET_IO_ENABLED ) {

  QUnit.test( 'Node instrumented visible Property', assert => {

    // TODO: Use the AuxiliaryTandemRegistry?  See https://github.com/phetsims/tandem/issues/187
    const wasLaunched = Tandem.launched;
    if ( !Tandem.launched ) {
      Tandem.launch();
    }

    const apiValidation = phet.tandem.phetioAPIValidation;
    const previousEnabled = apiValidation.enabled;
    const previousSimStarted = apiValidation.simHasStarted;

    apiValidation.simHasStarted = false;

    const testNodeAndVisibleProperty = ( node, property ) => {
      const initialVisible = node.visible;
      assert.ok( property.value === node.visible, 'initial values should be the same' );
      node.visible = !initialVisible;
      assert.ok( property.value === !initialVisible, 'property should reflect node change' );
      property.value = initialVisible;
      assert.ok( node.visible === initialVisible, 'node should reflect property change' );

      node.visible = initialVisible;
    };

    const instrumentedVisibleProperty = new BooleanProperty( false, { tandem: Tandem.GENERAL.createTandem( 'myVisibleProperty' ) } );
    const otherInstrumentedVisibleProperty = new BooleanProperty( false, { tandem: Tandem.GENERAL.createTandem( 'myOtherVisibleProperty' ) } );
    const uninstrumentedVisibleProperty = new BooleanProperty( false );

    /***************************************
     /* Testing uninstrumented Nodes
     */


      // uninstrumentedNode => no property (before startup)
    let uninstrumented = new Node();
    assert.ok( uninstrumented.visibleProperty.targetProperty === undefined );
    testNodeAndVisibleProperty( uninstrumented, uninstrumented.visibleProperty );

    // uninstrumentedNode => uninstrumented property (before startup)
    uninstrumented = new Node( { visibleProperty: uninstrumentedVisibleProperty } );
    assert.ok( uninstrumented.visibleProperty.targetProperty === uninstrumentedVisibleProperty );
    testNodeAndVisibleProperty( uninstrumented, uninstrumentedVisibleProperty );

    //uninstrumentedNode => instrumented property (before startup)
    uninstrumented = new Node();
    uninstrumented.mutate( {
      visibleProperty: instrumentedVisibleProperty
    } );
    assert.ok( uninstrumented.visibleProperty.targetProperty === instrumentedVisibleProperty );
    testNodeAndVisibleProperty( uninstrumented, instrumentedVisibleProperty );

    //  uninstrumentedNode => instrumented property => instrument the Node (before startup) OK
    uninstrumented = new Node();
    uninstrumented.mutate( {
      visibleProperty: instrumentedVisibleProperty
    } );
    uninstrumented.mutate( { tandem: Tandem.GENERAL.createTandem( 'myNodeWithVisible' ) } );
    assert.ok( uninstrumented.visibleProperty.targetProperty === instrumentedVisibleProperty );
    testNodeAndVisibleProperty( uninstrumented, instrumentedVisibleProperty );
    uninstrumented.dispose();

    //////////////////////////////////////////////////
    apiValidation.simHasStarted = true;

    // uninstrumentedNode => no property (before startup)
    uninstrumented = new Node();
    assert.ok( uninstrumented.visibleProperty.targetProperty === undefined );
    testNodeAndVisibleProperty( uninstrumented, uninstrumented.visibleProperty );

    // uninstrumentedNode => uninstrumented property (before startup)
    uninstrumented = new Node( { visibleProperty: uninstrumentedVisibleProperty } );
    assert.ok( uninstrumented.visibleProperty.targetProperty === uninstrumentedVisibleProperty );
    testNodeAndVisibleProperty( uninstrumented, uninstrumentedVisibleProperty );

    //uninstrumentedNode => instrumented property (before startup)
    uninstrumented = new Node();
    uninstrumented.mutate( {
      visibleProperty: instrumentedVisibleProperty
    } );
    assert.ok( uninstrumented.visibleProperty.targetProperty === instrumentedVisibleProperty );
    testNodeAndVisibleProperty( uninstrumented, instrumentedVisibleProperty );

    //  uninstrumentedNode => instrumented property => instrument the Node (before startup) OK
    uninstrumented = new Node();
    uninstrumented.mutate( {
      visibleProperty: instrumentedVisibleProperty
    } );
    uninstrumented.mutate( { tandem: Tandem.GENERAL.createTandem( 'myNodeWithVisible' ) } );
    assert.ok( uninstrumented.visibleProperty.targetProperty === instrumentedVisibleProperty );
    testNodeAndVisibleProperty( uninstrumented, instrumentedVisibleProperty );
    uninstrumented.dispose();
    apiValidation.simHasStarted = false;


    /***************************************
     /* Testing instrumented nodes
     */

      // instrumentedNodeWithDefaultInstrumentedVisibleProperty => instrumented property (before startup)
    let instrumented = new Node( {
        tandem: Tandem.GENERAL.createTandem( 'myNodeWithVisible' )
      } );
    assert.ok( instrumented.visibleProperty.targetProperty === instrumented.visibleProperty.ownedPhetioProperty );
    assert.ok( instrumented.linkedElements.length === 0, 'no linked elements for default visible Property' );
    testNodeAndVisibleProperty( instrumented, instrumented.visibleProperty );
    instrumented.dispose();

    // instrumentedNodeWithDefaultInstrumentedVisibleProperty => uninstrumented property (before startup)
    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithVisible' )
    } );
    window.assert && assert.throws( () => {
      instrumented.mutate( { visibleProperty: uninstrumentedVisibleProperty } );
    }, 'cannot remove instrumentation from the Node\'s visibleProperty' );
    instrumented.dispose();

    // instrumentedNodeWithPassedInInstrumentedVisibleProperty => instrumented property (before startup)
    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithVisible' )
    } );
    instrumented.mutate( { visibleProperty: instrumentedVisibleProperty } );
    assert.ok( instrumented.visibleProperty.targetProperty === instrumentedVisibleProperty );
    assert.ok( instrumented.linkedElements.length === 1, 'added linked element' );
    assert.ok( instrumented.linkedElements[ 0 ].element === instrumentedVisibleProperty,
      'added linked element should be for visibleProperty ' );
    testNodeAndVisibleProperty( instrumented, instrumentedVisibleProperty );
    instrumented.dispose();

    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithVisible' ),
      visibleProperty: instrumentedVisibleProperty
    } );
    assert.ok( instrumented.visibleProperty.targetProperty === instrumentedVisibleProperty );
    assert.ok( instrumented.linkedElements.length === 1, 'added linked element' );
    assert.ok( instrumented.linkedElements[ 0 ].element === instrumentedVisibleProperty,
      'added linked element should be for visibleProperty ' );
    testNodeAndVisibleProperty( instrumented, instrumentedVisibleProperty );
    instrumented.dispose();

    // instrumentedNodeWithPassedInInstrumentedVisibleProperty => uninstrumented property (before startup)
    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithVisible' ),
      visibleProperty: instrumentedVisibleProperty
    } );
    window.assert && assert.throws( () => {
      instrumented.mutate( { visibleProperty: uninstrumentedVisibleProperty } );
    }, 'cannot remove instrumentation from the Node\'s visibleProperty' );
    instrumented.dispose();
    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithVisible' )
    } );
    instrumented.mutate( { visibleProperty: instrumentedVisibleProperty } );
    window.assert && assert.throws( () => {
      instrumented.mutate( { visibleProperty: uninstrumentedVisibleProperty } );
    }, 'cannot remove instrumentation from the Node\'s visibleProperty' );
    instrumented.dispose();

    apiValidation.enabled = true;
    apiValidation.simHasStarted = true;
    // instrumentedNodeWithDefaultInstrumentedVisibleProperty => instrumented property (after startup)
    const instrumented1 = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myVisibleUniquelyNamedNodeThatWillNotBeDuplicated1' )
    } );
    assert.ok( instrumented1.visibleProperty.targetProperty === instrumented1.visibleProperty.ownedPhetioProperty );
    assert.ok( instrumented1.linkedElements.length === 0, 'no linked elements for default visible Property' );
    testNodeAndVisibleProperty( instrumented1, instrumented1.visibleProperty );

    // instrumentedNodeWithDefaultInstrumentedVisibleProperty => uninstrumented property (after startup)
    const instrumented2 = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myVisibleUniquelyNamedNodeThatWillNotBeDuplicated2' )
    } );
    window.assert && assert.throws( () => {
      instrumented2.setVisibleProperty( uninstrumentedVisibleProperty );
    }, 'cannot remove instrumentation from the Node\'s visibleProperty' );

    // instrumentedNodeWithPassedInInstrumentedVisibleProperty => instrumented property (after startup)
    const instrumented3 = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myVisibleUniquelyNamedNodeThatWillNotBeDuplicated3' ),
      visibleProperty: instrumentedVisibleProperty
    } );

    window.assert && assert.throws( () => {
      instrumented3.mutate( { visibleProperty: otherInstrumentedVisibleProperty } );
    }, 'cannot swap out one instrumented for another' );

    // instrumentedNodeWithPassedInInstrumentedVisibleProperty => uninstrumented property (after startup)
    const instrumented4 = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myVisibleUniquelyNamedNodeThatWillNotBeDuplicated4' ),
      visibleProperty: instrumentedVisibleProperty
    } );
    window.assert && assert.throws( () => {
      instrumented4.mutate( { visibleProperty: uninstrumentedVisibleProperty } );
    }, 'cannot remove instrumentation from the Node\'s visibleProperty' );
    const instrumented5 = new Node( {} );
    instrumented5.mutate( { visibleProperty: instrumentedVisibleProperty } );
    instrumented5.mutate( { tandem: Tandem.GENERAL.createTandem( 'myVisibleUniquelyNamedNodeThatWillNotBeDuplicated5' ) } );
    window.assert && assert.throws( () => {
      instrumented5.mutate( { visibleProperty: uninstrumentedVisibleProperty } );
    }, 'cannot remove instrumentation from the Node\'s visibleProperty' );
    apiValidation.enabled = false;

    instrumented1.dispose();

    // These can't be disposed because they were broken while creating (on purpose in an assert.throws()). These elements
    // have special Tandem component names to make sure that they don't interfere with other tests (since they can't be
    // removed from the registry
    // instrumented2.dispose();
    // instrumented3.dispose();
    // instrumented4.dispose();
    // instrumented5.dispose();

    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithVisible' )
    } );
    window.assert && assert.throws( () => {
      instrumented.setVisibleProperty( null );
    }, 'cannot clear out an instrumented visibleProperty' );


    instrumentedVisibleProperty.dispose();
    otherInstrumentedVisibleProperty.dispose();
    apiValidation.simHasStarted = previousSimStarted;
    apiValidation.enabled = previousEnabled;

    if ( !wasLaunched ) {
      Tandem.unlaunch();
    }
  } );

  QUnit.test( 'Node instrumented pickable Property', assert => {

    // TODO: Use the AuxiliaryTandemRegistry?  See https://github.com/phetsims/tandem/issues/187
    const wasLaunched = Tandem.launched;
    if ( !Tandem.launched ) {
      Tandem.launch();
    }

    const apiValidation = phet.tandem.phetioAPIValidation;
    const previousEnabled = apiValidation.enabled;
    const previousSimStarted = apiValidation.simHasStarted;

    apiValidation.simHasStarted = false;

    const testNodeAndPickableProperty = ( node, property ) => {
      const initialPickable = node.pickable;
      assert.ok( property.value === node.pickable, 'initial values should be the same' );
      node.pickable = !initialPickable;
      assert.ok( property.value === !initialPickable, 'property should reflect node change' );
      property.value = initialPickable;
      assert.ok( node.pickable === initialPickable, 'node should reflect property change' );

      node.pickable = initialPickable;
    };

    const instrumentedPickableProperty = new BooleanProperty( false, { tandem: Tandem.GENERAL.createTandem( 'myPickableProperty' ) } );
    const otherInstrumentedPickableProperty = new BooleanProperty( false, { tandem: Tandem.GENERAL.createTandem( 'myOtherPickableProperty' ) } );
    const uninstrumentedPickableProperty = new BooleanProperty( false );

    /***************************************
     /* Testing uninstrumented Nodes
     */


      // uninstrumentedNode => no property (before startup)
    let uninstrumented = new Node();
    assert.ok( uninstrumented.pickableProperty.targetProperty === undefined );
    testNodeAndPickableProperty( uninstrumented, uninstrumented.pickableProperty );

    // uninstrumentedNode => uninstrumented property (before startup)
    uninstrumented = new Node( { pickableProperty: uninstrumentedPickableProperty } );
    assert.ok( uninstrumented.pickableProperty.targetProperty === uninstrumentedPickableProperty );
    testNodeAndPickableProperty( uninstrumented, uninstrumentedPickableProperty );

    //uninstrumentedNode => instrumented property (before startup)
    uninstrumented = new Node();
    uninstrumented.mutate( {
      pickableProperty: instrumentedPickableProperty
    } );
    assert.ok( uninstrumented.pickableProperty.targetProperty === instrumentedPickableProperty );
    testNodeAndPickableProperty( uninstrumented, instrumentedPickableProperty );

    //  uninstrumentedNode => instrumented property => instrument the Node (before startup) OK
    uninstrumented = new Node();
    uninstrumented.mutate( {
      pickableProperty: instrumentedPickableProperty
    } );
    uninstrumented.mutate( { tandem: Tandem.GENERAL.createTandem( 'myNodeWithPickable' ) } );
    assert.ok( uninstrumented.pickableProperty.targetProperty === instrumentedPickableProperty );
    testNodeAndPickableProperty( uninstrumented, instrumentedPickableProperty );
    uninstrumented.dispose();

    //////////////////////////////////////////////////
    apiValidation.simHasStarted = true;

    // uninstrumentedNode => no property (before startup)
    uninstrumented = new Node();
    assert.ok( uninstrumented.pickableProperty.targetProperty === undefined );
    testNodeAndPickableProperty( uninstrumented, uninstrumented.pickableProperty );

    // uninstrumentedNode => uninstrumented property (before startup)
    uninstrumented = new Node( { pickableProperty: uninstrumentedPickableProperty } );
    assert.ok( uninstrumented.pickableProperty.targetProperty === uninstrumentedPickableProperty );
    testNodeAndPickableProperty( uninstrumented, uninstrumentedPickableProperty );

    //uninstrumentedNode => instrumented property (before startup)
    uninstrumented = new Node();
    uninstrumented.mutate( {
      pickableProperty: instrumentedPickableProperty
    } );
    assert.ok( uninstrumented.pickableProperty.targetProperty === instrumentedPickableProperty );
    testNodeAndPickableProperty( uninstrumented, instrumentedPickableProperty );

    //  uninstrumentedNode => instrumented property => instrument the Node (before startup) OK
    uninstrumented = new Node();
    uninstrumented.mutate( {
      pickableProperty: instrumentedPickableProperty
    } );

    uninstrumented.mutate( { tandem: Tandem.GENERAL.createTandem( 'myNodeWithPickable' ) } );
    assert.ok( uninstrumented.pickableProperty.targetProperty === instrumentedPickableProperty );
    testNodeAndPickableProperty( uninstrumented, instrumentedPickableProperty );
    uninstrumented.dispose();
    apiValidation.simHasStarted = false;


    /***************************************
     /* Testing instrumented nodes
     */

      // instrumentedNodeWithDefaultInstrumentedPickableProperty => instrumented property (before startup)
    let instrumented = new Node( {
        tandem: Tandem.GENERAL.createTandem( 'myNodeWithPickable' ),
        pickablePropertyPhetioInstrumented: true
      } );
    assert.ok( instrumented.pickableProperty.targetProperty === instrumented.pickableProperty.ownedPhetioProperty );
    assert.ok( instrumented.linkedElements.length === 0, 'no linked elements for default pickable Property' );
    testNodeAndPickableProperty( instrumented, instrumented.pickableProperty );
    instrumented.dispose();

    // instrumentedNodeWithDefaultInstrumentedPickableProperty => uninstrumented property (before startup)
    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithPickable' ),
      pickablePropertyPhetioInstrumented: true
    } );
    window.assert && assert.throws( () => {
      instrumented.mutate( { pickableProperty: uninstrumentedPickableProperty } );
    }, 'cannot remove instrumentation from the Node\'s pickableProperty' );
    instrumented.dispose();

    // instrumentedNodeWithPassedInInstrumentedPickableProperty => instrumented property (before startup)
    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithPickable' ),
      pickablePropertyPhetioInstrumented: true
    } );
    instrumented.mutate( { pickableProperty: instrumentedPickableProperty } );
    assert.ok( instrumented.pickableProperty.targetProperty === instrumentedPickableProperty );
    assert.ok( instrumented.linkedElements.length === 1, 'added linked element' );
    assert.ok( instrumented.linkedElements[ 0 ].element === instrumentedPickableProperty,
      'added linked element should be for pickableProperty ' );
    testNodeAndPickableProperty( instrumented, instrumentedPickableProperty );
    instrumented.dispose();

    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithPickable' ),
      pickableProperty: instrumentedPickableProperty
    } );
    assert.ok( instrumented.pickableProperty.targetProperty === instrumentedPickableProperty );
    assert.ok( instrumented.linkedElements.length === 1, 'added linked element' );
    assert.ok( instrumented.linkedElements[ 0 ].element === instrumentedPickableProperty,
      'added linked element should be for pickableProperty ' );
    testNodeAndPickableProperty( instrumented, instrumentedPickableProperty );
    instrumented.dispose();

    // instrumentedNodeWithPassedInInstrumentedPickableProperty => uninstrumented property (before startup)
    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithPickable' ),
      pickableProperty: instrumentedPickableProperty
    } );
    window.assert && assert.throws( () => {
      instrumented.mutate( { pickableProperty: uninstrumentedPickableProperty } );
    }, 'cannot remove instrumentation from the Node\'s pickableProperty' );
    instrumented.dispose();
    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithPickable' )
    } );
    instrumented.mutate( { pickableProperty: instrumentedPickableProperty } );
    window.assert && assert.throws( () => {
      instrumented.mutate( { pickableProperty: uninstrumentedPickableProperty } );
    }, 'cannot remove instrumentation from the Node\'s pickableProperty' );
    instrumented.dispose();

    apiValidation.enabled = true;
    apiValidation.simHasStarted = true;
    // instrumentedNodeWithDefaultInstrumentedPickableProperty => instrumented property (after startup)
    const instrumented1 = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myPickableUniquelyNamedNodeThatWillNotBeDuplicated1' ),
      pickablePropertyPhetioInstrumented: true
    } );
    assert.ok( instrumented1.pickableProperty.targetProperty === instrumented1.pickableProperty.ownedPhetioProperty );
    assert.ok( instrumented1.linkedElements.length === 0, 'no linked elements for default pickable Property' );
    testNodeAndPickableProperty( instrumented1, instrumented1.pickableProperty );

    // instrumentedNodeWithDefaultInstrumentedPickableProperty => uninstrumented property (after startup)
    const instrumented2 = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myPickableUniquelyNamedNodeThatWillNotBeDuplicated2' ),
      pickablePropertyPhetioInstrumented: true
    } );
    window.assert && assert.throws( () => {
      instrumented2.setPickableProperty( uninstrumentedPickableProperty );
    }, 'cannot remove instrumentation from the Node\'s pickableProperty' );

    // instrumentedNodeWithPassedInInstrumentedPickableProperty => instrumented property (after startup)
    const instrumented3 = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myPickableUniquelyNamedNodeThatWillNotBeDuplicated3' ),
      pickableProperty: instrumentedPickableProperty
    } );

    window.assert && assert.throws( () => {
      instrumented3.mutate( { pickableProperty: otherInstrumentedPickableProperty } );
    }, 'cannot swap out one instrumented for another' );

    // instrumentedNodeWithPassedInInstrumentedPickableProperty => uninstrumented property (after startup)
    const instrumented4 = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myPickableUniquelyNamedNodeThatWillNotBeDuplicated4' ),
      pickableProperty: instrumentedPickableProperty
    } );
    window.assert && assert.throws( () => {
      instrumented4.mutate( { pickableProperty: uninstrumentedPickableProperty } );
    }, 'cannot remove instrumentation from the Node\'s pickableProperty' );
    const instrumented5 = new Node( {} );
    instrumented5.mutate( { pickableProperty: instrumentedPickableProperty } );
    instrumented5.mutate( { tandem: Tandem.GENERAL.createTandem( 'myPickableUniquelyNamedNodeThatWillNotBeDuplicated5' ) } );
    window.assert && assert.throws( () => {
      instrumented5.mutate( { pickableProperty: uninstrumentedPickableProperty } );
    }, 'cannot remove instrumentation from the Node\'s pickableProperty' );
    apiValidation.enabled = false;

    instrumented1.dispose();

    // These can't be disposed because they were broken while creating (on purpose in an assert.throws()). These elements
    // have special Tandem component names to make sure that they don't interfere with other tests (since they can't be
    // removed from the registry
    // instrumented2.dispose();
    // instrumented3.dispose();
    // instrumented4.dispose();
    // instrumented5.dispose();

    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithPickable' ),
      pickablePropertyPhetioInstrumented: true
    } );
    window.assert && assert.throws( () => {
      instrumented.setPickableProperty( null );
    }, 'cannot clear out an instrumented pickableProperty' );
    instrumented.dispose();


    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithPickable' )
    } );
    window.assert && assert.throws( () => {
      instrumented.pickablePropertyPhetioInstrumented = true;
    }, 'cannot set pickablePropertyPhetioInstrumented after instrumentation' );
    instrumented.dispose();


    instrumentedPickableProperty.dispose();
    otherInstrumentedPickableProperty.dispose();
    apiValidation.simHasStarted = previousSimStarted;
    apiValidation.enabled = previousEnabled;

    if ( !wasLaunched ) {
      Tandem.unlaunch();
    }
  } );

  QUnit.test( 'Node instrumented enabled Property', assert => {

    // TODO: Use the AuxiliaryTandemRegistry?  See https://github.com/phetsims/tandem/issues/187
    const wasLaunched = Tandem.launched;
    if ( !Tandem.launched ) {
      Tandem.launch();
    }

    const apiValidation = phet.tandem.phetioAPIValidation;
    const previousEnabled = apiValidation.enabled;
    const previousSimStarted = apiValidation.simHasStarted;

    apiValidation.simHasStarted = false;

    const testNodeAndEnabledProperty = ( node, property ) => {
      const initialEnabled = node.enabled;
      assert.ok( property.value === node.enabled, 'initial values should be the same' );
      node.enabled = !initialEnabled;
      assert.ok( property.value === !initialEnabled, 'property should reflect node change' );
      property.value = initialEnabled;
      assert.ok( node.enabled === initialEnabled, 'node should reflect property change' );

      node.enabled = initialEnabled;
    };

    const instrumentedEnabledProperty = new BooleanProperty( false, { tandem: Tandem.GENERAL.createTandem( 'myEnabledProperty' ) } );
    const otherInstrumentedEnabledProperty = new BooleanProperty( false, { tandem: Tandem.GENERAL.createTandem( 'myOtherEnabledProperty' ) } );
    const uninstrumentedEnabledProperty = new BooleanProperty( false );

    /***************************************
     /* Testing uninstrumented Nodes
     */


      // uninstrumentedNode => no property (before startup)
    let uninstrumented = new Node();
    assert.ok( uninstrumented.enabledProperty.targetProperty === undefined );
    testNodeAndEnabledProperty( uninstrumented, uninstrumented.enabledProperty );

    // uninstrumentedNode => uninstrumented property (before startup)
    uninstrumented = new Node( { enabledProperty: uninstrumentedEnabledProperty } );
    assert.ok( uninstrumented.enabledProperty.targetProperty === uninstrumentedEnabledProperty );
    testNodeAndEnabledProperty( uninstrumented, uninstrumentedEnabledProperty );

    //uninstrumentedNode => instrumented property (before startup)
    uninstrumented = new Node();
    uninstrumented.mutate( {
      enabledProperty: instrumentedEnabledProperty
    } );
    assert.ok( uninstrumented.enabledProperty.targetProperty === instrumentedEnabledProperty );
    testNodeAndEnabledProperty( uninstrumented, instrumentedEnabledProperty );

    //  uninstrumentedNode => instrumented property => instrument the Node (before startup) OK
    uninstrumented = new Node();
    uninstrumented.mutate( {
      enabledProperty: instrumentedEnabledProperty
    } );
    uninstrumented.mutate( { tandem: Tandem.GENERAL.createTandem( 'myNodeWithEnabled' ) } );
    assert.ok( uninstrumented.enabledProperty.targetProperty === instrumentedEnabledProperty );
    testNodeAndEnabledProperty( uninstrumented, instrumentedEnabledProperty );
    uninstrumented.dispose();

    //////////////////////////////////////////////////
    apiValidation.simHasStarted = true;

    // uninstrumentedNode => no property (before startup)
    uninstrumented = new Node();
    assert.ok( uninstrumented.enabledProperty.targetProperty === undefined );
    testNodeAndEnabledProperty( uninstrumented, uninstrumented.enabledProperty );

    // uninstrumentedNode => uninstrumented property (before startup)
    uninstrumented = new Node( { enabledProperty: uninstrumentedEnabledProperty } );
    assert.ok( uninstrumented.enabledProperty.targetProperty === uninstrumentedEnabledProperty );
    testNodeAndEnabledProperty( uninstrumented, uninstrumentedEnabledProperty );

    //uninstrumentedNode => instrumented property (before startup)
    uninstrumented = new Node();
    uninstrumented.mutate( {
      enabledProperty: instrumentedEnabledProperty
    } );
    assert.ok( uninstrumented.enabledProperty.targetProperty === instrumentedEnabledProperty );
    testNodeAndEnabledProperty( uninstrumented, instrumentedEnabledProperty );

    //  uninstrumentedNode => instrumented property => instrument the Node (before startup) OK
    uninstrumented = new Node();
    uninstrumented.mutate( {
      enabledProperty: instrumentedEnabledProperty
    } );

    uninstrumented.mutate( { tandem: Tandem.GENERAL.createTandem( 'myNodeWithEnabled' ) } );
    assert.ok( uninstrumented.enabledProperty.targetProperty === instrumentedEnabledProperty );
    testNodeAndEnabledProperty( uninstrumented, instrumentedEnabledProperty );
    uninstrumented.dispose();
    apiValidation.simHasStarted = false;


    /***************************************
     /* Testing instrumented nodes
     */

      // instrumentedNodeWithDefaultInstrumentedEnabledProperty => instrumented property (before startup)
    let instrumented = new Node( {
        tandem: Tandem.GENERAL.createTandem( 'myNodeWithEnabled' ),
        enabledPropertyPhetioInstrumented: true
      } );
    assert.ok( instrumented.enabledProperty.targetProperty === instrumented.enabledProperty.ownedPhetioProperty );
    assert.ok( instrumented.linkedElements.length === 0, 'no linked elements for default enabled Property' );
    testNodeAndEnabledProperty( instrumented, instrumented.enabledProperty );
    instrumented.dispose();

    // instrumentedNodeWithDefaultInstrumentedEnabledProperty => uninstrumented property (before startup)
    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithEnabled' ),
      enabledPropertyPhetioInstrumented: true
    } );
    window.assert && assert.throws( () => {
      instrumented.mutate( { enabledProperty: uninstrumentedEnabledProperty } );
    }, 'cannot remove instrumentation from the Node\'s enabledProperty' );
    instrumented.dispose();

    // instrumentedNodeWithPassedInInstrumentedEnabledProperty => instrumented property (before startup)
    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithEnabled' ),
      enabledPropertyPhetioInstrumented: true
    } );
    instrumented.mutate( { enabledProperty: instrumentedEnabledProperty } );
    assert.ok( instrumented.enabledProperty.targetProperty === instrumentedEnabledProperty );
    assert.ok( instrumented.linkedElements.length === 1, 'added linked element' );
    assert.ok( instrumented.linkedElements[ 0 ].element === instrumentedEnabledProperty,
      'added linked element should be for enabledProperty ' );
    testNodeAndEnabledProperty( instrumented, instrumentedEnabledProperty );
    instrumented.dispose();

    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithEnabled' ),
      enabledProperty: instrumentedEnabledProperty
    } );
    assert.ok( instrumented.enabledProperty.targetProperty === instrumentedEnabledProperty );
    assert.ok( instrumented.linkedElements.length === 1, 'added linked element' );
    assert.ok( instrumented.linkedElements[ 0 ].element === instrumentedEnabledProperty,
      'added linked element should be for enabledProperty ' );
    testNodeAndEnabledProperty( instrumented, instrumentedEnabledProperty );
    instrumented.dispose();

    // instrumentedNodeWithPassedInInstrumentedEnabledProperty => uninstrumented property (before startup)
    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithEnabled' ),
      enabledProperty: instrumentedEnabledProperty
    } );
    window.assert && assert.throws( () => {
      instrumented.mutate( { enabledProperty: uninstrumentedEnabledProperty } );
    }, 'cannot remove instrumentation from the Node\'s enabledProperty' );
    instrumented.dispose();
    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithEnabled' )
    } );
    instrumented.mutate( { enabledProperty: instrumentedEnabledProperty } );
    window.assert && assert.throws( () => {
      instrumented.mutate( { enabledProperty: uninstrumentedEnabledProperty } );
    }, 'cannot remove instrumentation from the Node\'s enabledProperty' );
    instrumented.dispose();

    apiValidation.enabled = true;
    apiValidation.simHasStarted = true;
    // instrumentedNodeWithDefaultInstrumentedEnabledProperty => instrumented property (after startup)
    const instrumented1 = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myEnabledUniquelyNamedNodeThatWillNotBeDuplicated1' ),
      enabledPropertyPhetioInstrumented: true
    } );
    assert.ok( instrumented1.enabledProperty.targetProperty === instrumented1.enabledProperty.ownedPhetioProperty );
    assert.ok( instrumented1.linkedElements.length === 0, 'no linked elements for default enabled Property' );
    testNodeAndEnabledProperty( instrumented1, instrumented1.enabledProperty );

    // instrumentedNodeWithDefaultInstrumentedEnabledProperty => uninstrumented property (after startup)
    const instrumented2 = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myEnabledUniquelyNamedNodeThatWillNotBeDuplicated2' ),
      enabledPropertyPhetioInstrumented: true
    } );
    window.assert && assert.throws( () => {
      instrumented2.setEnabledProperty( uninstrumentedEnabledProperty );
    }, 'cannot remove instrumentation from the Node\'s enabledProperty' );

    // instrumentedNodeWithPassedInInstrumentedEnabledProperty => instrumented property (after startup)
    const instrumented3 = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myEnabledUniquelyNamedNodeThatWillNotBeDuplicated3' ),
      enabledProperty: instrumentedEnabledProperty
    } );

    window.assert && assert.throws( () => {
      instrumented3.mutate( { enabledProperty: otherInstrumentedEnabledProperty } );
    }, 'cannot swap out one instrumented for another' );

    // instrumentedNodeWithPassedInInstrumentedEnabledProperty => uninstrumented property (after startup)
    const instrumented4 = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myEnabledUniquelyNamedNodeThatWillNotBeDuplicated4' ),
      enabledProperty: instrumentedEnabledProperty
    } );
    window.assert && assert.throws( () => {
      instrumented4.mutate( { enabledProperty: uninstrumentedEnabledProperty } );
    }, 'cannot remove instrumentation from the Node\'s enabledProperty' );
    const instrumented5 = new Node( {} );
    instrumented5.mutate( { enabledProperty: instrumentedEnabledProperty } );
    instrumented5.mutate( { tandem: Tandem.GENERAL.createTandem( 'myEnabledUniquelyNamedNodeThatWillNotBeDuplicated5' ) } );
    window.assert && assert.throws( () => {
      instrumented5.mutate( { enabledProperty: uninstrumentedEnabledProperty } );
    }, 'cannot remove instrumentation from the Node\'s enabledProperty' );
    apiValidation.enabled = false;

    instrumented1.dispose();

    // These can't be disposed because they were broken while creating (on purpose in an assert.throws()). These elements
    // have special Tandem component names to make sure that they don't interfere with other tests (since they can't be
    // removed from the registry
    // instrumented2.dispose();
    // instrumented3.dispose();
    // instrumented4.dispose();
    // instrumented5.dispose();

    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithEnabled' ),
      enabledPropertyPhetioInstrumented: true
    } );
    window.assert && assert.throws( () => {
      instrumented.setEnabledProperty( null );
    }, 'cannot clear out an instrumented enabledProperty' );
    instrumented.dispose();


    instrumented = new Node( {
      tandem: Tandem.GENERAL.createTandem( 'myNodeWithEnabled' )
    } );
    window.assert && assert.throws( () => {
      instrumented.enabledPropertyPhetioInstrumented = true;
    }, 'cannot set enabledPropertyPhetioInstrumented after instrumentation' );
    instrumented.dispose();


    instrumentedEnabledProperty.dispose();
    otherInstrumentedEnabledProperty.dispose();
    apiValidation.simHasStarted = previousSimStarted;
    apiValidation.enabled = previousEnabled;

    if ( !wasLaunched ) {
      Tandem.unlaunch();
    }
  } );
}

QUnit.test( 'Node.enabledProperty', assert => {

  let node = new Node();

  testEnabledNode( assert, node, 'For Node' );

  const disabledOpacity = .2;
  node = new Node( {
    disabledOpacity: disabledOpacity
  } );

  assert.ok( node.opacity === new Node().opacity, 'opacity should default to Node default' );
  node.enabled = false;
  assert.ok( node.opacity === disabledOpacity, 'test disabled opacity' );

  node.dispose();
  assert.ok( node.enabledProperty.isDisposed, 'should be disposed' );

  const myEnabledProperty = new BooleanProperty( true );
  const defaultListenerCount = myEnabledProperty.changedEmitter.getListenerCount();
  const node2 = new Node( {
    enabledProperty: myEnabledProperty
  } );
  assert.ok( myEnabledProperty.changedEmitter.getListenerCount() > defaultListenerCount, 'listener count should be more since passing in enabledProperty' );

  node2.dispose();
  assert.ok( myEnabledProperty.changedEmitter.getListenerCount() === defaultListenerCount, 'listener count should match original' );
} );

QUnit.test( 'Node.enabledProperty with PDOM', assert => {

  const rootNode = new Node( { tagName: 'div' } );
  var display = new Display( rootNode ); // eslint-disable-line
  document.body.appendChild( display.domElement );

  const a11yNode = new Node( {
    tagName: 'p'
  } );

  rootNode.addChild( a11yNode );
  assert.ok( a11yNode.accessibleInstances.length === 1, 'should have an instance when attached to display' );
  assert.ok( !!a11yNode.accessibleInstances[ 0 ].peer, 'should have a peer' );

  // TODO: is it important that aria-disabled is false on all enabled Nodes? See https://github.com/phetsims/scenery/issues/1100
  // assert.ok( a11yNode.accessibleInstances[ 0 ].peer.primarySibling.getAttribute( 'aria-disabled' ) === 'false', 'should be enabled' );

  a11yNode.enabled = false;
  assert.ok( a11yNode.accessibleInstances[ 0 ].peer.primarySibling.getAttribute( 'aria-disabled' ) === 'true', 'should be enabled' );
  testEnabledNode( assert, a11yNode, 'For accessible Node' );
} );

QUnit.test( 'Node.enabledProperty in Slider', assert => {
  let slider = new HSlider( new Property( 0 ), new Range( 0, 10 ), {
    tandem: Tandem.GENERAL.createTandem( 'mySlider' )
  } );
  testEnabledNode( assert, slider, 'For Slider' );
  slider.dispose();

  const myEnabledProperty = new BooleanProperty( true, { tandem: Tandem.GENERAL.createTandem( 'myEnabledProperty' ) } );
  slider = new HSlider( new Property( 0 ), new Range( 0, 10 ), {
    tandem: Tandem.GENERAL.createTandem( 'mySlider' ),
    enabledProperty: myEnabledProperty
  } );
  testEnabledNode( assert, slider, 'For Slider' );
  slider.dispose();
  myEnabledProperty.dispose();
} );

/**
 * Test basic functionality for an object that mixes in EnabledComponent
 * @param {Object} assert - from QUnit
 * @param {Object} enabledNode - mixed in with EnabledComponent
 * @param {string} message - to tack onto assert messages
 */
function testEnabledNode( assert, enabledNode, message ) {
  assert.ok( enabledNode.enabledProperty instanceof Property || enabledNode.enabledProperty instanceof TinyProperty, `${message}: enabledProperty should exist` );

  assert.ok( enabledNode.enabledProperty.value === enabledNode.enabled, `${message}: test getter` );

  enabledNode.enabled = false;
  assert.ok( enabledNode.enabled === false, `${message}: test setter` );
  assert.ok( enabledNode.enabledProperty.value === enabledNode.enabled, `${message}: test getter after setting` );
  assert.ok( enabledNode.enabledProperty.value === false, `${message}: test getter after setting` );
}
