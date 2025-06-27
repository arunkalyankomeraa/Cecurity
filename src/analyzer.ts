export interface SecurityIssue {
    message: string;
    line: number;
    severity: 'high' | 'medium' | 'low';
    rule: string;
}

interface SecurityRule {
    pattern: RegExp;
    message: string;
    severity: 'high' | 'medium' | 'low';
    rule: string;
}

const securityRules: SecurityRule[] = [
    // SQL Injection Rules
    {
        pattern: /\b(SELECT|INSERT|UPDATE|DELETE)\b.*\+\s*['"`]/i,
        message: 'Potential SQL injection vulnerability. Use parameterized queries instead of string concatenation.',
        severity: 'high',
        rule: 'no-sql-injection'
    },
    {
        pattern: /execute\s*\(\s*['"`][^'"`]*\$\{/i,
        message: 'Template literals in SQL queries can lead to SQL injection. Use parameterized queries.',
        severity: 'high',
        rule: 'no-sql-template-injection'
    },
    {
        pattern: /mysql\.query\s*\(\s*['"`][^'"`]*\+/i,
        message: 'Direct query string concatenation detected. Use parameterized queries.',
        severity: 'high',
        rule: 'no-direct-query-concat'
    },

    // Insecure Data Handling Rules
    {
        pattern: /\.writeFileSync\s*\(\s*.*,\s*.*,\s*['"]utf8['"]\s*\)/,
        message: 'Use proper file permissions when writing files. Consider using restrictive file permissions.',
        severity: 'medium',
        rule: 'secure-file-permissions'
    },
    {
        pattern: /JSON\.parse\s*\(\s*.*\s*\)/,
        message: 'Validate JSON data before parsing to prevent JSON injection attacks.',
        severity: 'medium',
        rule: 'validate-json-input'
    },
    {
        pattern: /localStorage\.(get|set)Item/,
        message: 'Sensitive data should not be stored in localStorage. Use secure storage methods.',
        severity: 'medium',
        rule: 'no-sensitive-localstorage'
    },
    {
        pattern: /document\.cookie\s*=\s*/,
        message: 'Set secure and httpOnly flags when handling cookies.',
        severity: 'high',
        rule: 'secure-cookie-flags'
    },

    // Authorization Check Rules
    {
        pattern: /router\.(get|post|put|delete)\s*\(\s*['"`][^'"`]+['"`]\s*,\s*(?!auth).*\)/,
        message: 'Route handler missing authorization middleware. Add authentication checks.',
        severity: 'high',
        rule: 'require-auth-middleware'
    },
    {
        pattern: /req\.user\s*\?\s*req\.user\s*:\s*/,
        message: 'Unsafe user authentication check. Ensure proper authentication validation.',
        severity: 'high',
        rule: 'secure-auth-check'
    },
    {
        pattern: /role\s*===\s*['"]admin['"]/,
        message: 'Hardcoded role check detected. Implement proper role-based access control (RBAC).',
        severity: 'medium',
        rule: 'no-hardcoded-roles'
    },

    // Common Security Issues
    {
        pattern: /eval\(/,
        message: 'Avoid using eval() as it can lead to code injection vulnerabilities',
        severity: 'high',
        rule: 'no-eval'
    },
    {
        pattern: /password\s*=\s*['"][^'"]*['"]/i,
        message: 'Hardcoded passwords detected',
        severity: 'high',
        rule: 'no-hardcoded-credentials'
    },
    {
        pattern: /console\.log/,
        message: 'Remove console.log statements in production code',
        severity: 'low',
        rule: 'no-console'
    },
    {
        pattern: /innerHTML/,
        message: 'innerHTML can lead to XSS vulnerabilities. Consider using textContent',
        severity: 'medium',
        rule: 'no-inner-html'
    },
    {
        pattern: /new\s+Function\(/,
        message: 'Avoid using new Function() as it can lead to code injection',
        severity: 'high',
        rule: 'no-new-func'
    }
];

export function analyzeCode(code: string): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
        securityRules.forEach(rule => {
            if (rule.pattern.test(line)) {
                issues.push({
                    message: rule.message,
                    line: index + 1,
                    severity: rule.severity,
                    rule: rule.rule
                });
            }
        });
    });

    // Additional analysis for common security patterns
    analyzeSecurityPatterns(code, issues);
    
    return issues;
}

function analyzeSecurityPatterns(code: string, issues: SecurityIssue[]): void {
    // Advanced SQL Injection Detection
    const sqlPatterns = [
        /\.raw\s*\(\s*['"`][^'"`]*\${/i,
        /\.query\s*\(\s*['"`][^'"`]*\${/i,
        /database\.execute\s*\(\s*['"`][^'"`]*\${/i
    ];

    sqlPatterns.forEach(pattern => {
        if (pattern.test(code)) {
            issues.push({
                message: 'Advanced SQL injection risk detected. Use parameterized queries or an ORM.',
                line: getLineNumber(code, pattern),
                severity: 'high',
                rule: 'no-advanced-sql-injection'
            });
        }
    });

    // Insecure Data Handling Patterns
    if (/crypto\.createHash\(['"]md5['"]\)/.test(code)) {
        issues.push({
            message: 'MD5 is cryptographically weak. Use stronger alternatives like SHA-256.',
            line: getLineNumber(code, /crypto\.createHash\(['"]md5['"]\)/),
            severity: 'high',
            rule: 'no-weak-crypto'
        });
    }

    // Authorization Check Patterns
    if (/app\.use\s*\(\s*['"`][^'"`]+['"`]\s*,\s*\([^)]*\)\s*=>\s*{[^}]*}\s*\)/.test(code)) {
        const line = getLineNumber(code, /app\.use\s*\(\s*['"`][^'"`]+['"`]\s*,\s*\([^)]*\)\s*=>\s*{[^}]*}\s*\)/);
        if (!code.split('\n')[line - 1].includes('auth') && !code.split('\n')[line - 1].includes('authorize')) {
            issues.push({
                message: 'Route middleware missing authorization checks. Implement proper authentication.',
                line,
                severity: 'high',
                rule: 'require-route-auth'
            });
        }
    }
}

function getLineNumber(code: string, pattern: RegExp): number {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
            return i + 1;
        }
    }
    return 1;
}

export function calculateSecurityScore(highIssues: number, mediumIssues: number): number {
    const baseScore = 100;
    const highPenalty = 15;
    const mediumPenalty = 5;
    
    const score = baseScore - (highIssues * highPenalty) - (mediumIssues * mediumPenalty);
    return Math.max(0, Math.min(100, score));
}