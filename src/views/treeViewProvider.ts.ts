import * as vscode from 'vscode';

export class RazorpayTreeViewProvider implements vscode.TreeDataProvider<TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): Thenable<TreeItem[]> {
    if (!element) {
      // Root level items
      return Promise.resolve([
        new TreeItem('Assistant', 'assistant', vscode.TreeItemCollapsibleState.None, {
          command: 'razorpay.openAssistant',
          title: 'Open Assistant',
        }, new vscode.ThemeIcon('comment-discussion')),
        new TreeItem('Code Snippets', 'snippets-parent', vscode.TreeItemCollapsibleState.Expanded, undefined, new vscode.ThemeIcon('code')),
        new TreeItem('Trigger Events', 'events-parent', vscode.TreeItemCollapsibleState.Expanded, undefined, new vscode.ThemeIcon('play')),
      ]);
    } else if (element.id === 'snippets-parent') {
      // Code Snippets children
      return Promise.resolve([
        new TreeItem('Create Order', 'snippet-order-create', vscode.TreeItemCollapsibleState.None, {
          command: 'razorpay.insertSnippet',
          title: 'Insert Create Order Snippet',
          arguments: ['order.create'],
        }, new vscode.ThemeIcon('add')),
        new TreeItem('Fetch Order', 'snippet-order-fetch', vscode.TreeItemCollapsibleState.None, {
          command: 'razorpay.insertSnippet',
          title: 'Insert Fetch Order Snippet',
          arguments: ['order.fetch'],
        }, new vscode.ThemeIcon('search')),
        new TreeItem('Capture Payment', 'snippet-payment-capture', vscode.TreeItemCollapsibleState.None, {
          command: 'razorpay.insertSnippet',
          title: 'Insert Capture Payment Snippet',
          arguments: ['payment.capture'],
        }, new vscode.ThemeIcon('credit-card')),
        new TreeItem('Fetch Payment', 'snippet-payment-fetch', vscode.TreeItemCollapsibleState.None, {
          command: 'razorpay.insertSnippet',
          title: 'Insert Fetch Payment Snippet',
          arguments: ['payment.fetch'],
        }, new vscode.ThemeIcon('search')),
        new TreeItem('Create Refund', 'snippet-refund-create', vscode.TreeItemCollapsibleState.None, {
          command: 'razorpay.insertSnippet',
          title: 'Insert Create Refund Snippet',
          arguments: ['refund.create'],
        }, new vscode.ThemeIcon('arrow-left')),
        new TreeItem('Fetch Refund', 'snippet-refund-fetch', vscode.TreeItemCollapsibleState.None, {
          command: 'razorpay.insertSnippet',
          title: 'Insert Fetch Refund Snippet',
          arguments: ['refund.fetch'],
        }, new vscode.ThemeIcon('search')),
      ]);
    } else if (element.id === 'events-parent') {
      // Trigger Events children
      return Promise.resolve([
        new TreeItem('Create Order', 'event-order-create', vscode.TreeItemCollapsibleState.None, {
          command: 'razorpay.openEvents',
          title: 'Open Trigger Events - Create Order',
          arguments: ['order'],
        }, new vscode.ThemeIcon('add')),
        new TreeItem('Create Payment Link', 'event-payment-create', vscode.TreeItemCollapsibleState.None, {
          command: 'razorpay.openEvents',
          title: 'Open Trigger Events - Create Payment Link',
          arguments: ['payment'],
        }, new vscode.ThemeIcon('credit-card')),
      ]);
    }
    return Promise.resolve([]);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

class TreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly id: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly iconPath?: vscode.ThemeIcon,
  ) {
    super(label, collapsibleState);
    this.tooltip = this.label;
    this.description = '';
    if (iconPath) {
      this.iconPath = iconPath;
    }
  }

  contextValue = this.id;
}

