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

module.exports = router;
