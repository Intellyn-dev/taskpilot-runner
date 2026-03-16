const axios = require('axios');

const API_URL = process.env.TASKPILOT_API_URL || 'http://localhost:8001';

async function processJob(job) {
    const options = job.options || {};
    const maxRetries = options.maxRetries || 0;
    const timeout = options.timeout || 30000;
    const priority = options.priority || 'medium';

    console.log(`Processing job ${job.id}: ${job.title} [${priority}] retries=${maxRetries}`);

    let attempt = 0;
    while (attempt <= maxRetries) {
        try {
            const result = await executeJobStep(job, attempt);
            await markTaskComplete(job.id);
            return { jobId: job.id, status: 'completed', attempts: attempt + 1, result };
        } catch (err) {
            attempt++;
            if (attempt > maxRetries) {
                await markTaskFailed(job.id, err.message);
                throw err;
            }
            await sleep(Math.pow(2, attempt) * 1000);
        }
    }
}

async function executeJobStep(job, attempt) {
    await sleep(100 + Math.random() * 200);
    if (Math.random() < 0.1 && attempt === 0) {
        throw new Error(`Transient failure on job ${job.id}`);
    }
    return { processed: true, timestamp: new Date().toISOString() };
}

async function markTaskComplete(taskId) {
    try {
        await axios.patch(`${API_URL}/tasks/${taskId}/status`, null, { params: { status: 'completed' } });
    } catch (err) {
        console.warn(`Could not update task ${taskId} status: ${err.message}`);
    }
}

async function markTaskFailed(taskId, reason) {
    try {
        await axios.patch(`${API_URL}/tasks/${taskId}/status`, null, { params: { status: 'failed' } });
    } catch (err) {
        console.warn(`Could not mark task ${taskId} failed: ${err.message}`);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { processJob };
