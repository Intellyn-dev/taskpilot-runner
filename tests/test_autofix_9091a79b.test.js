/**
 * Regression tests for the rankByPriority O(n^2) performance bug.
 *
 * BUG: The original implementation used repeated JSON.parse/JSON.stringify
 * calls inside a nested loop during sorting, causing O(n^2) CPU work that
 * blocked the Node.js event loop and caused request timeouts.
 *
 * FIX: Replaced the inefficient deep-clone-in-loop approach with a simple
 * comparison sort using a PRIORITY_WEIGHT lookup map, making it O(n log n).
 *
 * Test 1 (reproduces bug): Verifies that rankByPriority completes within a
 * reasonable time threshold on a large input. Before the fix this would
 * exceed the threshold due to O(n^2) JSON serialization overhead.
 *
 * Test 2 (verifies fix): Verifies that the returned order is correctly sorted
 * by priority weight and that the original array is not mutated.
 */

const { formatTaskList } = require('../../src/utils/formatter');

function makeTasks(count) {
    const priorities = ['low', 'medium', 'high', 'critical'];
    return Array.from({ length: count }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        priority: priorities[i % priorities.length],
        status: 'open',
        assignee_id: i % 3 === 0 ? `user-${i}` : null,
    }));
}

describe('rankByPriority (formatter.js)', () => {
    it('REPRODUCES BUG: should complete within 500ms for 5000 tasks (would timeout with O(n^2) JSON clone loop)', () => {
        const tasks = makeTasks(5000);

        const start = Date.now();
        formatTaskList(tasks);
        const elapsed = Date.now() - start;

        // Before the fix, repeated JSON.parse/JSON.stringify inside a nested
        // sort loop would make this take several seconds on 5000 items.
        // The fixed implementation should finish well under 500ms.
        expect(elapsed).toBeLessThan(500);
    });

    it('VERIFIES FIX: should return tasks sorted by priority (critical → high → medium → low) without mutating the original array', () => {
        const tasks = [
            { id: '1', title: 'A', priority: 'low',      status: 'open', assignee_id: null },
            { id: '2', title: 'B', priority: 'critical',  status: 'open', assignee_id: '42' },
            { id: '3', title: 'C', priority: 'medium',   status: 'open', assignee_id: null },
            { id: '4', title: 'D', priority: 'high',     status: 'open', assignee_id: '7'  },
            { id: '5', title: 'E', priority: 'critical',  status: 'done', assignee_id: null },
        ];

        const originalOrder = tasks.map(t => t.id);
        const result = formatTaskList(tasks);

        // Correct priority order
        const resultPriorities = result.map(t => t.priority);
        expect(resultPriorities).toEqual(['critical', 'critical', 'high', 'medium', 'low']);

        // critical tasks preserve relative order (stable-ish: id 2 before id 5)
        const criticalIds = result.filter(t => t.priority === 'critical').map(t => t.id);
        expect(criticalIds).toEqual(['2', '5']);

        // Original array must not be mutated
        expect(tasks.map(t => t.id)).toEqual(originalOrder);

        // Assignee formatting is correct
        const criticalWithAssignee = result.find(t => t.id === '2');
        expect(criticalWithAssignee.assignee).toBe('user:42');

        const unassigned = result.find(t => t.id === '5');
        expect(unassigned.assignee).toBe('unassigned');
    });
});