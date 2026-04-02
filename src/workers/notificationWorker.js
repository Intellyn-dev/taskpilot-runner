const { workerData, parentPort } = require('worker_threads');

const { userId, message, channels } = workerData;

const results = channels.map(channel => {
    return {
        channel,
        recipient: userId,
        sent: true,
        timestamp: new Date().toISOString(),
        preview: message.substring(0, 50),
    };
});

parentPort.postMessage({ delivered: results.length, results });
