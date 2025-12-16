import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { SnippetGenerator } from './snippets/snippetGenerator';
import { RazorpayTreeViewProvider } from './views/treeViewProvider.ts';
import { AssistantWebviewProvider } from './webviews/assistantWebview';
import { SnippetsWebviewProvider } from './webviews/snippetsWebview';
import { EventsWebviewProvider } from './webviews/eventsWebview';
import { RazorpayService } from './services/razorpayService';

let logger: Logger;
let snippetGenerator: SnippetGenerator;
let razorpayService: RazorpayService;
let treeViewProvider: RazorpayTreeViewProvider;
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

    // Initialize tree view provider
    treeViewProvider = new RazorpayTreeViewProvider();
    vscode.window.createTreeView('razorpaySidebar', {
      treeDataProvider: treeViewProvider,
    });

    // Initialize webview providers
    assistantWebview = new AssistantWebviewProvider(context, logger);
    snippetsWebview = new SnippetsWebviewProvider(context, logger, snippetGenerator);
    eventsWebview = new EventsWebviewProvider(context, logger, razorpayService);

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
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('Please open a file first to insert the snippet.');
      return;
    }

    await snippetGenerator.generateSnippet(snippetPattern, editor);
    vscode.window.showInformationMessage('Snippet inserted successfully!');
  } catch (error) {
    logger.error('Failed to insert snippet', error as Error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(`Failed to insert snippet: ${errorMessage}`);
  }
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
