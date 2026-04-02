const request = require('supertest');
const express = require('express');
const axios = require('axios');

jest.mock('axios');
jest.mock('../src/services/jobProcessor');
jest.mock('../src/utils/formatter', () => ({
    formatJobResult: jest.fn(r => r),
    formatTaskList: jest.fn(r => r),
}));

const tasksRouter = require('../src/routes/tasks');

const app = express();
app.use(express.json());
app.use('/tasks', tasksRouter);

describe('GET /tasks/metrics', () => {
    /**
     * Verifies the fix for the bug where `taskCount` was referenced without
     * being declared or assigned. The /metrics endpoint should now correctly
     * return a `total` field derived from `tasks.length`, without throwing a
     * ReferenceError or returning undefined/null for the total count.
     */

    it('returns a total field equal to the number of tasks returned by the API', async () => {
        const mockTasks = [
            { status: 'pending', priority: 'high', due_date: null },
            { status: 'completed', priority: 'low', due_date: null },
            { status: 'pending', priority: 'high', due_date: null },
        ];

        axios.get.mockResolvedValueOnce({ data: mockTasks });

        const res = await request(app).get('/tasks/metrics');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('total');
        expect(res.body.total).toBe(3);
    });

    it('returns total of 0 when the API returns an empty task list', async () => {
        axios.get.mockResolvedValueOnce({ data: [] });

        const res = await request(app).get('/tasks/metrics');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('total');
        expect(res.body.total).toBe(0);
    });

    it('returns total that matches the exact count of tasks in the response', async () => {
        const mockTasks = Array.from({ length: 7 }, (_, i) => ({
            status: i % 2 === 0 ? 'pending' : 'completed',
            priority: 'medium',
            due_date: null,
        }));

        axios.get.mockResolvedValueOnce({ data: mockTasks });

        const res = await request(app).get('/tasks/metrics');

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(7);
    });

    it('returns byStatus and byPriority breakdowns alongside total', async () => {
        const mockTasks = [
            { status: 'pending', priority: 'high', due_date: null },
            { status: 'pending', priority: 'low', due_date: null },
            { status: 'completed', priority: 'high', due_date: null },
        ];

        axios.get.mockResolvedValueOnce({ data: mockTasks });

        const res = await request(app).get('/tasks/metrics');

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(3);
        expect(res.body).toHaveProperty('byStatus');
        expect(res.body.byStatus).toEqual({ pending: 2, completed: 1 });
        expect(res.body).toHaveProperty('byPriority');
        expect(res.body.byPriority).toEqual({ high: 2, low: 1 });
        expect(res.body).toHaveProperty('overdue');
    });
});