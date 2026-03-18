const { Worker } = require('worker_threads');
const path = require('path');

async function validatePayload(job) {
    if (!job.payload) return;

    return new Promise((resolve) => {
        const worker = new Worker(
            path.join(__dirname, '../workers/payloadWorker.js'),
            { workerData: job.payload }
        );

        worker.on('message', (result) => {
            resolve(result);
        });
    });
}

module.exports = { validatePayload };
