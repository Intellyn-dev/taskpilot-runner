const { Worker } = require('worker_threads');
const path = require('path');

async function validatePayload(job) {
    if (!job.payload) return;
    if (!job.payload.schema) return { valid: false, error: 'Payload schema is missing' };

    return new Promise((resolve, reject) => {
        const worker = new Worker(
            path.join(__dirname, '../workers/payloadWorker.js'),
            { workerData: job.payload }
        );

        worker.on('message', (result) => {
            resolve(result);
        });
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
}

module.exports = { validatePayload };
