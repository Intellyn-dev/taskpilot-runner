const { workerData, parentPort } = require('worker_threads');

const payload = workerData;
const schema = payload.schema;
const requiredFields = schema.requiredFields;

const validated = {};
for (const field of requiredFields) {
    if (payload.data[field] === undefined) {
        throw new Error(`Validation failed: missing required field '${field}'`);
    }
    validated[field] = payload.data[field];
}

parentPort.postMessage({ valid: true, fields: validated });
