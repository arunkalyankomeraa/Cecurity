import * as vscode from 'vscode';
import { analyzeCode, calculateSecurityScore, SecurityIssue } from './analyzer';
import { SecurityPanel } from './securityPanel';
import { StatusBarManager } from './statusBarManager';
import { AIAnalyzer } from './aiAnalyzer';

let securityPanel: SecurityPanel;
let statusBarManager: StatusBarManager;
let aiAnalyzer: AIAnalyzer;

export function activate(context: vscode.ExtensionContext) {
    let activeEditor = vscode.window.activeTextEditor;
    let diagnosticCollection = vscode.languages.createDiagnosticCollection('security-analyzer');

    // Initialize components
    securityPanel = new SecurityPanel(context.extensionUri);
    statusBarManager = new StatusBarManager();

    // Set initial OpenAI key
    const config = vscode.workspace.getConfiguration('securityAnalyzer');
    const apiKey = "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";
    config.update('openAIKey', apiKey, true).then(() => {
        aiAnalyzer = new AIAnalyzer();
        vscode.window.showInformationMessage('OpenAI API Key has been configured');
    });

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('security-analyzer.analyze', () => {
            if (activeEditor) {
                analyzeCurrentFile(activeEditor, diagnosticCollection);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('security-analyzer.showReport', () => {
            securityPanel.show();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('security-analyzer.aiAnalyze', async () => {
            if (activeEditor) {
                await analyzeWithAI(activeEditor, diagnosticCollection);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('security-analyzer.setOpenAIKey', async () => {
            const key = await vscode.window.showInputBox({
                prompt: 'Enter your OpenAI API Key',
                password: true,
                value: apiKey // Pre-fill with current key
            });

            if (key) {
                await vscode.workspace.getConfiguration('securityAnalyzer').update('openAIKey', key, true);
                aiAnalyzer = new AIAnalyzer(); // Reinitialize with new key
                vscode.window.showInformationMessage('OpenAI API Key has been updated');
            }
        })
    );

    // Watch for text document changes
    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            analyzeCurrentFile(activeEditor, diagnosticCollection);
        }
    });

    // Watch for active editor changes
    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            analyzeCurrentFile(editor, diagnosticCollection);
        }
    });

    // Initial analysis
    if (activeEditor) {
        analyzeCurrentFile(activeEditor, diagnosticCollection);
    }
}

async function analyzeWithAI(editor: vscode.TextEditor, diagnosticCollection: vscode.DiagnosticCollection) {
    try {
        const text = editor.document.getText();
        const aiIssues = await aiAnalyzer.analyzeCode(text);
        const standardIssues = analyzeCode(text);
        
        // Combine AI and standard analysis results
        const allIssues = [...standardIssues, ...aiIssues];
        updateDiagnostics(editor, diagnosticCollection, allIssues);
        
        // Update UI components
        updateSecurityScore(allIssues);
        securityPanel.update(allIssues);
        statusBarManager.update(allIssues);
    } catch (error) {
        vscode.window.showErrorMessage('AI Analysis failed. Please check your OpenAI API key configuration.');
    }
}

function analyzeCurrentFile(editor: vscode.TextEditor, diagnosticCollection: vscode.DiagnosticCollection) {
    const text = editor.document.getText();
    const issues = analyzeCode(text);
    updateDiagnostics(editor, diagnosticCollection, issues);
    
    // Update UI components
    updateSecurityScore(issues);
    securityPanel.update(issues);
    statusBarManager.update(issues);
}

function updateDiagnostics(editor: vscode.TextEditor, diagnosticCollection: vscode.DiagnosticCollection, issues: SecurityIssue[]) {
    const diagnostics: vscode.Diagnostic[] = issues.map(issue => {
        const range = new vscode.Range(
            issue.line - 1, 0,
            issue.line - 1, 100
        );
        
        const diagnostic = new vscode.Diagnostic(
            range,
            issue.message,
            convertSeverity(issue.severity)
        );
        
        diagnostic.source = 'Security Analyzer';
        diagnostic.code = {
            value: issue.rule,
            target: vscode.Uri.parse(`https://security-docs.example.com/${issue.rule}`)
        };

        const icon = getSeverityIcon(issue.severity);
        diagnostic.message = `${icon} ${diagnostic.message}`;
        
        return diagnostic;
    });

    diagnosticCollection.set(editor.document.uri, diagnostics);
}

function convertSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
        case 'high':
            return vscode.DiagnosticSeverity.Error;
        case 'medium':
            return vscode.DiagnosticSeverity.Warning;
        case 'low':
            return vscode.DiagnosticSeverity.Information;
        default:
            return vscode.DiagnosticSeverity.Hint;
    }
}

function getSeverityIcon(severity: string): string {
    switch (severity) {
        case 'high':
            return '$(error)';
        case 'medium':
            return '$(warning)';
        case 'low':
            return '$(info)';
        default:
            return '$(circle-outline)';
    }
}

function updateSecurityScore(issues: SecurityIssue[]) {
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const mediumIssues = issues.filter(i => i.severity === 'medium').length;
    const score = calculateSecurityScore(highIssues, mediumIssues);
    
    statusBarManager.updateScore(score);
}

export function deactivate() {
    if (statusBarManager) {
        statusBarManager.dispose();
    }
}