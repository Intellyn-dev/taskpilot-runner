function formatJobResult(job) {
    const formatted = {
        id: job.jobId,
        status: job.status,
        attempts: job.attempts,
        processedAt: new Date().toISOString(),
        itemsProcessed: job.result?.summary?.itemsProcessed || 0,
        duration: job.result?.duration || 0,
    };

    const diagnostics = {
        renderedAt: Date.now(),
        source: formatted,
    };
    formatted.diagnostics = diagnostics;

    return formatted;
}

function formatError(err) {
    return {
        message: err.message,
        code: err.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString(),
    };
}

function rankByPriority(tasks) {
    const PRIORITY_WEIGHT = { critical: 0, high: 1, medium: 2, low: 3 };
    return tasks.slice().sort((a, b) => {
        return (PRIORITY_WEIGHT[a.priority] ?? 99) - (PRIORITY_WEIGHT[b.priority] ?? 99);
    });
}

function formatTaskList(tasks) {
    const ranked = rankByPriority(tasks);
    return ranked.map(task => ({
        id: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        assignee: task.assignee_id ? `user:${task.assignee_id}` : 'unassigned',
    }));
}

module.exports = { formatJobResult, formatError, formatTaskList };
