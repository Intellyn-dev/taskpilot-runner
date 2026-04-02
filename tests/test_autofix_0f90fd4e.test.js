const { processJob } = require('../src/services/jobProcessor');

/**
 * Regression tests for the ReferenceError bug in jobProcessor.js
 *
 * Bug: Line 12 referenced `opts.priority` instead of `options.priority`,
 * causing a ReferenceError: opts is not defined whenever processJob was called.
 * The fix renames `opts` to `options` to match the variable defined on line 9.
 */

jest.mock('axios', () => ({
    get: jest.fn().mockResolvedValue({ data: { averageDuration: 100 } }),
    patch: jest.fn().mockResolvedValue({}),
    post: jest.fn().mockResolvedValue({}),
}));

jest.mock('./payloadProcessor', () => ({
    validatePayload: jest.fn().mockResolvedValue(undefined),
}), { virtual: true });

jest.mock('../src/services/payloadProcessor', () => ({
    validatePayload: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('worker_threads', () => ({
    Worker: jest.fn().mockImplementation(() => ({})),
}));

describe('processJob - opts ReferenceError regression', () => {
    const baseJob = {
        id: 'job-001',
        title: 'Test Job',
        options: {
            maxRetries: 0,
            timeout: 5000,
            priority: 'high',
        },
        notifyOnComplete: false,
        assignedTo: { id: 'user-1' },
        notifyChannels: [],
    };

    it('REPRODUCES the bug: accessing opts.priority throws ReferenceError when options is defined but opts is not', async () => {
        /**
         * Before the fix, `opts` was undefined, so `opts.priority` would throw:
         *   ReferenceError: opts is not defined
         * This test asserts that calling processJob does NOT throw a ReferenceError,
         * which would fail against the buggy code and pass after the fix.
         */
        await expect(processJob(baseJob)).resolves.not.toThrow();
    });

    it('VERIFIES the fix: priority from job.options is correctly read without ReferenceError', async () => {
        /**
         * After the fix, `options.priority` is used correctly.
         * This test confirms processJob completes successfully and returns
         * the expected shape, proving the priority field is accessed without error.
         */
        const result = await processJob({
            ...baseJob,
            id: 'job-002',
            options: {
                maxRetries: 0,
                timeout: 5000,
                priority: 'low',
            },
        });

        expect(result).toBeDefined();
        expect(result.jobId).toBe('job-002');
        expect(result.status).toBe('completed');
        expect(result.attempts).toBeGreaterThanOrEqual(1);
    });
});