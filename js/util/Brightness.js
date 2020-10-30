// Copyright 2020, University of Colorado Boulder

/**
 * Brightness filter
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

import toSVGNumber from '../../../dot/js/toSVGNumber.js';
import scenery from '../scenery.js';
import Filter from './Filter.js';

class Brightness extends Filter {
  /**
   * @param {number} amount
   */
  constructor( amount ) {
    assert && assert( typeof amount === 'number', 'Brightness amount should be a number' );
    assert && assert( isFinite( amount ), 'Brightness amount should be finite' );
    assert && assert( amount >= 0, 'Brightness amount should be non-negative' );

    super();

    // @public {number}
    this.amount = amount;
  }

  /**
   * @public
   * @override
   *
   * @returns {string}
   */
  getCSSFilterString() {
    return `brightness(${toSVGNumber( this.amount )})`;
  }

  /**
   * @public
   * @override
   *
   * @param {SVGFilterElement} svgFilter
   * @param {string} inName
   * @param {string} [resultName]
   */
  applySVGFilter( svgFilter, inName, resultName ) {
    const n = toSVGNumber( this.amount );

    Filter.applyColorMatrix(
      `${n} 0 0 0 0 ` +
      `0 ${n} 0 0 0 ` +
      `0 0 ${n} 0 0 ` +
      '0 0 0 1 0',
      svgFilter, inName, resultName
    );
  }

  /**
   * @public
   * @override
   *
   * @returns {*}
   */
  isDOMCompatible() {
    return true;
  }

  /**
   * @public
   * @override
   *
   * @returns {boolean}
   */
  isSVGCompatible() {
    return true;
  }
}

scenery.register( 'Brightness', Brightness );
export default Brightness;