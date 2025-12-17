import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { SnippetGenerator } from './snippets/snippetGenerator';
import { AssistantTreeProvider } from './views/assistantTreeProvider';
import { SnippetsTreeProvider } from './views/snippetsTreeProvider';
import { EventsTreeProvider } from './views/eventsTreeProvider';
import { SDKIntegrationTreeProvider } from './views/sdkIntegrationTreeProvider';
import { AssistantWebviewProvider } from './webviews/assistantWebview';
import { SnippetsWebviewProvider } from './webviews/snippetsWebview';
import { EventsWebviewProvider } from './webviews/eventsWebview';
import { RazorpayService } from './services/razorpayService';
import { RazorpayHoverProvider } from './providers/razorpayHoverProvider';
import { sdkSnippetTemplates } from './snippets/sdkTemplates';

let logger: Logger;
let snippetGenerator: SnippetGenerator;
let razorpayService: RazorpayService;
let assistantTreeProvider: AssistantTreeProvider;
let snippetsTreeProvider: SnippetsTreeProvider;
let eventsTreeProvider: EventsTreeProvider;
let sdkIntegrationTreeProvider: SDKIntegrationTreeProvider;
let assistantWebview: AssistantWebviewProvider;
let snippetsWebview: SnippetsWebviewProvider;
let eventsWebview: EventsWebviewProvider;

/**
 * Extension activation function.
 * Called when VS Code activates the extension.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    logger = new Logger('Razorpay');
    logger.info('Razorpay extension is now active!');

    // Initialize services
    snippetGenerator = new SnippetGenerator(logger);
    razorpayService = new RazorpayService(logger);

    // Initialize Razorpay service if credentials are configured
    const config = vscode.workspace.getConfiguration('razorpay');
    const keyId = config.get<string>('keyId', '');
    const keySecret = config.get<string>('keySecret', '');
    
    if (keyId && keySecret) {
      try {
        razorpayService.initialize({ keyId, keySecret });
        logger.info('Razorpay service initialized with configured credentials');
      } catch (error) {
        logger.warn('Failed to initialize Razorpay service. Please check your credentials in settings.');
      }
    }

    // Initialize tree view providers for separate panes
    assistantTreeProvider = new AssistantTreeProvider();
    snippetsTreeProvider = new SnippetsTreeProvider(snippetGenerator);
    eventsTreeProvider = new EventsTreeProvider();
    sdkIntegrationTreeProvider = new SDKIntegrationTreeProvider();

    // Register tree views
    vscode.window.createTreeView('razorpayAssistant', {
      treeDataProvider: assistantTreeProvider,
    });
    vscode.window.createTreeView('razorpaySnippets', {
      treeDataProvider: snippetsTreeProvider,
      showCollapseAll: true,
    });
    vscode.window.createTreeView('razorpayEvents', {
      treeDataProvider: eventsTreeProvider,
    });
    vscode.window.createTreeView('razorpaySDKIntegration', {
      treeDataProvider: sdkIntegrationTreeProvider,
    });

    // Initialize webview providers
    assistantWebview = new AssistantWebviewProvider(context, logger);
    snippetsWebview = new SnippetsWebviewProvider(context, logger, snippetGenerator);
    eventsWebview = new EventsWebviewProvider(context, logger, razorpayService);

    // Register hover provider for API documentation
    const hoverProvider = new RazorpayHoverProvider();
    const supportedLanguages = [
      'javascript',
      'typescript',
      'javascriptreact',
      'typescriptreact',
      'python',
      'java',
      'go',
      'ruby',
    ];
    
    supportedLanguages.forEach(language => {
      context.subscriptions.push(
        vscode.languages.registerHoverProvider(language, hoverProvider)
      );
    });

    // Register commands
    registerCommands(context);

    // Listen for configuration changes
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('razorpay.keyId') || e.affectsConfiguration('razorpay.keySecret')) {
          const newConfig = vscode.workspace.getConfiguration('razorpay');
          const newKeyId = newConfig.get<string>('keyId', '');
          const newKeySecret = newConfig.get<string>('keySecret', '');
          
          if (newKeyId && newKeySecret) {
            try {
              razorpayService.initialize({ keyId: newKeyId, keySecret: newKeySecret });
              logger.info('Razorpay service reinitialized with new credentials');
            } catch (error) {
              logger.error('Failed to reinitialize Razorpay service', error as Error);
            }
          }
        }
      }),
    );

    logger.info('Razorpay extension initialized successfully');
  } catch (error) {
    console.error('Razorpay Extension Activation Error:', error);
    const errorChannel = vscode.window.createOutputChannel('Razorpay Errors');
    errorChannel.appendLine(`Failed to activate extension: ${error}`);
    if (error instanceof Error) {
      errorChannel.appendLine(`Error message: ${error.message}`);
      errorChannel.appendLine(`Stack: ${error.stack}`);
    }
    errorChannel.show();
    vscode.window.showErrorMessage(`Razorpay extension failed to activate. Check "Razorpay Errors" output channel.`);
  }
}

function registerCommands(context: vscode.ExtensionContext): void {
  const openAssistantCommand = vscode.commands.registerCommand('razorpay.openAssistant', () => {
    assistantWebview.show();
  });
  context.subscriptions.push(openAssistantCommand);

  const openSnippetsCommand = vscode.commands.registerCommand('razorpay.openSnippets', () => {
    snippetsWebview.show();
  });
  context.subscriptions.push(openSnippetsCommand);

  const openEventsCommand = vscode.commands.registerCommand('razorpay.openEvents', (section?: string) => {
    eventsWebview.show(section);
  });
  context.subscriptions.push(openEventsCommand);

  const insertSnippetCommand = vscode.commands.registerCommand('razorpay.insertSnippet', async (snippetPattern: string) => {
    await handleInsertSnippet(snippetPattern);
  });
  context.subscriptions.push(insertSnippetCommand);

  const insertSDKTemplateCommand = vscode.commands.registerCommand('razorpay.insertSDKTemplate', async (templateId: string) => {
    await handleInsertSDKTemplate(templateId);
  });
  context.subscriptions.push(insertSDKTemplateCommand);

  const snippetGenerateCommand = vscode.commands.registerCommand('razorpay.snippets.generate', async () => {
    await handleSnippetGenerate();
  });
  context.subscriptions.push(snippetGenerateCommand);

  const snippetListCommand = vscode.commands.registerCommand('razorpay.snippets.list', async () => {
    await handleSnippetList();
  });
  context.subscriptions.push(snippetListCommand);
}

async function handleInsertSnippet(snippetPattern: string): Promise<void> {
  try {
    let editor = vscode.window.activeTextEditor;
    
    // If no file is open, create a new untitled file
    if (!editor) {
      const document = await vscode.workspace.openTextDocument({ content: '', language: 'typescript' });
      editor = await vscode.window.showTextDocument(document);
    }

    await snippetGenerator.generateSnippet(snippetPattern, editor);
    vscode.window.showInformationMessage('Snippet inserted successfully!');
  } catch (error) {
    logger.error('Failed to insert snippet', error as Error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to insert snippet: ${errorMessage}`);
  }
}

async function handleInsertSDKTemplate(templateId: string): Promise<void> {
  try {
    const template = sdkSnippetTemplates.find(t => t.id === templateId);
    
    if (!template) {
      vscode.window.showErrorMessage('SDK template not found.');
      return;
    }

    let editor = vscode.window.activeTextEditor;
    
    // If no file is open, create a new file with appropriate extension
    if (!editor) {
      const fileInfo = getFileInfoForTemplate(templateId);
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      
      if (workspaceFolder) {
        // Create file in workspace
        const fileName = `razorpay-${fileInfo.name}${fileInfo.extension}`;
        const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName);
        
        // Create the file with empty content
        await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
        
        // Open the file
        const document = await vscode.workspace.openTextDocument(fileUri);
        editor = await vscode.window.showTextDocument(document);
      } else {
        // No workspace, create untitled document with proper language
        const document = await vscode.workspace.openTextDocument({ 
          content: '', 
          language: fileInfo.language 
        });
        editor = await vscode.window.showTextDocument(document);
      }
    }

    // Insert the code as a snippet at cursor position
    const code = template.body.join('\n');
    const snippet = new vscode.SnippetString(code);
    const position = editor.selection.active;
    await editor.insertSnippet(snippet, position);
    
    vscode.window.showInformationMessage(`${template.name} code inserted successfully!`);
    logger.info(`SDK template ${templateId} inserted`);
  } catch (error) {
    logger.error('Failed to insert SDK template', error as Error);
    vscode.window.showErrorMessage('Failed to insert SDK code. Check output channel for details.');
  }
}

interface FileInfo {
  name: string;
  extension: string;
  language: string;
}

function getFileInfoForTemplate(templateId: string): FileInfo {
  if (templateId.includes('html')) {
    return { name: 'checkout', extension: '.html', language: 'html' };
  }
  if (templateId.includes('react')) {
    return { name: 'PaymentButton', extension: '.tsx', language: 'typescriptreact' };
  }
  if (templateId.includes('nextjs')) {
    return { name: 'PaymentButton', extension: '.tsx', language: 'typescriptreact' };
  }
  if (templateId.includes('vue')) {
    return { name: 'PaymentButton', extension: '.vue', language: 'vue' };
  }
  if (templateId.includes('angular')) {
    return { name: 'payment.component', extension: '.ts', language: 'typescript' };
  }
  if (templateId.includes('reactnative')) {
    return { name: 'PaymentScreen', extension: '.tsx', language: 'typescriptreact' };
  }
  if (templateId.includes('node')) {
    return { name: 'razorpay-server', extension: '.ts', language: 'typescript' };
  }
  if (templateId.includes('python')) {
    return { name: 'razorpay_server', extension: '.py', language: 'python' };
  }
  if (templateId.includes('java') && !templateId.includes('javascript')) {
    return { name: 'RazorpayService', extension: '.java', language: 'java' };
  }
  if (templateId.includes('go')) {
    return { name: 'razorpay', extension: '.go', language: 'go' };
  }
  if (templateId.includes('ruby')) {
    return { name: 'razorpay_server', extension: '.rb', language: 'ruby' };
  }
  if (templateId.includes('php')) {
    return { name: 'razorpay', extension: '.php', language: 'php' };
  }
  if (templateId.includes('android')) {
    return { name: 'PaymentActivity', extension: '.kt', language: 'kotlin' };
  }
  if (templateId.includes('ios')) {
    return { name: 'PaymentViewController', extension: '.swift', language: 'swift' };
  }
  if (templateId.includes('flutter')) {
    return { name: 'payment_page', extension: '.dart', language: 'dart' };
  }
  return { name: 'razorpay', extension: '.ts', language: 'typescript' };
}

async function handleSnippetGenerate(): Promise<void> {
  try {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor found');
      return;
    }

    const language = editor.document.languageId;
    const snippets = snippetGenerator.getAvailableSnippets(language);

    if (snippets.length === 0) {
      vscode.window.showInformationMessage(`No snippets available for ${language}`);
      return;
    }

    const snippet = await vscode.window.showQuickPick(
      snippets.map((s) => ({
        label: s.name,
        description: s.description,
        category: s.category,
        snippet: s,
      })),
      {
        placeHolder: 'Select a snippet to generate',
      },
    );

    if (!snippet) {
      return;
    }

    await snippetGenerator.generateSnippet(snippet.snippet.id, editor);
    vscode.window.showInformationMessage(`Snippet "${snippet.snippet.name}" inserted`);
  } catch (error) {
    logger.error('Failed to generate snippet', error as Error);
    vscode.window.showErrorMessage('Failed to generate snippet. Check output channel for details.');
  }
}

async function handleSnippetList(): Promise<void> {
  try {
    const editor = vscode.window.activeTextEditor;
    const language = editor?.document.languageId || 'typescript';
    const snippets = snippetGenerator.getAvailableSnippets(language);

    const items = snippets.map((snippet) => ({
      label: snippet.name,
      description: snippet.description,
      detail: `Category: ${snippet.category}`,
    }));

    await vscode.window.showQuickPick(items, {
      placeHolder: `Available Snippets for ${language}`,
    });
  } catch (error) {
    logger.error('Failed to list snippets', error as Error);
    vscode.window.showErrorMessage('Failed to list snippets. Check output channel for details.');
  }
}

export function deactivate(): void {
  logger?.info('Razorpay extension is now deactivated');
}
