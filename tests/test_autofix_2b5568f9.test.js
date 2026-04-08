const { formatJobResult } = require('../../src/utils/formatter');

/**
 * Regression tests for the circular reference bug in formatJobResult.
 *
 * Bug: The `diagnostics` object was created with `source: formatted` (pointing
 * to the formatted result object), and then assigned back as
 * `formatted.diagnostics = diagnostics`. This created a circular reference:
 *   formatted -> diagnostics -> source -> formatted
 * which caused JSON.stringify to throw a TypeError.
 *
 * Fix: Changed `source: formatted` to `source: job` so diagnostics points to
 * the original job input instead of the formatted output, breaking the cycle.
 */

describe('formatJobResult', () => {
    const mockJob = {
        jobId: 'job-123',
        status: 'completed',
        attempts: 2,
        result: {
            summary: { itemsProcessed: 42 },
            duration: 300,
        },
    };

    it('REPRODUCES BUG: formatted result must not contain a circular reference that breaks JSON.stringify', () => {
        const result = formatJobResult(mockJob);
        expect(() => JSON.stringify(result)).not.toThrow();
    });

    it('VERIFIES FIX: diagnostics.source points to the original job, not the formatted result', () => {
        const result = formatJobResult(mockJob);
        expect(result.diagnostics.source).toBe(mockJob);
        expect(result.diagnostics.source).not.toBe(result);
    });
});