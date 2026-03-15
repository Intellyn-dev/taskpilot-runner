require('dotenv').config();
const express = require('express');
const Sentry = require('@sentry/node');
const cron = require('node-cron');
const { processJob } = require('./services/jobProcessor');
const { getScheduledTasks } = require('./services/scheduler');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3001;

if (process.env.GLITCHTIP_DSN) {
    Sentry.init({
        dsn: process.env.GLITCHTIP_DSN,
        tracesSampleRate: 1.0,
        environment: process.env.ENVIRONMENT || 'development',
    });
    app.use(Sentry.Handlers.requestHandler());
}

app.use(express.json());
app.use('/tasks', taskRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'taskpilot-runner', uptime: process.uptime() });
});

if (process.env.GLITCHTIP_DSN) {
    app.use(Sentry.Handlers.errorHandler());
}

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.message });
});

cron.schedule('*/30 * * * * *', async () => {
    try {
        const tasks = await getScheduledTasks();
        for (const task of tasks) {
            await processJob(task).catch(err => console.error(`Job ${task.id} failed:`, err.message));
        }
    } catch (err) {
        console.error('Scheduler error:', err.message);
    }
});

app.listen(PORT, () => {
    console.log(`TaskPilot Runner listening on port ${PORT}`);
});
