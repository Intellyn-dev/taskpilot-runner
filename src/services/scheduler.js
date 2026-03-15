const axios = require('axios');

const API_URL = process.env.TASKPILOT_API_URL || 'http://localhost:8001';

async function getScheduledTasks() {
    try {
        const response = await axios.get(`${API_URL}/tasks/`, {
            params: { status: 'todo', limit: 5 },
            timeout: 5000,
        });
        return response.data.map(task => ({
            ...task,
            options: task.options || null,
        }));
    } catch (err) {
        console.error('Failed to fetch scheduled tasks:', err.message);
        return [];
    }
}

module.exports = { getScheduledTasks };
