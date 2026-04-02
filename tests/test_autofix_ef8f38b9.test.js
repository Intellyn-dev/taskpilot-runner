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
 * Bug: In the /metrics endpoint, `taskCount` was used without being declared or assigned.
 * It should have been `tasks.length` to represent the total number of tasks fetched.
 * These tests verify that the `total` field in the /metrics response correctly reflects
 * the number of tasks returned by the API, rather than being undefined (the original bug).
 */

function buildApp() {
    const app = express();
    app.use(express.json());
    app.use('/tasks', tasksRouter);
    return app;
}

describe('/tasks/metrics endpoint — taskCount bug fix', () => {
    const mockTasks = [
        { status: 'pending', priority: 'high', due_date: null },
        { status: 'done', priority: 'low', due_date: null },
        { status: 'pending', priority: 'high', due_date: null },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('REPRODUCES the original bug: total should NOT be undefined (fails before fix)', async () => {
        axios.get.mockResolvedValue({ data: mockTasks });

        const app = buildApp();
        const res = await request(app).get('/tasks/metrics');

        expect(res.status).toBe(200);
        // Before the fix, `taskCount` was undeclared, so `total` would be undefined.
        // This assertion documents the broken behaviour: total must not be undefined.
        expect(res.body.total).not.toBeUndefined();
    });

    it('VERIFIES the fix: total equals tasks.length returned by the upstream API', async () => {
        axios.get.mockResolvedValue({ data: mockTasks });

        const app = buildApp();
        const res = await request(app).get('/tasks/metrics');

        expect(res.status).toBe(200);
        // After the fix, total must equal tasks.length (3 in this case).
        expect(res.body.total).toBe(mockTasks.length);
    });
});