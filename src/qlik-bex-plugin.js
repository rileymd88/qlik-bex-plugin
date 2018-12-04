import paint from './paint.js';
import properties from '../static/properties.js';
import localCss from './style.scss';

export default window.define(['qlik', 'jquery', './static/config'], function(qlik, $) {
  return {
    paint: paint,
    definition: properties
  }
})