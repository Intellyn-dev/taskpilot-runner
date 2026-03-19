/**
 * Regression tests for the race condition bug in scheduler.js
 *
 * Bug: Multiple concurrent calls to getScheduledTasks() could simultaneously
 * pass the `if (activeJobCount >= MAX_CONCURRENT_JOBS)` check before any of
 * them incremented `activeJobCount`, allowing more than MAX_CONCURRENT_JOBS (3)
 * jobs to run concurrently.
 *
 * Fix: A mutex (promise chain) was introduced to make the check-and-increment
 * operation atomic, ensuring activeJobCount never exceeds MAX_CONCURRENT_JOBS.
 */

const axios = require('axios');
jest.mock('axios');

const MAX_CONCURRENT_JOBS = 3;

describe('scheduler.js - activeJobCount race condition', () => {
    let resolvers;

    beforeEach(() => {
        jest.resetModules();
        resolvers = [];

        axios.get.mockImplementation(() =>
            new Promise(resolve => {
                resolvers.push(resolve);
            })
        );
    });

    afterEach(() => {
        resolvers.forEach(resolve =>
            resolve({ data: [] })
        );
    });

    it('REPRODUCES the bug: without mutex, concurrent calls exceed MAX_CONCURRENT_JOBS', async () => {
        /**
         * This test simulates the original buggy behaviour by bypassing the mutex.
         * It directly demonstrates that a naive check-then-increment pattern allows
         * activeJobCount to exceed MAX_CONCURRENT_JOBS when calls are concurrent.
         */
        let activeJobCount = 0;
        const results = [];

        async function buggyGetScheduledTasks() {
            if (activeJobCount >= MAX_CONCURRENT_JOBS) {
                return [];
            }
            activeJobCount++;
            await new Promise(resolve => setTimeout(resolve, 0));
            activeJobCount--;
            results.push('ran');
            return [{ id: 1 }];
        }

        const calls = Array.from({ length: MAX_CONCURRENT_JOBS + 2 }, () =>
            buggyGetScheduledTasks()
        );

        await Promise.all(calls);

        expect(results.length).toBeGreaterThan(MAX_CONCURRENT_JOBS);
    });

    it('VERIFIES the fix: concurrent calls never exceed MAX_CONCURRENT_JOBS active jobs', async () => {
        /**
         * Fires MAX_CONCURRENT_JOBS + 2 concurrent calls to getScheduledTasks().
         * With the mutex fix in place, at most MAX_CONCURRENT_JOBS calls should
         * proceed past the guard; the rest must return [] immediately.
         * We verify that the number of in-flight axios.get calls never exceeds
         * MAX_CONCURRENT_JOBS, confirming the atomic check-and-increment works.
         */
        const { getScheduledTasks } = require('../src/services/scheduler');

        const totalCalls = MAX_CONCURRENT_JOBS + 2;

        const promises = Array.from({ length: totalCalls }, () =>
            getScheduledTasks()
        );

        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();

        const inFlightCount = resolvers.length;

        expect(inFlightCount).toBeLessThanOrEqual(MAX_CONCURRENT_JOBS);

        resolvers.forEach(resolve =>
            resolve({ data: [{ id: 1, options: null }] })
        );

        const results = await Promise.all(promises);

        const nonEmptyResults = results.filter(r => r.length > 0);
        expect(nonEmptyResults.length).toBeLessThanOrEqual(MAX_CONCURRENT_JOBS);

        const emptyResults = results.filter(r => r.length === 0);
        expect(emptyResults.length).toBeGreaterThanOrEqual(
            totalCalls - MAX_CONCURRENT_JOBS
        );
    });
});