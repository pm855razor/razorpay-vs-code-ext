import * as vscode from 'vscode';

/**
 * Tree view provider for the Events pane.
 */
export class EventsTreeProvider implements vscode.TreeDataProvider<EventsTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<EventsTreeItem | undefined | null | void> = 
    new vscode.EventEmitter<EventsTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<EventsTreeItem | undefined | null | void> = 
    this._onDidChangeTreeData.event;

  getTreeItem(element: EventsTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: EventsTreeItem): Thenable<EventsTreeItem[]> {
    if (!element) {
      // Root level items
      return Promise.resolve([
        new EventsTreeItem(
          'Orders',
          'events-orders',
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          new vscode.ThemeIcon('package')
        ),
        new EventsTreeItem(
          'Payments',
          'events-payments',
          vscode.TreeItemCollapsibleState.Expanded,
          undefined,
          new vscode.ThemeIcon('credit-card')
        ),
      ]);
    } else if (element.id === 'events-orders') {
      return Promise.resolve([
        new EventsTreeItem(
          'Create Order',
          'event-order-create',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'razorpay.openEvents',
            title: 'Create Order',
            arguments: ['order'],
          },
          new vscode.ThemeIcon('add')
        ),
      ]);
    } else if (element.id === 'events-payments') {
      return Promise.resolve([
        new EventsTreeItem(
          'Create Payment Link',
          'event-payment-link',
          vscode.TreeItemCollapsibleState.None,
          {
            command: 'razorpay.openEvents',
            title: 'Create Payment Link',
            arguments: ['payment'],
          },
          new vscode.ThemeIcon('link')
        ),
      ]);
    }
    return Promise.resolve([]);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }
}

class EventsTreeItem extends vscode.TreeItem {
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

