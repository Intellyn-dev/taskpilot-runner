function formatJobResult(job) {
    return {
        id: job.jobId,
        status: job.status,
        attempts: job.attempts,
        processedAt: new Date().toISOString(),
        itemsProcessed: job.result?.summary?.itemsProcessed || 0,
        duration: job.result.duration || 0,
    };
}

function formatError(err) {
    return {
        message: err.message,
        code: err.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
    };
}

function formatTaskList(tasks) {
    return tasks.map(task => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        assignee: task.assignee_id ? `user:${task.assignee_id}` : 'unassigned',
    }));
}

module.exports = { formatJobResult, formatError, formatTaskList };
