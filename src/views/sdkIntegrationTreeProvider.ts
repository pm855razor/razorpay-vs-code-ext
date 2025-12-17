import * as vscode from 'vscode';
import { sdkSnippetTemplates } from '../snippets/sdkTemplates';
import type { SnippetTemplate } from '../types';

/**
 * Tree view provider for the SDK Integration pane.
 * Shows SDK templates organized by category (Frontend/Backend).
 */
export class SDKIntegrationTreeProvider implements vscode.TreeDataProvider<SDKIntegrationTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SDKIntegrationTreeItem | undefined | null | void> = 
    new vscode.EventEmitter<SDKIntegrationTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SDKIntegrationTreeItem | undefined | null | void> = 
    this._onDidChangeTreeData.event;

  getTreeItem(element: SDKIntegrationTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: SDKIntegrationTreeItem): Thenable<SDKIntegrationTreeItem[]> {
    if (!element) {
      // Root level - return categories
      return Promise.resolve(this.getCategories());
    } else if (element.category) {
      // Category level - return templates in this category
      return Promise.resolve(this.getTemplatesForCategory(element.category));
    }
    return Promise.resolve([]);
  }

  private getCategories(): SDKIntegrationTreeItem[] {
    return [
      new SDKIntegrationTreeItem(
        'Frontend Checkout',
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        'frontend',
        new vscode.ThemeIcon('browser'),
      ),
      new SDKIntegrationTreeItem(
        'Backend Server',
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        'backend',
        new vscode.ThemeIcon('server'),
      ),
    ];
  }

  private getTemplatesForCategory(category: string): SDKIntegrationTreeItem[] {
    const templates = sdkSnippetTemplates.filter(t => {
      if (category === 'frontend') {
        return t.id.includes('checkout');
      } else {
        return t.id.includes('server');
      }
    });

    return templates.map(template => 
      new SDKIntegrationTreeItem(
        template.name,
        vscode.TreeItemCollapsibleState.None,
        template,
        undefined,
        new vscode.ThemeIcon(this.getIconForTemplate(template.id)),
      )
    );
  }

  private getIconForTemplate(id: string): string {
    if (id.includes('react') || id.includes('nextjs')) return 'symbol-misc';
    if (id.includes('vue')) return 'symbol-misc';
    if (id.includes('angular')) return 'symbol-misc';
    if (id.includes('html')) return 'file-code';
    if (id.includes('node')) return 'symbol-method';
    if (id.includes('python')) return 'symbol-method';
    if (id.includes('java')) return 'symbol-method';
    if (id.includes('go')) return 'symbol-method';
    if (id.includes('ruby')) return 'symbol-method';
    if (id.includes('php')) return 'symbol-method';
    if (id.includes('android')) return 'device-mobile';
    if (id.includes('ios')) return 'device-mobile';
    if (id.includes('flutter')) return 'device-mobile';
    return 'code';
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

class SDKIntegrationTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly template?: SnippetTemplate,
    public readonly category?: string,
    public readonly iconPath?: vscode.ThemeIcon,
  ) {
    super(label, collapsibleState);

    if (template) {
      // This is a template item (leaf node)
      this.tooltip = template.description;
      this.description = template.description;
      this.contextValue = 'sdkTemplate';
      this.command = {
        command: 'razorpay.insertSDKTemplate',
        title: 'Insert SDK Template',
        arguments: [template.id],
      };
    } else {
      // This is a category (folder node)
      this.contextValue = 'sdkCategory';
    }

    if (iconPath) {
      this.iconPath = iconPath;
    }
  }
}
