import window from './globals/window';
import Logger from './logger';

const logger = new Logger('odl/lib/utils');

// extend object with other object
function extend(obj1, obj2) {
  const keys = Object.keys(obj2);
  for (let i = 0; i < keys.length; i += 1) {
    const val = obj2[keys[i]];
    obj1[keys[i]] = ['string', 'number', 'boolean'].indexOf(typeof val) === -1 && typeof val.length === 'undefined' ? extend(obj1[keys[i]] || {}, val) : val;
  }
  return obj1;
}

/**
 * Scan a given node (or the entire DOM) for metatags containing stringified JSON
 * and return the parsed and aggregated object. Returns false and logs an error message, if
 * any error occured (@TODO: use Promise return instead).
 *
 * @param {Object}  name  name value of the metatag to be collected
 * @param {Function}  callback  function to be called for each metadata item (gets passed (optional) error message, element and parsed data object as arguments)
 * @param {String|HTMLElement}  context  (optional) any CSS selector or HTMLElement, if defined it limits the lookup context to the given element
 * @param {Object}  data  initial data, gets extended with the collected data
 */
function collectMetadata(name, callback, context = null, data = {}) {
  // get parent element to be queried (or use entire document as default)
  let parent = window.document;
  if (context) {
    parent = typeof context === 'string' ? window.document.querySelector(context) : context;
    if (!parent) {
      logger.error(`collectMetadata: context with selector "${context}" not found`);
      return false;
    }
  }
  // collect metatags and build up data
  const metatags = parent.querySelectorAll(`meta[name="${name}"]`);
  if (metatags) {
    for (let i = 0; i < metatags.length; i += 1) {
      const el = metatags[i];
      let o = null;
      try {
        o = JSON.parse(el.getAttribute('content'));
      } catch (e) {
        callback(`collectMetadata: parse error ${e.message}: ${e}`);
        break;
      }
      extend(data, o);
      callback(null, el, o);
    }
  }
  return data;
}

/**
 * Create a method queue handler within the provided target object. It can be used to
 * communicate with the provided API without the need to directly access the module.
 *
 * @param context     {Object}  object scope in which to create handler (e.g. window)
 * @param queueName   {String}  identifier to use as method queue name (e.g. "_odlq")
 * @param apiObj      {Object}  object scope to use for calling the provided methods on
 */
function createMethodQueueHandler(context, queueName, api = {}) {
  function _mqExec(_api, _arr) {
    if (typeof _api[_arr[0]] === 'function') {
      _api[_arr[0]].apply(_api, _arr.splice(1));
    } else {
      throw new Error(`method "${_arr[0]}" not found in ${_api}`);
    }
  }
  // define or get the method queue array
  const mq = typeof context[queueName] !== 'undefined' ? context[queueName] : [];
  // execute pending calls
  while (mq.length) {
    _mqExec(api, mq.shift());
  }
  // override push method
  mq.push = (arr) => {
    _mqExec(api, arr);
  };
}

// public API
export default {
  extend,
  collectMetadata,
  createMethodQueueHandler,
};
