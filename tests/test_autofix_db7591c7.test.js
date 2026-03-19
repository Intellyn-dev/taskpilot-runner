/**
 * Regression tests for unbounded growth of history.runs in jobRegistry.
 *
 * Bug: The `history.runs` array inside each job's entry in `jobRegistry` was
 * pushed to on every call to `processJob` with no size limit, causing the array
 * to grow without bound and eventually exhausting the JavaScript heap.
 *
 * Fix: A MAX_HISTORY_RUNS constant (100) was introduced and
 * `history.runs = history.runs.slice(-MAX_HISTORY_RUNS)` is applied after
 * every push, capping the array at 100 entries.
 *
 * Test 1 – reproduces the original bug:
 *   Calls processJob more than MAX_HISTORY_RUNS times for the same job id and
 *   asserts that WITHOUT the cap the array would have grown beyond 100 entries.
 *   With the fix in place the array stays at exactly 100, so this test is
 *   written to confirm the pre-fix behaviour no longer occurs (i.e. it passes
 *   only after the fix).
 *
 * Test 2 – verifies the fix:
 *   Calls processJob 150 times for the same job id and asserts that the
 *   history.runs array never exceeds MAX_HISTORY_RUNS (100).
 */

const { processJob } = require('../src/services/jobProcessor');

// ---------------------------------------------------------------------------
// Minimal stubs – we must not import from unrelated packages, so we mock the
// two external collaborators (axios and validatePayload) via Jest module mocks
// before the module under test is loaded.
// ---------------------------------------------------------------------------

jest.mock('axios', () => ({
    get: jest.fn().mockResolvedValue({ data: { averageDuration: 0 } }),
    patch: jest.fn().mockResolvedValue({}),
    post: jest.fn().mockResolvedValue({}),
}));

jest.mock('../src/services/payloadProcessor', () => ({
    validatePayload: jest.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Helper – build a minimal valid job object
// ---------------------------------------------------------------------------
function makeJob(id) {
    return {
        id,
        title: `Test job ${id}`,
        options: { maxRetries: 0, timeout: 5000, priority: 'low' },
    };
}

// ---------------------------------------------------------------------------
// We need access to the internal jobRegistry to inspect run counts.
// Because the Map is module-private we drive it purely through processJob and
// observe the side-effects via a spy on Array.prototype.push combined with a
// closure counter, OR – more reliably – we simply call processJob N times and
// then re-export nothing; instead we expose the registry for test purposes by
// reaching into the module cache.
//
// The cleanest approach without changing the production module is to call
// processJob the required number of times and then verify behaviour through
// the observable contract: after >100 calls the array must not exceed 100.
// We achieve introspection by monkey-patching Map.prototype.set inside the
// test so we can capture the value that was stored.
// ---------------------------------------------------------------------------

describe('jobRegistry history.runs size limiting', () => {
    const JOB_ID = 'regression-job-001';
    const RUNS_OVER_LIMIT = 150;
    const MAX_HISTORY_RUNS = 100;

    // Capture the last value stored for our job id via Map.prototype.set spy.
    let capturedHistory = null;
    let originalMapSet;

    beforeAll(() => {
        originalMapSet = Map.prototype.set;
        Map.prototype.set = function (key, value) {
            if (key === JOB_ID) {
                capturedHistory = value;
            }
            return originalMapSet.call(this, key, value);
        };
    });

    afterAll(() => {
        Map.prototype.set = originalMapSet;
    });

    it('(bug reproduction) history.runs would have exceeded MAX_HISTORY_RUNS without the fix', async () => {
        // Before the fix, every call pushed without slicing, so after N calls
        // the array length would equal N.  With the fix the length is capped at
        // MAX_HISTORY_RUNS.  This test asserts the pre-fix symptom is GONE:
        // if the array length equals RUNS_OVER_LIMIT the bug is still present.

        const job = makeJob(JOB_ID);
        for (let i = 0; i < RUNS_OVER_LIMIT; i++) {
            await processJob(job);
        }

        // The bug would cause capturedHistory.runs.length === RUNS_OVER_LIMIT (150).
        // After the fix it must NOT equal RUNS_OVER_LIMIT.
        expect(capturedHistory).not.toBeNull();
        expect(capturedHistory.runs.length).not.toBe(RUNS_OVER_LIMIT);
    });

    it('(fix verification) history.runs is capped at MAX_HISTORY_RUNS after many processJob calls', async () => {
        // Reset captured state for a fresh job id so this test is independent.
        const SECOND_JOB_ID = 'regression-job-002';
        let secondJobHistory = null;

        const originalSet = Map.prototype.set;
        Map.prototype.set = function (key, value) {
            if (key === SECOND_JOB_ID) {
                secondJobHistory = value;
            }
            return originalSet.call(this, key, value);
        };

        const job = makeJob(SECOND_JOB_ID);
        for (let i = 0; i < RUNS_OVER_LIMIT; i++) {
            await processJob(job);
        }

        Map.prototype.set = originalSet;

        expect(secondJobHistory).not.toBeNull();
        expect(secondJobHistory.runs.length).toBeLessThanOrEqual(MAX_HISTORY_RUNS);
        expect(secondJobHistory.runs.length).toBe(MAX_HISTORY_RUNS);
    });
});