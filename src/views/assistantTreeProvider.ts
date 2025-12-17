import * as vscode from 'vscode';

/**
 * Tree view provider for the Assistant pane.
 * Shows two AI assistant options: @razorpay and @mcp
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
        '@razorpay',
        'razorpay-agent',
        'AI Docs Assistant - Ask questions about Razorpay integration',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'razorpay.openAssistant',
          title: 'Open Razorpay Assistant',
          arguments: ['razorpay'],
        },
        new vscode.ThemeIcon('hubot')
      ),
      new AssistantTreeItem(
        '@mcp',
        'mcp-agent',
        'API Operations - Create orders, payments, refunds (requires API keys)',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'razorpay.openAssistant',
          title: 'Open MCP Assistant',
          arguments: ['mcp'],
        },
        new vscode.ThemeIcon('zap')
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
    public readonly tooltipText: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly iconPath?: vscode.ThemeIcon,
  ) {
    super(label, collapsibleState);
    this.tooltip = this.tooltipText;
    this.description = this.getDescription();
    if (iconPath) {
      this.iconPath = iconPath;
    }
  }

  private getDescription(): string {
    if (this.id === 'razorpay-agent') {
      return 'AI Docs Assistant';
    } else if (this.id === 'mcp-agent') {
      return 'API Operations';
    }
    return '';
  }

  contextValue = this.id;
}
