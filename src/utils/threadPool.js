// dwv.utils.ThreadPool
import WorkerThread from './workerThread';

/**
 * Thread Pool.
 * Highly inspired from {@link http://www.smartjava.org/content/html5-easily-parallelize-jobs-using-web-workers-and-threadpool}.
 * @constructor
 * @param {Number} poolSize The size of the pool.
 */
const ThreadPool = function(poolSize) {
  // task queue
  var taskQueue = [];

  // lsit of available threads
  var freeThreads = [];

  // list of running threads (unsed in abort)
  var runningThreads = [];

  /**
   * Initialise.
   */
  this.init = function() {
    // create 'poolSize' number of worker threads
    for (let i = 0; i < poolSize; ++i) {
      freeThreads.push(new WorkerThread(this));
    }
  };

  /**
   * Add a worker task to the queue.
   * Will be run when a thread is made available.
   * @return {Object} workerTask The task to add.
   */
  this.addWorkerTask = function(workerTask) {
    if (freeThreads.length > 0) {
      // get the first free worker thread
      var workerThread = freeThreads.shift();
      // run the input task
      workerThread.run(workerTask);
      // add the thread to the runnning list
      runningThreads.push(workerThread);
    } else {
      // no free thread, add task to queue
      taskQueue.push(workerTask);
    }
  };

  /**
   * Abort all threads.
   */
  this.abort = function() {
    // clear tasks
    taskQueue = [];
    // cancel running workers
    for (let i = 0; i < runningThreads.length; ++i) {
      runningThreads[i].stop();
    }
    runningThreads = [];

    this.init();
  };

  /**
   * Free a worker thread.
   * @param {Object} workerThread The thread to free.
   */
  this.freeWorkerThread = function(workerThread) {
    // send worker end
    this.onworkerend();

    if (taskQueue.length > 0) {
      // get waiting task
      var workerTask = taskQueue.shift();
      // use input thread to run the waiting task
      workerThread.run(workerTask);
    } else {
      // no task to run, add to free list
      freeThreads.push(workerThread);
      // remove from running list
      for (var i = 0; i < runningThreads.length; ++i) {
        if (runningThreads[i].getId() === workerThread.getId()) {
          runningThreads.splice(i, 1);
        }
      }
      // the work is done when the queue is back to its initial size
      if (freeThreads.length === poolSize) {
        this.onpoolworkend();
      }
    }
  };
};

/**
 * Handle a pool work end event.
 * Default does nothing.
 */
ThreadPool.prototype.onpoolworkend = function() {};

/**
 * Handle a pool worker end event.
 * Default does nothing.
 */
ThreadPool.prototype.onworkerend = function() {};

export default ThreadPool;
