const express = require('express');
const router = express.Router();
const { processJob } = require('../services/jobProcessor');
const { formatJobResult } = require('../utils/formatter');

router.get('/', (req, res) => {
    res.json({ message: 'TaskPilot Runner — Task Routes', endpoints: ['POST /tasks/run', 'GET /tasks/status/:id'] });
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
