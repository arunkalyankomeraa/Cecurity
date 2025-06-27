import OpenAI from 'openai';
import * as vscode from 'vscode';
import { SecurityIssue } from './analyzer';

export class AIAnalyzer {
    private openai: OpenAI | null = null;

    constructor() {
        this.initializeOpenAI();
    }

    private initializeOpenAI() {
        const config = vscode.workspace.getConfiguration('securityAnalyzer');
        const apiKey = config.get<string>('openAIKey');

        if (apiKey && apiKey.trim() !== '') {
            this.openai = new OpenAI({
                apiKey: apiKey,
                dangerouslyAllowBrowser: true
            });
        }
    }

    public async analyzeCode(code: string): Promise<SecurityIssue[]> {
        if (!this.openai) {
            throw new Error('OpenAI API key not configured');
        }

        try {
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a security expert analyzing code for vulnerabilities. For each issue found, format the response as 'VULNERABILITY: description | LINE: line_number | SEVERITY: severity_level'. Severity should be high, medium, or low."
                    },
                    {
                        role: "user",
                        content: `Analyze this code for security vulnerabilities:\n\n${code}`
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            });

            const analysis = completion.choices[0].message.content;
            if (!analysis) {
                return [];
            }
            return this.parseAIResponse(analysis);
        } catch (error: any) {
            console.error('AI Analysis failed:', error);
            throw new Error(error?.message || 'AI Analysis failed');
        }
    }

    private parseAIResponse(response: string): SecurityIssue[] {
        const issues: SecurityIssue[] = [];
        const lines = response.split('\n');
        
        lines.forEach(line => {
            if (line.trim() === '') return;
            
            const parts = line.split('|').map(part => part.trim());
            const issue: Partial<SecurityIssue> = {};
            
            parts.forEach(part => {
                if (part.startsWith('VULNERABILITY:')) {
                    issue.message = part.replace('VULNERABILITY:', '').trim();
                } else if (part.startsWith('LINE:')) {
                    issue.line = parseInt(part.replace('LINE:', '').trim()) || 1;
                } else if (part.startsWith('SEVERITY:')) {
                    const severity = part.replace('SEVERITY:', '').trim().toLowerCase();
                    issue.severity = (severity === 'high' || severity === 'medium' || severity === 'low') 
                        ? severity as 'high' | 'medium' | 'low'
                        : 'medium';
                }
            });
            
            if (issue.message && issue.line && issue.severity) {
                issue.rule = 'ai-security-check';
                issues.push(issue as SecurityIssue);
            }
        });

        return issues;
    }
}