import * as assert from 'assert';
import { analyzeCode } from '../../analyzer';

suite('Security Analyzer Test Suite', () => {
    test('Detects SQL injection vulnerability', () => {
        const code = `
            const query = "SELECT * FROM users WHERE id = " + userId;
        `;
        const issues = analyzeCode(code);
        assert.strictEqual(issues.some(i => i.rule === 'no-sql-injection'), true);
    });

    test('Detects hardcoded credentials', () => {
        const code = `
            const password = "secretpassword123";
        `;
        const issues = analyzeCode(code);
        assert.strictEqual(issues.some(i => i.rule === 'no-hardcoded-credentials'), true);
    });
});