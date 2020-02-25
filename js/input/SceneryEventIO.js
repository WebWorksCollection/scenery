// Copyright 2018-2020, University of Colorado Boulder

/**
 * IO type for SceneryEvent
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
define( require => {
  'use strict';

  // modules
  const ObjectIO = require( 'TANDEM/types/ObjectIO' );
  const scenery = require( 'SCENERY/scenery' );
  const SceneryEvent = require( 'SCENERY/input/SceneryEvent' );
  const Vector2IO = require( 'DOT/Vector2IO' );
  const validate = require( 'AXON/validate' );

  class SceneryEventIO extends ObjectIO {

    /**
     * @param {SceneryEvent} event
     * @returns {Object}
     * @override
     */
    static toStateObject( event ) {
      validate( event, this.validator );

      const eventObject = {
        type: event.type
      };

      if ( event.domEvent ) {
        eventObject.domEventType = event.domEvent.type;
      }
      if ( event.pointer && event.pointer.point ) {
        eventObject.point = Vector2IO.toStateObject( event.pointer.point );
      }

      // Note: If changing the contents of this object, please document it in the public documentation string.
      return eventObject;
    }
  }

  SceneryEventIO.documentation = 'An event, with a point';
  SceneryEventIO.validator = { valueType: SceneryEvent };
  SceneryEventIO.typeName = 'SceneryEventIO';
  ObjectIO.validateSubtype( SceneryEventIO );

  return scenery.register( 'SceneryEventIO', SceneryEventIO );
} );

