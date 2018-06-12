// dwv.utils.WorkerTask

/**
 * Worker task.
 * @constructor
 * @param {String} script The worker script.
 * @param {Function} callback The worker callback.
 * @param {Object} message The data to pass to the worker.
 */
const WorkerTask = function(script, callback, message) {
  this.script = script;
  this.callback = callback;
  this.startMessage = message;
};

export default WorkerTask;
