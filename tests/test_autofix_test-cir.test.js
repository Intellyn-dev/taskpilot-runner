/**
 * Regression tests for the circular reference bug in formatJobResult.
 *
 * Bug: The `diagnostics` object had its `source` property set to the `formatted`
 * object itself, and then `diagnostics` was assigned back to `formatted.diagnostics`,
 * creating a circular reference: formatted -> diagnostics -> source -> formatted.
 * This caused JSON.stringify (and res.json()) to throw a TypeError.
 *
 * Fix: `diagnostics.source` is now set to the original `job` input object instead
 * of the `formatted` output object, breaking the circular reference.
 */

const { formatJobResult } = require('../../src/utils/formatter');

describe('formatJobResult', () => {
    const sampleJob = {
        jobId: 'job-001',
        status: 'completed',
        attempts: 2,
        result: {
            summary: { itemsProcessed: 42 },
            duration: 1500,
        },
    };

    it('REPRODUCES the bug: result must not contain a circular reference', () => {
        const result = formatJobResult(sampleJob);

        // Before the fix, this would throw:
        // "TypeError: Converting circular structure to JSON"
        expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('VERIFIES the fix: diagnostics.source points to the original job, not the formatted result', () => {
        const result = formatJobResult(sampleJob);

        // The source should be the original job input, not the formatted output itself
        expect(result.diagnostics.source).toBe(sampleJob);
        expect(result.diagnostics.source).not.toBe(result);

        // Confirm the serialized output contains expected top-level fields
        const serialized = JSON.parse(JSON.stringify(result));
        expect(serialized.id).toBe('job-001');
        expect(serialized.status).toBe('completed');
        expect(serialized.attempts).toBe(2);
        expect(serialized.itemsProcessed).toBe(42);
        expect(serialized.duration).toBe(1500);
        expect(serialized.diagnostics).toBeDefined();
        expect(serialized.diagnostics.source.jobId).toBe('job-001');
    });
});