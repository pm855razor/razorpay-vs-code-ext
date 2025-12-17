import * as vscode from 'vscode';
import type { Logger } from '../utils/logger';
import { sdkSnippetTemplates } from '../snippets/sdkTemplates';

export class SDKIntegrationWebviewProvider {
  private static currentPanel: vscode.WebviewPanel | undefined = undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private logger: Logger,
  ) {}

  public show(): void {
    if (SDKIntegrationWebviewProvider.currentPanel) {
      SDKIntegrationWebviewProvider.currentPanel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'razorpaySDKIntegration',
      'Razorpay SDK Integration',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    panel.webview.html = this.getWebviewContent(panel.webview);

    // Send available templates
    const templates = sdkSnippetTemplates.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description,
      prefix: template.prefix,
      category: template.id.includes('checkout') ? 'frontend' : 'backend',
    }));

    panel.webview.postMessage({
      command: 'templates',
      templates,
      hasActiveEditor: !!vscode.window.activeTextEditor,
      fileName: vscode.window.activeTextEditor?.document.fileName || null,
    });

    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'insertTemplate':
            await this.handleInsertTemplate(message.templateId);
            break;
        }
      },
      null,
      this.context.subscriptions,
    );

    panel.onDidDispose(
      () => {
        SDKIntegrationWebviewProvider.currentPanel = undefined;
      },
      null,
      this.context.subscriptions,
    );

    SDKIntegrationWebviewProvider.currentPanel = panel;

    // Update when active editor changes
    this.context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        if (SDKIntegrationWebviewProvider.currentPanel) {
          SDKIntegrationWebviewProvider.currentPanel.webview.postMessage({
            command: 'editorChanged',
            hasActiveEditor: !!vscode.window.activeTextEditor,
            fileName: vscode.window.activeTextEditor?.document.fileName || null,
          });
        }
      }),
    );
  }

  private async handleInsertTemplate(templateId: string): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      
      if (!editor) {
        vscode.window.showWarningMessage('Please open a file first to insert the SDK code.');
        return;
      }

      const template = sdkSnippetTemplates.find(t => t.id === templateId);
      
      if (!template) {
        vscode.window.showErrorMessage('Template not found.');
        return;
      }

      // Insert the code as a snippet at cursor position
      const code = template.body.join('\n');
      const snippet = new vscode.SnippetString(code);
      const position = editor.selection.active;
      await editor.insertSnippet(snippet, position);
      
      vscode.window.showInformationMessage(`${template.name} code inserted successfully!`);
      this.logger.info(`SDK template ${templateId} inserted`);
    } catch (error) {
      this.logger.error('Failed to insert SDK template', error as Error);
      vscode.window.showErrorMessage('Failed to insert SDK code. Check output channel for details.');
    }
  }

  private getWebviewContent(_webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Razorpay SDK Integration</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 10px;
        }
        .subtitle {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 20px;
        }
        .file-info {
            margin-bottom: 20px;
            padding: 12px 15px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 4px;
            border-left: 4px solid var(--vscode-textLink-foreground);
        }
        .file-info .label {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .file-info .path {
            font-family: var(--vscode-editor-font-family);
            margin-top: 5px;
            word-break: break-all;
        }
        .no-file-warning {
            background-color: var(--vscode-inputValidation-warningBackground);
            border: 1px solid var(--vscode-inputValidation-warningBorder);
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .templates-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
            margin-top: 10px;
        }
        .template-card {
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 15px;
            background-color: var(--vscode-input-background);
            cursor: pointer;
            transition: all 0.2s;
        }
        .template-card:hover {
            border-color: var(--vscode-textLink-foreground);
            background-color: var(--vscode-list-hoverBackground);
        }
        .template-card:active {
            transform: scale(0.98);
        }
        .template-name {
            font-weight: bold;
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }
        .template-description {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
        }
        .template-prefix {
            font-size: 11px;
            font-family: var(--vscode-editor-font-family);
            background-color: var(--vscode-textCodeBlock-background);
            padding: 3px 6px;
            border-radius: 3px;
            color: var(--vscode-textPreformat-foreground);
        }
        .insert-hint {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 10px;
            font-style: italic;
        }
        .category-title {
            font-size: 14px;
            font-weight: bold;
            color: var(--vscode-descriptionForeground);
            margin-top: 25px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .category-title:first-of-type {
            margin-top: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔌 Razorpay SDK Integration</h1>
        <p class="subtitle">Click any template to insert the code at your cursor position</p>
        
        <div id="fileInfo" class="file-info" style="display: none;">
            <div class="label">📄 Target File</div>
            <div class="path" id="filePath">-</div>
        </div>
        
        <div id="noFileWarning" class="no-file-warning" style="display: none;">
            ⚠️ <strong>No file open.</strong> Please open a file where you want to add the SDK integration code.
        </div>
        
        <div class="category-title">Frontend Checkout</div>
        <div id="frontendTemplates" class="templates-grid"></div>
        
        <div class="category-title">Backend Server</div>
        <div id="backendTemplates" class="templates-grid"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function renderTemplates(templates, hasActiveEditor, fileName) {
            // Update file info
            const fileInfo = document.getElementById('fileInfo');
            const noFileWarning = document.getElementById('noFileWarning');
            const filePath = document.getElementById('filePath');
            
            if (hasActiveEditor && fileName) {
                fileInfo.style.display = 'block';
                noFileWarning.style.display = 'none';
                const shortPath = fileName.split('/').pop() || fileName.split('\\\\').pop();
                filePath.textContent = shortPath;
            } else {
                fileInfo.style.display = 'none';
                noFileWarning.style.display = 'block';
            }

            // Categorize templates
            const frontend = templates.filter(t => t.category === 'frontend');
            const backend = templates.filter(t => t.category === 'backend');

            document.getElementById('frontendTemplates').innerHTML = renderCategory(frontend);
            document.getElementById('backendTemplates').innerHTML = renderCategory(backend);
        }

        function renderCategory(templates) {
            if (templates.length === 0) {
                return '<p style="color: var(--vscode-descriptionForeground);">No templates available</p>';
            }
            return templates.map(t => \`
                <div class="template-card" onclick="insertTemplate('\${t.id}')">
                    <div class="template-name">\${t.name}</div>
                    <div class="template-description">\${t.description}</div>
                    <div class="template-prefix">\${t.prefix}</div>
                    <div class="insert-hint">Click to insert at cursor</div>
                </div>
            \`).join('');
        }

        function insertTemplate(templateId) {
            vscode.postMessage({
                command: 'insertTemplate',
                templateId: templateId
            });
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'templates':
                    renderTemplates(message.templates, message.hasActiveEditor, message.fileName);
                    break;
                case 'editorChanged':
                    updateFileInfo(message.hasActiveEditor, message.fileName);
                    break;
            }
        });

        function updateFileInfo(hasActiveEditor, fileName) {
            const fileInfo = document.getElementById('fileInfo');
            const noFileWarning = document.getElementById('noFileWarning');
            const filePath = document.getElementById('filePath');
            
            if (hasActiveEditor && fileName) {
                fileInfo.style.display = 'block';
                noFileWarning.style.display = 'none';
                const shortPath = fileName.split('/').pop() || fileName.split('\\\\').pop();
                filePath.textContent = shortPath;
            } else {
                fileInfo.style.display = 'none';
                noFileWarning.style.display = 'block';
            }
        }
    </script>
</body>
</html>`;
  }
}
