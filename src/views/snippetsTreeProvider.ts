import * as vscode from 'vscode';
import { SnippetGenerator } from '../snippets/snippetGenerator';
import type { SnippetTemplate } from '../types';

/**
 * Tree view provider for the Snippets pane.
 */
export class SnippetsTreeProvider implements vscode.TreeDataProvider<SnippetsTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SnippetsTreeItem | undefined | null | void> =
    new vscode.EventEmitter<SnippetsTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SnippetsTreeItem | undefined | null | void> =
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

  getTreeItem(element: SnippetsTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SnippetsTreeItem): Thenable<SnippetsTreeItem[]> {
    if (!element) {
      // Root level - return categories
      return Promise.resolve(this.getCategories());
    } else if (element.category) {
      // Category level - return snippets in this category
      return Promise.resolve(this.getSnippetsForCategory(element.category));
    }
    return Promise.resolve([]);
  }

  private getCategories(): SnippetsTreeItem[] {
    const snippets = this.snippetGenerator.getAvailableSnippets(this.currentLanguage);
    const categories = new Set<string>();

    snippets.forEach((s) => categories.add(s.category));

    const categoryLabels: Record<string, string> = {
      setup: 'Setup',
      order: 'Orders',
      payment: 'Payments',
      refund: 'Refunds',
    };

    const categoryIcons: Record<string, string> = {
      setup: 'gear',
      order: 'package',
      payment: 'credit-card',
      refund: 'arrow-left',
    };

    const categoryOrder = ['setup', 'order', 'payment', 'refund'];

    return categoryOrder
      .filter((cat) => categories.has(cat))
      .map(
        (category) =>
          new SnippetsTreeItem(
            categoryLabels[category] || category,
            vscode.TreeItemCollapsibleState.Expanded,
            undefined,
            category,
            new vscode.ThemeIcon(categoryIcons[category] || 'folder'),
          ),
      );
  }

  private getSnippetsForCategory(category: string): SnippetsTreeItem[] {
    const snippets = this.snippetGenerator.getAvailableSnippets(this.currentLanguage);
    return snippets
      .filter((s) => s.category === category)
      .map(
        (snippet) =>
          new SnippetsTreeItem(
            snippet.name,
            vscode.TreeItemCollapsibleState.None,
            snippet,
            undefined,
            new vscode.ThemeIcon('code'),
          ),
      );
  }
}

class SnippetsTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly snippet?: SnippetTemplate,
    public readonly category?: string,
    public readonly iconPath?: vscode.ThemeIcon,
  ) {
    super(label, collapsibleState);

    if (snippet) {
      // This is a snippet item (leaf node)
      this.tooltip = snippet.description;
      this.description = snippet.description;
      this.contextValue = 'snippet';
      this.command = {
        command: 'razorpay.insertSnippet',
        title: 'Insert Snippet',
        arguments: [snippet.id],
      };
    } else {
      // This is a category (folder node)
      this.contextValue = 'category';
    }

    if (iconPath) {
      this.iconPath = iconPath;
    }
  }
}

