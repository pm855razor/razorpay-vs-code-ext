import * as vscode from 'vscode';

/**
 * Tree view provider for the Assistant pane.
 */
export class AssistantTreeProvider implements vscode.TreeDataProvider<AssistantTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<AssistantTreeItem | undefined | null | void> = 
    new vscode.EventEmitter<AssistantTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<AssistantTreeItem | undefined | null | void> = 
    this._onDidChangeTreeData.event;

  getTreeItem(element: AssistantTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<AssistantTreeItem[]> {
    return Promise.resolve([
      new AssistantTreeItem(
        'Open AI Assistant',
        'open-assistant',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'razorpay.openAssistant',
          title: 'Open AI Assistant',
        },
        new vscode.ThemeIcon('comment-discussion')
      ),
    ]);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

class AssistantTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly id: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly iconPath?: vscode.ThemeIcon,
  ) {
    super(label, collapsibleState);
    this.tooltip = this.label;
    this.description = 'Chat with AI about Razorpay integration';
    if (iconPath) {
      this.iconPath = iconPath;
    }
  }

  contextValue = this.id;
}

