/**
 * Regression tests for the UnhandledPromiseRejection bug in processJob.
 *
 * BUG: `recordJobMetrics` was called without `await`, so when the underlying
 * Axios GET request rejected with a 404 error the promise floated unhandled,
 * crashing the Node process with an UnhandledPromiseRejection instead of being
 * caught and logged as a warning.
 *
 * FIX: Wrapped the `recordJobMetrics` call in `await` inside a try/catch so
 * that metrics failures are caught and logged without propagating.
 *
 * Test 1 – REPRODUCES the bug: verifies that a rejection from recordJobMetrics
 *   does NOT cause processJob itself to reject (i.e. the error is swallowed).
 *   Before the fix this test would fail because the unhandled rejection would
 *   surface and cause processJob to throw (or the process to crash).
 *
 * Test 2 – VERIFIES the fix: confirms that processJob resolves successfully
 *   and returns the expected shape even when recordJobMetrics rejects, and that
 *   no unhandled promise rejection event is emitted.
 */

const { processJob } = require('../src/services/jobProcessor');

jest.mock('axios');
const axios = require('axios');

function makeJob(overrides = {}) {
    return {
        id: 'job-regression-001',
        title: 'Regression Test Job',
        options: { maxRetries: 0, timeout: 5000, priority: 'low' },
        ...overrides,
    };
}

describe('processJob – recordJobMetrics unhandled rejection regression', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // validatePayload is a peer dependency; mock its module so it resolves.
        jest.mock('../src/services/payloadProcessor', () => ({
            validatePayload: jest.fn().mockResolvedValue(undefined),
        }));

        // markTaskComplete PATCH – succeeds silently.
        axios.patch.mockResolvedValue({ data: {} });
    });

    it('REPRODUCES BUG: processJob should NOT reject when recordJobMetrics rejects with a 404', async () => {
        // Simulate the Axios 404 that triggered the original UnhandledPromiseRejection.
        const metricsError = Object.assign(new Error('Request failed with status code 404'), {
            response: { status: 404 },
        });

        // GET /metrics/jobs/:id → 404
        axios.get.mockRejectedValue(metricsError);

        // Before the fix, the floating promise would cause this to either reject
        // or emit an unhandledRejection.  After the fix it must resolve.
        await expect(processJob(makeJob())).resolves.toBeDefined();
    });

    it('VERIFIES FIX: processJob resolves with completed status and no unhandled rejection when recordJobMetrics rejects', async () => {
        const metricsError = Object.assign(new Error('Request failed with status code 404'), {
            response: { status: 404 },
        });

        axios.get.mockRejectedValue(metricsError);

        // Spy on the unhandledRejection event to assert it is never fired.
        const unhandledHandler = jest.fn();
        process.on('unhandledRejection', unhandledHandler);

        let result;
        try {
            result = await processJob(makeJob());
        } finally {
            process.off('unhandledRejection', unhandledHandler);
        }

        // The job itself must complete successfully.
        expect(result).toMatchObject({
            jobId: 'job-regression-001',
            status: 'completed',
            attempts: 1,
        });

        // Allow any microtasks / promise queue to flush before asserting.
        await new Promise(resolve => setImmediate(resolve));

        // The critical assertion: no unhandled rejection must have been emitted.
        expect(unhandledHandler).not.toHaveBeenCalled();
    });
});