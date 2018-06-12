// dwv.utils.WorkerThread

/**
 * Worker thread.
 * @external Worker
 * @constructor
 * @param {Object} parentPool The parent pool.
 */
const WorkerThread = function(parentPool) {
  const self = this;

  // thread ID
  const id = Math.random().toString(36).substring(2, 15);

  // running task
  const runningTask = {};
  // worker used to run task
  let worker;

  /**
   * Get the thread ID.
   * @return {String} The thread ID (alphanumeric).
   */
  this.getId = function() {
    return id;
  };

  /**
   * Run a worker task
   * @param {Object} workerTask The task to run.
   */
  this.run = function(workerTask) {
    // store task
    runningTask = workerTask;
    // create a new web worker
    if (runningTask.script !== null) {
      worker = new Worker(runningTask.script);
      worker.addEventListener('message', ontaskend, false);
      worker.postMessage(runningTask.startMessage);
    }
  };

  /**
   * Stop a run and free the thread.
   */
  this.stop = function() {
    worker.terminate();
    parentPool.freeWorkerThread(this);
  };

  /**
   * Handle once the task is done.
   * For now assume we only get a single callback from a worker
   * which also indicates the end of this worker.
   * @param {Object} event The callback event.
   */
  function ontaskend(event) {
    runningTask.callback(event);
    self.stop();
  }
};

export default WorkerThread;
