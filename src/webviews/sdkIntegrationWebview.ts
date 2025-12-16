import * as vscode from 'vscode';
import type { Logger } from '../utils/logger';
import { ProjectDetector } from '../utils/projectDetector';
import { SDKInstaller } from '../utils/sdkInstaller';
import { getSDKTemplate } from '../snippets/sdkTemplates';

export class SDKIntegrationWebviewProvider {
  private static currentPanel: vscode.WebviewPanel | undefined = undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private logger: Logger,
    private sdkInstaller: SDKInstaller,
  ) {}

  public async show(): Promise<void> {
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

    // Detect project on load
    const projectInfo = await ProjectDetector.detectProject();
    panel.webview.postMessage({
      command: 'projectDetected',
      projectInfo,
    });

    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'detectProject':
            await this.handleDetectProject(panel.webview);
            break;
          case 'getSDKTemplate':
            await this.handleGetSDKTemplate(panel.webview, message.projectType);
            break;
          case 'installSDK':
            await this.handleInstallSDK(message.projectType, message.rootPath);
            break;
          case 'insertCode':
            await this.handleInsertCode(message.code);
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
  }

  private async handleDetectProject(webview: vscode.Webview): Promise<void> {
    try {
      const projectInfo = await ProjectDetector.detectProject();
      webview.postMessage({
        command: 'projectDetected',
        projectInfo,
      });
      
      // Automatically load SDK template
      if (projectInfo.type !== 'unknown') {
        await this.handleGetSDKTemplate(webview, projectInfo.type);
      }
    } catch (error) {
      this.logger.error('Failed to detect project', error as Error);
      webview.postMessage({
        command: 'error',
        message: 'Failed to detect project type',
      });
    }
  }

  private async handleGetSDKTemplate(webview: vscode.Webview, projectType: string): Promise<void> {
    try {
      const template = getSDKTemplate(projectType as any);
      webview.postMessage({
        command: 'sdkTemplate',
        template,
      });
    } catch (error) {
      this.logger.error('Failed to get SDK template', error as Error);
      webview.postMessage({
        command: 'error',
        message: 'Failed to load SDK template',
      });
    }
  }

  private async handleInstallSDK(projectType: string, rootPath: string): Promise<void> {
    try {
      const success = await this.sdkInstaller.installSDK(projectType as any, rootPath);
      if (SDKIntegrationWebviewProvider.currentPanel) {
        SDKIntegrationWebviewProvider.currentPanel.webview.postMessage({
          command: 'sdkInstallResult',
          success,
        });
      }
    } catch (error) {
      this.logger.error('Failed to install SDK', error as Error);
      if (SDKIntegrationWebviewProvider.currentPanel) {
        SDKIntegrationWebviewProvider.currentPanel.webview.postMessage({
          command: 'sdkInstallResult',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  private async handleInsertCode(code: string): Promise<void> {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('Please open a file first to insert the code.');
        return;
      }

      const snippet = new vscode.SnippetString(code);
      const position = editor.selection.active;
      await editor.insertSnippet(snippet, position);
      vscode.window.showInformationMessage('SDK integration code inserted successfully!');
    } catch (error) {
      this.logger.error('Failed to insert code', error as Error);
      vscode.window.showErrorMessage('Failed to insert code. Check output channel for details.');
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
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 20px;
        }
        .project-info {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 4px;
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textLink-foreground);
        }
        .project-info h3 {
            margin-top: 0;
            margin-bottom: 10px;
        }
        .project-type {
            font-size: 18px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .sdk-status {
            margin-top: 10px;
            padding: 8px;
            border-radius: 4px;
            display: inline-block;
        }
        .sdk-status.installed {
            background-color: var(--vscode-testing-iconPassed);
            color: white;
        }
        .sdk-status.not-installed {
            background-color: var(--vscode-testing-iconFailed);
            color: white;
        }
        .actions {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        button {
            padding: 10px 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .code-container {
            margin-top: 20px;
        }
        .code-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .code-header h3 {
            margin: 0;
        }
        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
            border: 1px solid var(--vscode-input-border);
        }
        code {
            font-family: var(--vscode-editor-font-family);
            font-size: 13px;
            line-height: 1.5;
        }
        .loading {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        .unknown-project {
            padding: 20px;
            background-color: var(--vscode-input-background);
            border-radius: 4px;
            border: 1px solid var(--vscode-input-border);
        }
        .install-command {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-family: var(--vscode-editor-font-family);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔌 Razorpay SDK Integration</h1>
        <div id="loading" class="loading">Detecting project type...</div>
        
        <div id="projectInfo" style="display: none;">
            <div class="project-info">
                <h3>Detected Project</h3>
                <div class="project-type" id="projectType">-</div>
                <div style="margin-top: 10px;">
                    <strong>Root Path:</strong> <span id="rootPath">-</span>
                </div>
                <div style="margin-top: 10px;">
                    <strong>SDK Status:</strong>
                    <span id="sdkStatus" class="sdk-status">-</span>
                </div>
            </div>
            
            <div class="actions">
                <button id="detectBtn" onclick="detectProject()">🔄 Re-detect Project</button>
                <button id="installBtn" onclick="installSDK()" disabled>📦 Install SDK</button>
                <button id="insertBtn" onclick="insertCode()" disabled>📝 Insert Code</button>
            </div>
            
            <div id="codeContainer" class="code-container" style="display: none;">
                <div class="code-header">
                    <h3>Integration Code</h3>
                    <button onclick="copyCode()">📋 Copy</button>
                </div>
                <pre><code id="codeContent"></code></pre>
                <div id="installCommand" class="install-command" style="display: none;">
                    <strong>Installation Command:</strong>
                    <code id="installCommandText"></code>
                </div>
            </div>
        </div>
        
        <div id="unknownProject" class="unknown-project" style="display: none;">
            <h3>Project Type Not Detected</h3>
            <p>We couldn't automatically detect your project type. Please ensure your project has the required configuration files:</p>
            <ul>
                <li><strong>Web:</strong> HTML/JS files</li>
                <li><strong>React:</strong> package.json with react dependency</li>
                <li><strong>Next.js:</strong> package.json with next dependency</li>
                <li><strong>Android:</strong> build.gradle or AndroidManifest.xml</li>
                <li><strong>iOS:</strong> Podfile or .xcodeproj</li>
                <li><strong>Flutter:</strong> pubspec.yaml</li>
                <li><strong>Node.js:</strong> package.json</li>
                <li><strong>Python:</strong> requirements.txt or setup.py</li>
                <li><strong>PHP:</strong> composer.json</li>
                <li><strong>Ruby:</strong> Gemfile</li>
                <li><strong>Java:</strong> pom.xml or build.gradle</li>
                <li><strong>Go:</strong> go.mod</li>
            </ul>
            <button onclick="detectProject()">Try Again</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentProjectInfo = null;
        let currentCode = '';

        function detectProject() {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('projectInfo').style.display = 'none';
            document.getElementById('unknownProject').style.display = 'none';
            vscode.postMessage({ command: 'detectProject' });
        }

        function installSDK() {
            if (!currentProjectInfo) return;
            vscode.postMessage({
                command: 'installSDK',
                projectType: currentProjectInfo.type,
                rootPath: currentProjectInfo.rootPath
            });
        }

        function insertCode() {
            if (!currentCode) return;
            vscode.postMessage({
                command: 'insertCode',
                code: currentCode
            });
        }

        function copyCode() {
            if (!currentCode) return;
            navigator.clipboard.writeText(currentCode).then(() => {
                vscode.postMessage({
                    command: 'showMessage',
                    message: 'Code copied to clipboard!'
                });
            });
        }

        function updateUI(projectInfo) {
            currentProjectInfo = projectInfo;
            document.getElementById('loading').style.display = 'none';
            
            if (projectInfo.type === 'unknown') {
                document.getElementById('unknownProject').style.display = 'block';
                return;
            }

            document.getElementById('projectInfo').style.display = 'block';
            document.getElementById('projectType').textContent = projectInfo.type.toUpperCase();
            document.getElementById('rootPath').textContent = projectInfo.rootPath;
            
            const sdkStatus = document.getElementById('sdkStatus');
            if (projectInfo.hasSDK) {
                sdkStatus.textContent = '✓ SDK Installed';
                sdkStatus.className = 'sdk-status installed';
                document.getElementById('installBtn').disabled = true;
            } else {
                sdkStatus.textContent = '✗ SDK Not Installed';
                sdkStatus.className = 'sdk-status not-installed';
                document.getElementById('installBtn').disabled = false;
            }

            // Load SDK template
            fetchSDKTemplate(projectInfo.type);
        }

        function fetchSDKTemplate(projectType) {
            // Request template from extension
            vscode.postMessage({
                command: 'getSDKTemplate',
                projectType: projectType
            });
        }

        function displayCode(template) {
            currentCode = template.code;
            document.getElementById('codeContent').textContent = template.code;
            document.getElementById('codeContainer').style.display = 'block';
            document.getElementById('insertBtn').disabled = false;
            
            if (template.installCommand) {
                document.getElementById('installCommandText').textContent = template.installCommand;
                document.getElementById('installCommand').style.display = 'block';
            }
        }

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'projectDetected':
                    updateUI(message.projectInfo);
                    break;
                case 'sdkTemplate':
                    displayCode(message.template);
                    break;
                case 'sdkInstallResult':
                    if (message.success) {
                        alert('SDK installation started! Check the terminal for progress.');
                        detectProject(); // Re-detect to update status
                    } else {
                        alert('SDK installation failed: ' + (message.error || 'Unknown error'));
                    }
                    break;
                case 'error':
                    alert('Error: ' + message.message);
                    break;
            }
        });

        // Initial detection
        detectProject();
    </script>
</body>
</html>`;
  }
}

