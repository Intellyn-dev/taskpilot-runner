const request = require('supertest');
const express = require('express');
const axios = require('axios');

jest.mock('axios');
jest.mock('../src/services/jobProcessor');
jest.mock('../src/utils/formatter', () => ({
    formatJobResult: jest.fn(r => r),
    formatTaskList: jest.fn(t => t),
}));

const tasksRouter = require('../src/routes/tasks');

/**
 * Bug: In the /metrics endpoint, the variable `taskCount` was referenced
 * without being declared or initialized, causing a ReferenceError at runtime.
 * The fix replaces `taskCount` with `tasks.length`, which correctly reflects
 * the number of tasks fetched from the API.
 *
 * Test 1 (reproduces bug): Simulates the original broken behavior where
 * `taskCount` is undefined/throws, resulting in a 500 error or a response
 * where `total` is not the correct tasks array length.
 *
 * Test 2 (verifies fix): Confirms that after the fix, the `total` field in
 * the /metrics response equals the actual length of the tasks array returned
 * by the API.
 */

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/tasks', tasksRouter);
    app.use((err, req, res, next) => {
        res.status(500).json({ error: err.message });
    });
    return app;
}

describe('GET /tasks/metrics — taskCount bug fix', () => {
    const mockTasks = [
        { status: 'pending', priority: 'high', due_date: null },
        { status: 'done', priority: 'low', due_date: null },
        { status: 'pending', priority: 'high', due_date: null },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('REPRODUCES BUG: total field must not be undefined or cause a server error when tasks are returned', async () => {
        axios.get.mockResolvedValue({ data: mockTasks });

        const app = buildApp();
        const res = await request(app).get('/tasks/metrics');

        /**
         * Before the fix, referencing the undeclared `taskCount` variable
         * would throw a ReferenceError, causing a 500 response.
         * This test asserts the pre-fix behavior: either a 500 error OR
         * a `total` that is NOT equal to tasks.length (e.g., undefined).
         * After the fix this test passes because the response is 200 with
         * correct total — demonstrating the bug no longer occurs.
         */
        const bugWouldCause500 = res.status === 500;
        const bugWouldCauseWrongTotal =
            res.status === 200 && res.body.total !== mockTasks.length;

        // After fix: neither condition should be true
        expect(bugWouldCause500 || bugWouldCauseWrongTotal).toBe(false);
    });

    it('VERIFIES FIX: total equals tasks.length returned from the API', async () => {
        axios.get.mockResolvedValue({ data: mockTasks });

        const app = buildApp();
        const res = await request(app).get('/tasks/metrics');

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(mockTasks.length);
        expect(res.body.total).toBe(3);
    });
});