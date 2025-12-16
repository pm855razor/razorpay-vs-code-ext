import * as vscode from 'vscode';

/**
 * Tree view provider for the SDK Integration pane.
 */
export class SDKIntegrationTreeProvider implements vscode.TreeDataProvider<SDKIntegrationTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SDKIntegrationTreeItem | undefined | null | void> = 
    new vscode.EventEmitter<SDKIntegrationTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SDKIntegrationTreeItem | undefined | null | void> = 
    this._onDidChangeTreeData.event;

  getTreeItem(element: SDKIntegrationTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(): Thenable<SDKIntegrationTreeItem[]> {
    return Promise.resolve([
      new SDKIntegrationTreeItem(
        'SDK Integration',
        'open-sdk-integration',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'razorpay.openSDKIntegration',
          title: 'Open SDK Integration',
        },
        new vscode.ThemeIcon('plug')
      ),
    ]);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

class SDKIntegrationTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly id: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly command?: vscode.Command,
    public readonly iconPath?: vscode.ThemeIcon,
  ) {
    super(label, collapsibleState);
    this.tooltip = this.label;
    this.description = 'Detect project type and integrate Razorpay SDK';
    if (iconPath) {
      this.iconPath = iconPath;
    }
  }

  contextValue = this.id;
}

