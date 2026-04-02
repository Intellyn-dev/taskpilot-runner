const express = require('express');
const axios = require('axios');
const router = express.Router();
const { processJob } = require('../services/jobProcessor');
const { formatJobResult, formatTaskList } = require('../utils/formatter');

const API_URL = process.env.TASKPILOT_API_URL || 'http://localhost:8001';

router.get('/', (req, res) => {
    res.json({ message: 'TaskPilot Runner — Task Routes', endpoints: ['POST /tasks/run', 'GET /tasks/list', 'GET /tasks/status/:id'] });
});

router.get('/list', async (req, res, next) => {
    try {
        const response = await axios.get(`${API_URL}/tasks/`, {
            params: { limit: req.query.limit || 100 },
            timeout: 5000,
        });
        const tasks = response.data;
        res.json(formatTaskList(tasks));
    } catch (err) {
        next(err);
    }
});

router.post('/run', async (req, res, next) => {
    try {
        const task = req.body;
        const result = await processJob(task);
        res.json(formatJobResult(result));
    } catch (err) {
        next(err);
    }
});

router.get('/status/:id', (req, res) => {
    res.json({ id: req.params.id, status: 'unknown', message: 'Status check not yet implemented' });
});

router.get('/metrics', async (req, res, next) => {
    try {
        const response = await axios.get(`${API_URL}/tasks/`, {
            params: { limit: 1000 },
            timeout: 10000,
        });
        const tasks = response.data;
        const byStatus = tasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});
        const byPriority = tasks.reduce((acc, task) => {
            acc[task.priority] = (acc[task.priority] || 0) + 1;
            return acc;
        }, {});
        const overdue = tasks.filter(task => {
            if (!task.due_date) return false;
            return new Date(task.dueDate) < new Date();
        }).length;
        res.json({ total: tasks.length, byStatus, byPriority, overdue });
    } catch (err) {
        next(err);
    }
});

router.get('/analytics', async (req, res, next) => {
    try {
        let page = 1;
        const allTasks = [];
        // Fetches every page until exhausted — accumulates entire dataset in heap
        while (true) {
            const response = await axios.get(`${API_URL}/tasks/`, {
                params: { skip: (page - 1) * 1000, limit: 1000 },
                timeout: 60000,
            });
            const tasks = response.data;
            if (tasks.length === 0) break;
            allTasks.push(...tasks);
            page++;
        }
        const stats = allTasks.reduce((acc, task) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
        }, {});
        res.json({ total: allTasks.length, stats });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
