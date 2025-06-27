import * as vscode from 'vscode';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private issuesStatusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );
        this.issuesStatusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            99
        );

        this.statusBarItem.show();
        this.issuesStatusBarItem.show();
    }

    public update(issues: any[]) {
        const highIssues = issues.filter(i => i.severity === 'high').length;
        const mediumIssues = issues.filter(i => i.severity === 'medium').length;
        const lowIssues = issues.filter(i => i.severity === 'low').length;

        this.issuesStatusBarItem.text = `$(shield) ${highIssues}⚠️ ${mediumIssues}⚡ ${lowIssues}ℹ️`;
        this.issuesStatusBarItem.tooltip = 'Security Issues Found';
        this.issuesStatusBarItem.command = 'security-analyzer.showReport';
    }

    public updateScore(score: number) {
        const icon = this.getScoreIcon(score);
        this.statusBarItem.text = `${icon} Security Score: ${score}%`;
        this.statusBarItem.tooltip = this.getScoreTooltip(score);
        this.statusBarItem.command = 'security-analyzer.showReport';
    }

    private getScoreIcon(score: number): string {
        if (score >= 90) return '$(shield)';
        if (score >= 70) return '$(shield-check)';
        if (score >= 50) return '$(warning)';
        return '$(error)';
    }

    private getScoreTooltip(score: number): string {
        if (score >= 90) return 'Excellent Security Score';
        if (score >= 70) return 'Good Security Score';
        if (score >= 50) return 'Fair Security Score';
        return 'Poor Security Score - Needs Attention';
    }

    public dispose() {
        this.statusBarItem.dispose();
        this.issuesStatusBarItem.dispose();
    }
}