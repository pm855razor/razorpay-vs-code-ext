import * as vscode from 'vscode';
import type { Logger } from '../utils/logger';
import { RazorpayService } from '../services/razorpayService';

export class EventsWebviewProvider {
  private static currentPanel: vscode.WebviewPanel | undefined = undefined;

  constructor(
    private context: vscode.ExtensionContext,
    private logger: Logger,
    private razorpayService: RazorpayService,
  ) {}

  public show(section?: string): void {
    if (EventsWebviewProvider.currentPanel) {
      // If panel exists, update it with new section
      EventsWebviewProvider.currentPanel.webview.html = this.getWebviewContent(EventsWebviewProvider.currentPanel.webview, section);
      EventsWebviewProvider.currentPanel.reveal();
      this.handleCheckConfig(EventsWebviewProvider.currentPanel.webview);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'razorpayEvents',
      section === 'order' ? 'Create Order' : section === 'payment' ? 'Create Payment Link' : 'Razorpay Trigger Events',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    panel.webview.html = this.getWebviewContent(panel.webview, section);

    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'createOrder':
            await this.handleCreateOrder(panel.webview, message.data);
            break;
          case 'createPayment':
            await this.handleCreatePayment(panel.webview, message.data);
            break;
          case 'checkConfig':
            this.handleCheckConfig(panel.webview);
            break;
          case 'copyToClipboard':
            await vscode.env.clipboard.writeText(message.text);
            vscode.window.showInformationMessage(`Copied to clipboard: ${message.text}`);
            break;
        }
      },
      null,
      this.context.subscriptions,
    );

    panel.onDidDispose(
      () => {
        EventsWebviewProvider.currentPanel = undefined;
      },
      null,
      this.context.subscriptions,
    );

    EventsWebviewProvider.currentPanel = panel;
    
    this.handleCheckConfig(panel.webview);
  }

  private handleCheckConfig(webview: vscode.Webview): void {
    const config = vscode.workspace.getConfiguration('razorpay');
    const keyId = config.get<string>('keyId', '');
    const keySecret = config.get<string>('keySecret', '');

    const isConfigured = !!(keyId && keySecret);

    if (isConfigured && !this.razorpayService.isInitialized()) {
      this.razorpayService.initialize({ keyId, keySecret });
    }

    webview.postMessage({
      command: 'configStatus',
      configured: isConfigured,
      initialized: this.razorpayService.isInitialized(),
    });
  }

  private async handleCreateOrder(webview: vscode.Webview, data: any): Promise<void> {
    try {
      if (!this.razorpayService.isInitialized()) {
        const config = vscode.workspace.getConfiguration('razorpay');
        const keyId = config.get<string>('keyId', '');
        const keySecret = config.get<string>('keySecret', '');

        if (!keyId || !keySecret) {
          webview.postMessage({
            command: 'orderResult',
            success: false,
            error: 'Razorpay credentials not configured. Please set razorpay.keyId and razorpay.keySecret in VS Code settings.',
          });
          return;
        }

        this.razorpayService.initialize({ keyId, keySecret });
      }

      const order = await this.razorpayService.createOrder({
        amount: parseFloat(data.amount),
        currency: data.currency,
        receipt: data.receipt || undefined,
        notes: data.notes || undefined,
      });

      webview.postMessage({
        command: 'orderResult',
        success: true,
        order: {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          receipt: order.receipt,
          created_at: order.created_at,
        },
      });

      // Copy order ID to clipboard
      await vscode.env.clipboard.writeText(order.id);
      vscode.window.showInformationMessage(`Order created! Order ID: ${order.id} (copied to clipboard)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error('Failed to create order', error as Error);

      webview.postMessage({
        command: 'orderResult',
        success: false,
        error: errorMessage,
      });
    }
  }

  private async handleCreatePayment(webview: vscode.Webview, data: any): Promise<void> {
    try {
      if (!this.razorpayService.isInitialized()) {
        const config = vscode.workspace.getConfiguration('razorpay');
        const keyId = config.get<string>('keyId', '');
        const keySecret = config.get<string>('keySecret', '');

        if (!keyId || !keySecret) {
          webview.postMessage({
            command: 'paymentResult',
            success: false,
            error: 'Razorpay credentials not configured. Please set razorpay.keyId and razorpay.keySecret in VS Code settings.',
          });
          return;
        }

        this.razorpayService.initialize({ keyId, keySecret });
      }

      const paymentLink = await this.razorpayService.createPayment({
        amount: parseFloat(data.amount),
        currency: data.currency,
        order_id: data.order_id,
        description: data.description || undefined,
        customer: data.customer || undefined,
        notes: data.notes || undefined,
      });

      webview.postMessage({
        command: 'paymentResult',
        success: true,
        payment: {
          id: paymentLink.id,
          short_url: paymentLink.short_url,
          amount: paymentLink.amount,
          currency: paymentLink.currency,
          status: paymentLink.status,
          order_id: paymentLink.order_id,
          created_at: paymentLink.created_at,
        },
      });

      // Copy payment link ID to clipboard
      await vscode.env.clipboard.writeText(paymentLink.id);
      vscode.window.showInformationMessage(`Payment link created! Link ID: ${paymentLink.id} (copied to clipboard). Use the checkout URL to complete payment.`);
    } catch (error: any) {
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.error?.description) {
        errorMessage = error.error.description;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      this.logger.error(`Failed to create payment: ${errorMessage}`, error as Error);

      webview.postMessage({
        command: 'paymentResult',
        success: false,
        error: errorMessage,
      });
    }
  }

  private getWebviewContent(_webview: vscode.Webview, section?: string): string {
    // If a specific section is selected, show only that functionality
    if (section === 'order') {
      return this.getOrderContent();
    } else if (section === 'payment') {
      return this.getPaymentContent();
    }
    // Otherwise show the full tree view
    return this.getFullContent();
  }

  private getOrderContent(): string {
    const orderForm = '<form id="orderForm">' +
      '<div class="form-group">' +
        '<label for="amount">Amount *</label>' +
        '<input type="number" id="amount" name="amount" step="0.01" min="0.01" required placeholder="100.00" />' +
        '<div class="info-text">Amount in your currency (e.g., 100.00 for ₹100)</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="currency">Currency *</label>' +
        '<select id="currency" name="currency" required>' +
          '<option value="INR">INR (Indian Rupee)</option>' +
          '<option value="USD">USD (US Dollar)</option>' +
          '<option value="EUR">EUR (Euro)</option>' +
          '<option value="GBP">GBP (British Pound)</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="receipt">Receipt ID (Optional)</label>' +
        '<input type="text" id="receipt" name="receipt" placeholder="receipt_001" />' +
        '<div class="info-text">Unique receipt identifier for your records</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="notes">Notes (Optional)</label>' +
        '<textarea id="notes" name="notes" placeholder=\'{"key1": "value1", "key2": "value2"}\'></textarea>' +
        '<div class="info-text">JSON object with additional notes (optional)</div>' +
      '</div>' +
      '<button type="submit" id="createButton">Create Order</button>' +
    '</form>' +
    '<div id="result"></div>';
    
    return this.getBaseHTML('Create Order', 'Create a new order for Razorpay checkout', orderForm, 'order');
  }

  private getPaymentContent(): string {
    const paymentForm = '<form id="paymentForm">' +
      '<div class="form-group">' +
        '<label for="paymentAmount">Amount *</label>' +
        '<input type="number" id="paymentAmount" name="paymentAmount" step="0.01" min="0.01" required placeholder="100.00" />' +
        '<div class="info-text">Amount in your currency (e.g., 100.00 for ₹100)</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="paymentCurrency">Currency *</label>' +
        '<select id="paymentCurrency" name="paymentCurrency" required>' +
          '<option value="INR">INR (Indian Rupee)</option>' +
          '<option value="USD">USD (US Dollar)</option>' +
          '<option value="EUR">EUR (Euro)</option>' +
          '<option value="GBP">GBP (British Pound)</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="orderId">Order ID *</label>' +
        '<input type="text" id="orderId" name="orderId" required placeholder="order_xxxxxxxxxxxxx" />' +
        '<div class="info-text">The order ID for which this payment is being created</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="paymentDescription">Description (Optional)</label>' +
        '<input type="text" id="paymentDescription" name="paymentDescription" placeholder="Payment for order" />' +
        '<div class="info-text">Description for the payment link</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="paymentNotes">Notes (Optional)</label>' +
        '<textarea id="paymentNotes" name="paymentNotes" placeholder=\'{"key1": "value1", "key2": "value2"}\'></textarea>' +
        '<div class="info-text">JSON object with additional notes (optional)</div>' +
      '</div>' +
      '<button type="submit" id="createPaymentButton">Create Payment Link</button>' +
    '</form>' +
    '<div id="paymentResult"></div>';
    
    return this.getBaseHTML('Create Payment Link', 'Create a payment link for checkout. Use this link to complete payment and get the payment_id.', paymentForm, 'payment');
  }

  private getBaseHTML(title: string, description: string, content: string, formType: 'order' | 'payment'): string {
    const scriptContent = formType === 'order' ? this.getOrderScript() : this.getPaymentScript();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 10px;
        }
        .description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 20px;
            font-size: 14px;
        }
        .config-warning {
            padding: 15px;
            background-color: var(--vscode-inputValidation-warningBackground);
            border-left: 3px solid var(--vscode-inputValidation-warningBorder);
            border-radius: 4px;
            margin-bottom: 20px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        input, select, textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            box-sizing: border-box;
        }
        textarea {
            min-height: 80px;
            font-family: var(--vscode-editor-font-family);
        }
        button {
            padding: 12px 24px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 4px;
        }
        .result.success {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 3px solid #4caf50;
        }
        .result.error {
            background-color: var(--vscode-inputValidation-errorBackground);
            border-left: 3px solid var(--vscode-inputValidation-errorBorder);
        }
        .order-id, .payment-id {
            font-family: var(--vscode-editor-font-family);
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            word-break: break-all;
        }
        .copy-button {
            margin-top: 10px;
            padding: 8px 16px;
            font-size: 12px;
        }
        .info-text {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
        a.payment-link {
            color: var(--vscode-textLink-foreground);
            text-decoration: underline;
            word-break: break-all;
            display: inline-block;
            margin-top: 5px;
        }
        a.payment-link:hover {
            color: var(--vscode-textLink-activeForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${title}</h1>
        <p class="description">${description}</p>
        
        <div class="config-warning" id="configWarning" style="display: none;">
            ⚠️ Razorpay credentials not configured. Please set <code>razorpay.keyId</code> and <code>razorpay.keySecret</code> in VS Code settings (Code → Settings → Settings → search "razorpay").
        </div>

        ${content}
    </div>

    <script>
        ${scriptContent}
    </script>
</body>
</html>`;
  }

  private getOrderScript(): string {
    return `
        const vscode = acquireVsCodeApi();
        const form = document.getElementById('orderForm');
        const resultDiv = document.getElementById('result');
        const configWarning = document.getElementById('configWarning');
        const createButton = document.getElementById('createButton');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const amount = document.getElementById('amount').value;
            const currency = document.getElementById('currency').value;
            const receipt = document.getElementById('receipt').value;
            const notesText = document.getElementById('notes').value;

            let notes = null;
            if (notesText.trim()) {
                try {
                    notes = JSON.parse(notesText);
                } catch (err) {
                    showResult(false, 'Invalid JSON in notes field');
                    return;
                }
            }

            createButton.disabled = true;
            createButton.textContent = 'Creating Order...';

            vscode.postMessage({
                command: 'createOrder',
                data: {
                    amount,
                    currency,
                    receipt: receipt || undefined,
                    notes: notes || undefined,
                }
            });
        });

        function showResult(success, data) {
            createButton.disabled = false;
            createButton.textContent = 'Create Order';

            if (success) {
                const createdDate = new Date(data.created_at * 1000).toLocaleString();
                resultDiv.innerHTML = 
                    '<div class="result success">' +
                        '<h3>Order Created Successfully!</h3>' +
                        '<p><strong>Order ID:</strong></p>' +
                        '<div class="order-id" id="orderId">' + data.id + '</div>' +
                        '<button class="copy-button" onclick="copyOrderId(\\'' + data.id + '\\')">Copy Order ID</button>' +
                        '<p style="margin-top: 15px;"><strong>Details:</strong></p>' +
                        '<ul style="margin-top: 10px;">' +
                            '<li>Amount: ' + (data.amount / 100) + ' ' + data.currency + '</li>' +
                            '<li>Status: ' + data.status + '</li>' +
                            '<li>Receipt: ' + (data.receipt || 'N/A') + '</li>' +
                            '<li>Created: ' + createdDate + '</li>' +
                        '</ul>' +
                        '<p style="margin-top: 15px; font-size: 13px;">' +
                             'Use this Order ID to test Razorpay checkout in your frontend without backend dependencies!' +
                        '</p>' +
                    '</div>';
            } else {
                resultDiv.innerHTML = 
                    '<div class="result error">' +
                        '<h3>Failed to Create Order</h3>' +
                        '<p>' + data + '</p>' +
                    '</div>';
            }
        }

        function copyOrderId(orderId) {
            vscode.postMessage({
                command: 'copyToClipboard',
                text: orderId
            });
        }

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'configStatus') {
                if (!message.configured || !message.initialized) {
                    configWarning.style.display = 'block';
                    createButton.disabled = true;
                } else {
                    configWarning.style.display = 'none';
                    createButton.disabled = false;
                }
            } else if (message.command === 'orderResult') {
                if (message.success) {
                    showResult(true, message.order);
                } else {
                    showResult(false, message.error);
                }
            }
        });

        vscode.postMessage({
            command: 'checkConfig'
        });
    `;
  }

  private getPaymentScript(): string {
    return `
        const vscode = acquireVsCodeApi();
        const paymentForm = document.getElementById('paymentForm');
        const paymentResultDiv = document.getElementById('paymentResult');
        const configWarning = document.getElementById('configWarning');
        const createPaymentButton = document.getElementById('createPaymentButton');

        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const amount = document.getElementById('paymentAmount').value;
            const currency = document.getElementById('paymentCurrency').value;
            const orderId = document.getElementById('orderId').value;
            const description = document.getElementById('paymentDescription').value;
            const notesText = document.getElementById('paymentNotes').value;

            let notes = null;
            if (notesText.trim()) {
                try {
                    notes = JSON.parse(notesText);
                } catch (err) {
                    showPaymentResult(false, 'Invalid JSON in notes field');
                    return;
                }
            }

            createPaymentButton.disabled = true;
            createPaymentButton.textContent = 'Creating Payment Link...';

            vscode.postMessage({
                command: 'createPayment',
                data: {
                    amount,
                    currency,
                    order_id: orderId,
                    description: description || undefined,
                    notes: notes || undefined,
                }
            });
        });

        function showPaymentResult(success, data) {
            createPaymentButton.disabled = false;
            createPaymentButton.textContent = 'Create Payment Link';

            if (success) {
                const createdDate = new Date(data.created_at * 1000).toLocaleString();
                paymentResultDiv.innerHTML = 
                    '<div class="result success">' +
                        '<h3>Payment Link Created Successfully!</h3>' +
                        '<p><strong>Payment Link ID:</strong></p>' +
                        '<div class="payment-id" id="paymentId">' + data.id + '</div>' +
                        '<button class="copy-button" onclick="copyPaymentId(\\'' + data.id + '\\')">Copy Link ID</button>' +
                        '<p style="margin-top: 15px;"><strong>Checkout URL:</strong></p>' +
                        '<div style="margin-bottom: 10px;">' +
                            '<a href="' + data.short_url + '" target="_blank" class="payment-link" style="font-family: var(--vscode-editor-font-family); background-color: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 4px; display: block; word-break: break-all;">' + data.short_url + '</a>' +
                        '</div>' +
                        '<button class="copy-button" onclick="copyPaymentUrl(\\'' + data.short_url + '\\')">Copy Checkout URL</button>' +
                        '<p style="margin-top: 15px;"><strong>Details:</strong></p>' +
                        '<ul style="margin-top: 10px;">' +
                            '<li>Amount: ' + (data.amount / 100) + ' ' + data.currency + '</li>' +
                            '<li>Status: ' + data.status + '</li>' +
                            '<li>Order ID: ' + data.order_id + '</li>' +
                            '<li>Created: ' + createdDate + '</li>' +
                        '</ul>' +
                        '<p style="margin-top: 15px; font-size: 13px;">' +
                             'Use the checkout URL above to complete payment. After payment completion, you\\'ll receive the payment_id in the webhook/callback.' +
                        '</p>' +
                    '</div>';
            } else {
                paymentResultDiv.innerHTML = 
                    '<div class="result error">' +
                        '<h3>Failed to Create Payment Link</h3>' +
                        '<p>' + data + '</p>' +
                    '</div>';
            }
        }

        function copyPaymentId(paymentId) {
            vscode.postMessage({
                command: 'copyToClipboard',
                text: paymentId
            });
        }

        function copyPaymentUrl(paymentUrl) {
            vscode.postMessage({
                command: 'copyToClipboard',
                text: paymentUrl
            });
        }

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'configStatus') {
                if (!message.configured || !message.initialized) {
                    configWarning.style.display = 'block';
                    createPaymentButton.disabled = true;
                } else {
                    configWarning.style.display = 'none';
                    createPaymentButton.disabled = false;
                }
            } else if (message.command === 'paymentResult') {
                if (message.success) {
                    showPaymentResult(true, message.payment);
                } else {
                    showPaymentResult(false, message.error);
                }
            }
        });

        vscode.postMessage({
            command: 'checkConfig'
        });
    `;
  }

  private getFullContent(): string {
    // Return the full tree view content (existing implementation)
    // This is kept for backward compatibility if needed
    return this.getBaseHTML('Razorpay Trigger Events', 'Create test orders and payments for Razorpay checkout without backend dependencies.', 
      '<div class="tree-container">' +
        '<div class="tree-item">' +
          '<div class="tree-header" onclick="toggleTreeItem(\'orders\')">' +
            '<span class="tree-icon" id="orders-icon">▼</span>' +
            '<strong>Orders</strong>' +
          '</div>' +
          '<div class="tree-content expanded" id="orders-content">' +
            '<div class="tree-leaf">' +
              '<div class="tree-leaf-title">Create Order</div>' +
              '<div class="tree-leaf-description">Create a new order for Razorpay checkout</div>' +
              '<form id="orderForm">...</form>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>', 'order');
  }
}

