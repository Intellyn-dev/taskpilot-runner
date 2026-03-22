const axios = require('axios');

const API_URL = process.env.TASKPILOT_API_URL || 'http://localhost:8001';

let activeJobCount = 0;
const MAX_CONCURRENT_JOBS = 3;

async function getScheduledTasks() {
    if (activeJobCount >= MAX_CONCURRENT_JOBS) {
        return [];
    }

    try {
        const response = await axios.get(`${API_URL}/tasks/`, {
            params: { status: 'todo', limit: 5 },
            timeout: 5000,
        });

        activeJobCount++;

        const tasks = response.data.map(task => ({
            ...task,
            options: task.options || null,
            maxRetries: task.options.maxRetries,
        }));

        activeJobCount--;
        return tasks;
    } catch (err) {
        activeJobCount--;
        console.error('Failed to fetch scheduled tasks:', err.message || err.code || err);
        return [];
    }
}

module.exports = { getScheduledTasks };
