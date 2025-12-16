import * as vscode from 'vscode';
import { Logger } from './utils/logger';
import { SnippetGenerator } from './snippets/snippetGenerator';
import { SnippetTreeProvider } from './views/snippetTreeProvider';

let logger: Logger;
let snippetGenerator: SnippetGenerator;
let snippetTreeProvider: SnippetTreeProvider;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    logger = new Logger('Razorpay');
    logger.info('Razorpay extension is now active!');

    snippetGenerator = new SnippetGenerator(logger);
    snippetTreeProvider = new SnippetTreeProvider(snippetGenerator);

    // Register sidebar tree view
    vscode.window.createTreeView('razorpaySnippets', {
      treeDataProvider: snippetTreeProvider,
      showCollapseAll: true,
    });

    registerCommands(context);

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

  const refreshCommand = vscode.commands.registerCommand('razorpay.refreshSnippets', () => {
    snippetTreeProvider.refresh();
  });
  context.subscriptions.push(refreshCommand);
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
