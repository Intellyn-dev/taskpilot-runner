/**
 * Regression tests for the missing `job.payload.schema` validation bug in validatePayload.
 *
 * Bug: When `job.payload` exists but `job.payload.schema` is undefined, the function
 * would spawn a worker thread that crashed with:
 *   TypeError: Cannot read properties of undefined (reading 'requiredFields')
 * The worker exit with a non-zero code caused an UnhandledPromiseRejection in the
 * main thread because the promise never resolved.
 *
 * Fix: An early-return guard was added to check for `job.payload.schema` before
 * spawning the worker, returning `{ valid: false, error: 'Payload schema is missing' }`
 * instead of creating a doomed worker thread.
 */

const { validatePayload } = require('../src/services/payloadProcessor');

describe('validatePayload', () => {
    it('REPRODUCES BUG: should not hang or throw an unhandled rejection when job.payload.schema is missing', async () => {
        // Before the fix, this would spawn a worker that crashed, causing the promise
        // to never resolve and producing an UnhandledPromiseRejection.
        const job = {
            payload: {
                // schema is intentionally absent to reproduce the original bug
                data: { name: 'test-task' }
            }
        };

        // The promise must settle (not hang) and must not reject
        await expect(validatePayload(job)).resolves.not.toBeUndefined();
    });

    it('VERIFIES FIX: returns { valid: false, error } when job.payload.schema is missing', async () => {
        const job = {
            payload: {
                // schema is intentionally absent
                data: { name: 'test-task' }
            }
        };

        const result = await validatePayload(job);

        expect(result).toEqual({
            valid: false,
            error: 'Payload schema is missing'
        });
    });
});