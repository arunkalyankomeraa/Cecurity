import * as vscode from 'vscode';
import { AIAnalyzer } from './aiAnalyzer';

export class SecurityPanel {
    private static readonly viewType = 'securityReport';
    private panel: vscode.WebviewPanel | undefined;
    private aiAnalyzer: AIAnalyzer;

    constructor(private readonly extensionUri: vscode.Uri) {
        this.aiAnalyzer = new AIAnalyzer();
    }

    public show() {
        if (this.panel) {
            this.panel.reveal();
        } else {
            this.panel = vscode.window.createWebviewPanel(
                SecurityPanel.viewType,
                'Security Report',
                vscode.ViewColumn.Beside,
                {
                    enableScripts: true,
                    localResourceRoots: [this.extensionUri]
                }
            );

            this.panel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'requestAIAnalysis':
                            try {
                                const editor = vscode.window.activeTextEditor;
                                if (editor) {
                                    const code = editor.document.getText();
                                    const aiIssues = await this.aiAnalyzer.analyzeCode(code);
                                    this.panel?.webview.postMessage({ 
                                        command: 'aiAnalysisResult',
                                        issues: aiIssues
                                    });
                                }
                            } catch (error) {
                                this.panel?.webview.postMessage({
                                    command: 'aiAnalysisError',
                                    error: 'AI Analysis failed. Please check your API key.'
                                });
                            }
                            break;
                    }
                },
                undefined,
                []
            );

            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });
        }
    }

    public update(issues: any[]) {
        if (!this.panel) return;

        const highIssues = issues.filter(i => i.severity === 'high');
        const mediumIssues = issues.filter(i => i.severity === 'medium');
        const lowIssues = issues.filter(i => i.severity === 'low');

        const score = this.calculateScore(issues);

        this.panel.webview.html = this.getHtmlContent(
            score,
            highIssues,
            mediumIssues,
            lowIssues
        );
    }

    private calculateScore(issues: any[]): number {
        const highCount = issues.filter(i => i.severity === 'high').length;
        const mediumCount = issues.filter(i => i.severity === 'medium').length;
        return Math.max(0, Math.min(100, 100 - (highCount * 15) - (mediumCount * 5)));
    }

    private getHtmlContent(
        score: number,
        highIssues: any[],
        mediumIssues: any[],
        lowIssues: any[]
    ): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        padding: 20px; 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                        color: #000;
                        background-color: #fff;
                    }
                    .score-container {
                        text-align: center;
                        margin-bottom: 30px;
                        padding: 20px;
                        background: #fff;
                        border-radius: 10px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .score {
                        font-size: 48px;
                        font-weight: bold;
                        color: ${this.getScoreColor(score)};
                        margin: 10px 0;
                    }
                    .issue {
                        margin: 10px 0;
                        padding: 15px;
                        border-radius: 8px;
                        border-left: 4px solid;
                    }
                    .high { 
                        background-color: #ffcccc;
                        border-color: #ff0000;
                    }
                    .medium { 
                        background-color: #ffffcc;
                        border-color: #ffd700;
                    }
                    .low { 
                        background-color: #ccffcc;
                        border-color: #00ff00;
                    }
                    .section {
                        margin: 20px 0;
                        padding: 20px;
                        background: #fff;
                        border-radius: 10px;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    }
                    .ai-section {
                        background: #fff;
                        padding: 20px;
                        border-radius: 10px;
                        margin-top: 30px;
                    }
                    .button {
                        background: #007acc;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: background 0.3s ease;
                    }
                    .button:hover {
                        background: #005999;
                    }
                    .loading {
                        display: none;
                        margin: 20px 0;
                        text-align: center;
                        color: #666;
                    }
                    .ai-results {
                        margin-top: 20px;
                    }
                    .error-message {
                        color: #ff0000;
                        padding: 10px;
                        background: #ffcccc;
                        border-radius: 5px;
                        margin: 10px 0;
                        display: none;
                    }
                    .tabs {
                        display: flex;
                        margin-bottom: 20px;
                        border-bottom: 1px solid #ddd;
                    }
                    .tab {
                        padding: 10px 20px;
                        cursor: pointer;
                        border-bottom: 2px solid transparent;
                        margin-right: 10px;
                    }
                    .tab.active {
                        border-bottom: 2px solid #007acc;
                        color: #007acc;
                    }
                    .tab-content {
                        display: none;
                    }
                    .tab-content.active {
                        display: block;
                    }
                </style>
            </head>
            <body>
                <div class="tabs">
                    <div class="tab active" onclick="switchTab('standard')">Standard Analysis</div>
                    <div class="tab" onclick="switchTab('ai')">AI Analysis</div>
                </div>

                <div id="standard-tab" class="tab-content active">
                    <div class="score-container">
                        <div class="score">${score}%</div>
                        <div>Security Score</div>
                    </div>

                    <div class="section">
                        <h2>🚨 High Severity Issues (${highIssues.length})</h2>
                        ${this.renderIssues(highIssues, 'high')}
                    </div>

                    <div class="section">
                        <h2>⚠️ Medium Severity Issues (${mediumIssues.length})</h2>
                        ${this.renderIssues(mediumIssues, 'medium')}
                    </div>

                    <div class="section">
                        <h2>ℹ️ Low Severity Issues (${lowIssues.length})</h2>
                        ${this.renderIssues(lowIssues, 'low')}
                    </div>
                </div>

                <div id="ai-tab" class="tab-content">
                    <div class="ai-section">
                        <h2>🤖 AI-Powered Security Analysis</h2>
                        <p>Get detailed security insights using advanced AI analysis of your code.</p>
                        <button class="button" onclick="requestAIAnalysis()">Run AI Analysis</button>
                        <div id="loading" class="loading">
                            Analyzing code using AI... Please wait...
                        </div>
                        <div id="error-message" class="error-message"></div>
                        <div id="ai-results" class="ai-results"></div>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    function switchTab(tabName) {
                        document.querySelectorAll('.tab').forEach(tab => {
                            tab.classList.remove('active');
                        });
                        document.querySelectorAll('.tab-content').forEach(content => {
                            content.classList.remove('active');
                        });
                        
                        document.querySelector(\`[onclick="switchTab('\${tabName}')"]\`).classList.add('active');
                        document.getElementById(\`\${tabName}-tab\`).classList.add('active');
                    }

                    function requestAIAnalysis() {
                        const loading = document.getElementById('loading');
                        const errorMessage = document.getElementById('error-message');
                        const aiResults = document.getElementById('ai-results');
                        
                        loading.style.display = 'block';
                        errorMessage.style.display = 'none';
                        aiResults.innerHTML = '';
                        
                        vscode.postMessage({
                            command: 'requestAIAnalysis'
                        });
                    }

                    window.addEventListener('message', event => {
                        const message = event.data;
                        const loading = document.getElementById('loading');
                        const errorMessage = document.getElementById('error-message');
                        const aiResults = document.getElementById('ai-results');

                        switch (message.command) {
                            case 'aiAnalysisResult':
                                loading.style.display = 'none';
                                aiResults.innerHTML = renderAIIssues(message.issues);
                                break;
                            case 'aiAnalysisError':
                                loading.style.display = 'none';
                                errorMessage.style.display = 'block';
                                errorMessage.textContent = message.error;
                                break;
                        }
                    });

                    function renderAIIssues(issues) {
                        if (!issues || issues.length === 0) {
                            return '<p>No security issues found by AI analysis.</p>';
                        }

                        return issues.map(issue => \`
                            <div class="issue \${issue.severity}">
                                <strong>Line \${issue.line}:</strong> \${issue.message}
                                <br>
                                <small>Severity: \${issue.severity}</small>
                            </div>
                        \`).join('');
                    }
                </script>
            </body>
            </html>
        `;
    }

    private renderIssues(issues: any[], severity: string): string {
        return issues
            .map(
                issue => `
                <div class="issue ${severity}">
                    <strong>Line ${issue.line}:</strong> ${issue.message}
                    <br>
                    <small>Rule: ${issue.rule}</small>
                </div>
            `
            )
            .join('');
    }

    private getScoreColor(score: number): string {
        if (score >= 90) return '#00c853';
        if (score >= 70) return '#ffd600';
        if (score >= 50) return '#ff9100';
        return '#ff1744';
    }
}
