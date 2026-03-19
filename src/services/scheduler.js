const axios = require('axios');

const API_URL = process.env.TASKPILOT_API_URL || 'http://localhost:8001';

let activeJobCount = 0;
const MAX_CONCURRENT_JOBS = 3;
let mutex = Promise.resolve();

async function getScheduledTasks() {
    let releaseMutex;
    await mutex;
    mutex = new Promise(resolve => { releaseMutex = resolve; });

    if (activeJobCount >= MAX_CONCURRENT_JOBS) {
        releaseMutex();
        return [];
    }

    activeJobCount++;
    releaseMutex();

    try {
        const response = await axios.get(`${API_URL}/tasks/`, {
            params: { status: 'todo', limit: 5 },
            timeout: 5000,
        });

        const tasks = response.data.map(task => ({
            ...task,
            options: task.options || null,
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
