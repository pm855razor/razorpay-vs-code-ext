import * as vscode from 'vscode';
import type { Logger } from '../utils/logger';
import { SnippetGenerator } from '../snippets/snippetGenerator';

export class SnippetsWebviewProvider {
  private static currentPanel: vscode.WebviewPanel | undefined = undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private logger: Logger,
    private snippetGenerator: SnippetGenerator,
  ) {}

  public show(): void {
    if (SnippetsWebviewProvider.currentPanel) {
      SnippetsWebviewProvider.currentPanel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'razorpaySnippets',
      'Razorpay Code Snippets',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    panel.webview.html = this.getWebviewContent(panel.webview);

    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'getSnippets':
            this.handleGetSnippets(panel.webview);
            break;
          case 'insertSnippet':
            await this.handleInsertSnippet(message.snippetId, message.language);
            break;
        }
      },
      null,
      this.context.subscriptions,
    );

    panel.onDidDispose(
      () => {
        SnippetsWebviewProvider.currentPanel = undefined;
      },
      null,
      this.context.subscriptions,
    );

    SnippetsWebviewProvider.currentPanel = panel;
    
    this.handleGetSnippets(panel.webview);

    this.context.subscriptions.push(
      vscode.window.onDidChangeActiveTextEditor(() => {
        if (SnippetsWebviewProvider.currentPanel) {
          this.handleGetSnippets(SnippetsWebviewProvider.currentPanel.webview);
        }
      }),
    );
  }

  private handleGetSnippets(webview: vscode.Webview): void {
    const editor = vscode.window.activeTextEditor;
    let language = editor?.document.languageId || 'typescript';
    
    const languageMap: Record<string, string> = {
      'javascript': 'javascript',
      'javascriptreact': 'javascript',
      'typescript': 'typescript',
      'typescriptreact': 'typescript',
      'python': 'python',
      'java': 'java',
      'go': 'go',
      'golang': 'go',
      'ruby': 'ruby',
    };
    
    language = languageMap[language] || 'typescript';
    
    const snippets = this.snippetGenerator.getAvailableSnippets(language);

    webview.postMessage({
      command: 'snippets',
      snippets: snippets.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
      })),
      language: language,
      hasActiveEditor: !!editor,
      fileName: editor?.document.fileName || null,
    });
  }

  private async handleInsertSnippet(snippetId: string, language: string): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      
      if (!editor) {
        vscode.window.showWarningMessage('Please open a file first to insert the snippet.');
        return;
      }

      const currentLanguage = editor.document.languageId;
      const languageMap: Record<string, string> = {
        'javascript': 'javascript',
        'javascriptreact': 'javascript',
        'typescript': 'typescript',
        'typescriptreact': 'typescript',
        'python': 'python',
        'java': 'java',
        'go': 'go',
        'golang': 'go',
        'ruby': 'ruby',
      };
      
      const normalizedLanguage = languageMap[currentLanguage] || language;
      const availableSnippets = this.snippetGenerator.getAvailableSnippets(normalizedLanguage);
      const snippetExists = availableSnippets.some(s => s.id === snippetId);
      
      if (!snippetExists) {
        vscode.window.showWarningMessage(`This snippet is not available for ${currentLanguage}. Please use a supported language file.`);
        return;
      }

      await this.snippetGenerator.generateSnippet(snippetId, editor);
      vscode.window.showInformationMessage('Snippet inserted successfully!');
    } catch (error) {
      this.logger.error('Failed to insert snippet', error as Error);
      vscode.window.showErrorMessage('Failed to insert snippet. Check output channel for details.');
    }
  }

  private getWebviewContent(_webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Razorpay Code Snippets</title>
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
            margin-bottom: 20px;
        }
        .snippets-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .snippet-card {
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 15px;
            background-color: var(--vscode-input-background);
            cursor: pointer;
            transition: all 0.2s;
        }
        .snippet-card:hover {
            border-color: var(--vscode-textLink-foreground);
            background-color: var(--vscode-list-hoverBackground);
        }
        .snippet-category {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .snippet-name {
            font-weight: bold;
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }
        .snippet-description {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
        }
        .language-info {
            margin-bottom: 15px;
            padding: 10px;
            background-color: var(--vscode-textBlockQuote-background);
            border-radius: 4px;
        }
        .loading {
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1> Razorpay Code Snippets</h1>
        <div class="language-info" id="languageInfo">Loading snippets...</div>
        <div class="snippets-grid" id="snippetsGrid">
            <div class="loading">Loading snippets...</div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const snippetsGrid = document.getElementById('snippetsGrid');
        const languageInfo = document.getElementById('languageInfo');

        function renderSnippets(snippets, language, hasActiveEditor, fileName) {
            let infoText = \`Available snippets for: \${language}\`;
            if (hasActiveEditor && fileName) {
                const filePath = fileName.split('/').pop() || fileName.split('\\\\').pop();
                infoText += \` (Current file: \${filePath})\`;
            } else {
                infoText += ' (Please open a file to insert snippets)';
            }
            languageInfo.textContent = infoText;
            
            if (snippets.length === 0) {
                snippetsGrid.innerHTML = '<div class="loading">No snippets available for this language. Please open a supported file (TypeScript, JavaScript, Python, Java, Go, or Ruby).</div>';
                return;
            }

            snippetsGrid.innerHTML = snippets.map(snippet => \`
                <div class="snippet-card" onclick="insertSnippet('\${snippet.id}', '\${language}')">
                    <div class="snippet-category">\${snippet.category}</div>
                    <div class="snippet-name">\${snippet.name}</div>
                    <div class="snippet-description">\${snippet.description}</div>
                </div>
            \`).join('');
        }

        function insertSnippet(snippetId, language) {
            vscode.postMessage({
                command: 'insertSnippet',
                snippetId: snippetId,
                language: language
            });
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'snippets') {
                renderSnippets(message.snippets, message.language, message.hasActiveEditor, message.fileName);
            }
        });

        // Request snippets on load
        vscode.postMessage({
            command: 'getSnippets'
        });
    </script>
</body>
</html>`;
  }
}

