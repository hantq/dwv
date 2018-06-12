// dwv.utils.ListenerHandler

/**
 * ListenerHandler class: handles add/removing and firing listeners.
 * @constructor
 */
const ListenerHandler = function() {
  /**
   * listeners.
   * @private
   */
  const listeners = {};

  /**
   * Add an event listener.
   * @param {String} type The event type.
   * @param {Object} callback The method associated with the provided event type,
   *    will be called with the fired event.
   */
  this.add = function(type, callback) {
    if (typeof listeners[type] === 'undefined') {
      listeners[type] = [];
    }

    listeners[type].push(callback);
  };

  /**
   * Remove an event listener.
   * @param {String} type The event type.
   * @param {Object} callback The method associated with the provided event type.
   */
  this.remove = function(type, callback) {
    if (typeof listeners[type] === 'undefined') {
      return;
    }

    for (let i = 0, len = listeners[type].length; i < len; ++i) {
      if (listeners[type][i] === callback) {
        listeners[type].splice(i, 1);
        break;
      }
    }
  };

  /**
   * Fire an event: call all associated listeners with the input event object.
   * @param {Object} event The event to fire.
   */
  this.fireEvent = function(event) {
    if (typeof listeners[event.type] === 'undefined') {
      return;
    }

    for (let i = 0, len = listeners[event.type].length; i < len; ++i) {
      listeners[event.type][i](event);
    }
  };
};

export default ListenerHandler;
