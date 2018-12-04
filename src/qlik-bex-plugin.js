import paint from './paint.js';
import properties from '../static/properties.js';
import config from '../static/config.js';
import localCss from './style.scss';

export default window.define(['qlik', 'jquery', './static/config'], function(qlik, $) {
  return {
    paint: paint,
    definition: properties,
    config: config
  }
})