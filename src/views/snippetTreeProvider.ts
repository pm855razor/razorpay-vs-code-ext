import * as vscode from 'vscode';
import { SnippetGenerator } from '../snippets/snippetGenerator';
import type { SnippetTemplate } from '../types';

export class SnippetTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly snippet?: SnippetTemplate,
    public readonly category?: string,
  ) {
    super(label, collapsibleState);

    if (snippet) {
      // This is a snippet item (leaf node)
      this.tooltip = snippet.description;
      this.description = snippet.description;
      this.contextValue = 'snippet';
      this.iconPath = new vscode.ThemeIcon('code');
      this.command = {
        command: 'razorpay.insertSnippet',
        title: 'Insert Snippet',
        arguments: [snippet.id],
      };
    } else {
      // This is a category (folder node)
      this.contextValue = 'category';
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }
}

export class SnippetTreeProvider implements vscode.TreeDataProvider<SnippetTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SnippetTreeItem | undefined | null | void> =
    new vscode.EventEmitter<SnippetTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SnippetTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private currentLanguage: string = 'typescript';

  constructor(private snippetGenerator: SnippetGenerator) {
    // Listen for active editor changes to update snippets
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        const newLang = this.normalizeLanguage(editor.document.languageId);
        if (newLang !== this.currentLanguage) {
          this.currentLanguage = newLang;
          this.refresh();
        }
      }
    });

    // Set initial language from active editor
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      this.currentLanguage = this.normalizeLanguage(editor.document.languageId);
    }
  }

  private normalizeLanguage(languageId: string): string {
    const languageMap: Record<string, string> = {
      javascript: 'javascript',
      javascriptreact: 'javascript',
      typescript: 'typescript',
      typescriptreact: 'typescript',
      python: 'python',
      java: 'java',
      go: 'go',
      golang: 'go',
      ruby: 'ruby',
    };
    return languageMap[languageId] || 'typescript';
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SnippetTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SnippetTreeItem): Thenable<SnippetTreeItem[]> {
    if (!element) {
      // Root level - return categories
      return Promise.resolve(this.getCategories());
    } else if (element.category) {
      // Category level - return snippets in this category
      return Promise.resolve(this.getSnippetsForCategory(element.category));
    }
    return Promise.resolve([]);
  }

  private getCategories(): SnippetTreeItem[] {
    const snippets = this.snippetGenerator.getAvailableSnippets(this.currentLanguage);
    const categories = new Set<string>();

    snippets.forEach((s) => categories.add(s.category));

    const categoryLabels: Record<string, string> = {
      setup: 'Setup',
      order: 'Orders',
      payment: 'Payments',
      refund: 'Refunds',
    };

    const categoryOrder = ['setup', 'order', 'payment', 'refund'];

    return categoryOrder
      .filter((cat) => categories.has(cat))
      .map(
        (category) =>
          new SnippetTreeItem(
            categoryLabels[category] || category,
            vscode.TreeItemCollapsibleState.Expanded,
            undefined,
            category,
          ),
      );
  }

  private getSnippetsForCategory(category: string): SnippetTreeItem[] {
    const snippets = this.snippetGenerator.getAvailableSnippets(this.currentLanguage);
    return snippets
      .filter((s) => s.category === category)
      .map(
        (snippet) =>
          new SnippetTreeItem(snippet.name, vscode.TreeItemCollapsibleState.None, snippet),
      );
  }
}

