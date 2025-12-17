import * as vscode from 'vscode';
import * as https from 'https';
import type { Logger } from '../utils/logger';

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: {
    tools?: Array<{ name: string; description: string }>;
    content?: Array<{ type: string; text: string }>;
    [key: string]: unknown;
  };
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Sidebar Chat View Provider for Razorpay MCP Tools
 * Opens in the sidebar panel for direct API operations
 */
export class MCPChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'razorpayMCPChat';

  private _view?: vscode.WebviewView;
  private mcpRequestId = 0;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly logger: Logger
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'executeCommand':
          await this.handleCommand(message.text);
          break;
      }
    });
  }

  private async handleCommand(command: string): Promise<void> {
    if (!this._view) return;

    this.logger.info(`MCP command: ${command}`);

    this._view.webview.postMessage({
      command: 'response',
      text: 'Executing...',
      isLoading: true
    });

    try {
      const config = vscode.workspace.getConfiguration('razorpay');
      const keyId = config.get<string>('keyId');
      const keySecret = config.get<string>('keySecret');

      if (!keyId || !keySecret) {
        this._view.webview.postMessage({
          command: 'response',
          text: this.getCredentialsMessage(),
          isLoading: false
        });
        return;
      }

      const toolRequest = this.parseCommand(command);
      let result: string;

      if (toolRequest.action === 'list_tools') {
        result = await this.listMCPTools(keyId, keySecret);
      } else if (toolRequest.action === 'need_input') {
        result = `Missing: **${toolRequest.params.missing}**\n\nExample: "${toolRequest.example}"`;
      } else {
        result = await this.executeMCPTool(keyId, keySecret, toolRequest.tool, toolRequest.params);
      }

      this._view.webview.postMessage({
        command: 'response',
        text: result,
        isLoading: false
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('MCP error', error as Error);
      
      this._view.webview.postMessage({
        command: 'response',
        text: `Error: ${errorMessage}`,
        isLoading: false
      });
    }
  }

  private getCredentialsMessage(): string {
    return `**API credentials required**

Configure in Settings > Razorpay:
- razorpay.keyId
- razorpay.keySecret

Get keys from [Razorpay Dashboard](https://dashboard.razorpay.com)`;
  }

  private parseCommand(command: string): { action: string; tool: string; params: Record<string, unknown>; example?: string } {
    const lower = command.toLowerCase();

    if (lower.includes('help') || lower.includes('list tools') || lower.includes('available')) {
      return { action: 'list_tools', tool: '', params: {} };
    }

    // Create order
    if (lower.includes('create') && lower.includes('order')) {
      const amountMatch = command.match(/(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[1]) * 100 : 50000;
      return { action: 'call_tool', tool: 'create_order', params: { amount, currency: 'INR' } };
    }

    // Fetch order
    if (command.match(/order_\w+/i) && (lower.includes('fetch') || lower.includes('get') || lower.includes('status'))) {
      const orderId = command.match(/order_\w+/i)?.[0];
      return { action: 'call_tool', tool: 'fetch_order', params: { order_id: orderId } };
    }

    // List orders
    if (lower.includes('list') && lower.includes('order')) {
      return { action: 'call_tool', tool: 'fetch_all_orders', params: { count: 10 } };
    }

    // List payments
    if (lower.includes('list') && lower.includes('payment')) {
      return { action: 'call_tool', tool: 'fetch_all_payments', params: { count: 10 } };
    }

    // Fetch payment
    if (command.match(/pay_\w+/i)) {
      const paymentId = command.match(/pay_\w+/i)?.[0];
      return { action: 'call_tool', tool: 'fetch_payment', params: { payment_id: paymentId } };
    }

    // Create payment link
    if (lower.includes('payment link') || lower.includes('create link')) {
      const amountMatch = command.match(/(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[1]) * 100 : 50000;
      return { action: 'call_tool', tool: 'create_payment_link', params: { amount, currency: 'INR', description: 'Payment Link' } };
    }

    // List refunds
    if (lower.includes('refund')) {
      return { action: 'call_tool', tool: 'fetch_all_refunds', params: { count: 10 } };
    }

    // List settlements
    if (lower.includes('settlement')) {
      return { action: 'call_tool', tool: 'fetch_all_settlements', params: { count: 10 } };
    }

    return { action: 'list_tools', tool: '', params: {} };
  }

  private createMerchantToken(keyId: string, keySecret: string): string {
    return Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  }

  private async mcpRequest(keyId: string, keySecret: string, method: string, params: Record<string, unknown> = {}): Promise<MCPResponse> {
    const merchantToken = this.createMerchantToken(keyId, keySecret);
    const requestBody = JSON.stringify({
      jsonrpc: '2.0',
      id: ++this.mcpRequestId,
      method: method,
      params: params
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'mcp.razorpay.com',
        port: 443,
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${merchantToken}`,
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const lines = data.split('\n').filter(line => line.trim());
            for (const line of lines) {
              try {
                const response = JSON.parse(line);
                if (response.jsonrpc) {
                  resolve(response);
                  return;
                }
              } catch { /* continue */ }
            }
            resolve(JSON.parse(data));
          } catch {
            reject(new Error(`Invalid MCP response: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (error) => reject(new Error(`MCP connection failed: ${error.message}`)));
      req.setTimeout(30000, () => { req.destroy(); reject(new Error('MCP request timed out')); });
      req.write(requestBody);
      req.end();
    });
  }

  private async listMCPTools(keyId: string, keySecret: string): Promise<string> {
    try {
      const response = await this.mcpRequest(keyId, keySecret, 'tools/list', {});
      if (response.error) throw new Error(response.error.message);

      return `**Available MCP Tools**

**Orders**
- create order for [amount]
- fetch order order_XXXXX
- list orders

**Payments**
- list payments
- fetch payment pay_XXXXX

**Payment Links**
- create payment link for [amount]

**Refunds**
- list refunds

**Settlements**
- list settlements

Type a command to execute it.`;
    } catch {
      return this.getStaticToolsList();
    }
  }

  private getStaticToolsList(): string {
    return `**MCP Tools**

- create order for 500
- list orders
- fetch order order_XXXXX
- list payments
- create payment link for 1000
- list refunds
- list settlements`;
  }

  private async executeMCPTool(keyId: string, keySecret: string, toolName: string, params: Record<string, unknown>): Promise<string> {
    this.logger.info(`Executing: ${toolName}`);
    
    const response = await this.mcpRequest(keyId, keySecret, 'tools/call', { name: toolName, arguments: params });
    
    if (response.error) {
      return `**Error:** ${response.error.message}`;
    }

    if (response.result?.content) {
      const textContent = response.result.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n');
      
      try {
        const parsed = JSON.parse(textContent);
        return this.formatResult(parsed);
      } catch {
        return textContent;
      }
    }

    return this.formatResult(response.result);
  }

  private formatResult(result: unknown): string {
    if (!result || typeof result !== 'object') {
      return '```json\n' + JSON.stringify(result, null, 2) + '\n```';
    }

    const data = result as Record<string, unknown>;

    // Payment link
    if (data.id && String(data.id).startsWith('plink_') && data.short_url) {
      const amount = typeof data.amount === 'number' ? data.amount / 100 : 0;
      return `**Payment Link Created**

Amount: Rs ${amount}
Link: ${data.short_url}
ID: \`${data.id}\`
Status: ${data.status}`;
    }

    // Order or payment
    if (data.entity === 'order' || data.entity === 'payment') {
      const amount = typeof data.amount === 'number' ? data.amount / 100 : 0;
      return `**${data.entity === 'order' ? 'Order' : 'Payment'}**

ID: \`${data.id}\`
Amount: Rs ${amount}
Status: **${data.status}**`;
    }

    // Collection
    if (data.entity === 'collection' && Array.isArray(data.items)) {
      const items = data.items as Array<Record<string, unknown>>;
      let result = `**Found ${data.count || items.length} items**\n\n`;
      
      for (const item of items.slice(0, 5)) {
        const amount = typeof item.amount === 'number' ? `Rs ${item.amount / 100}` : '-';
        result += `- \`${item.id}\` | ${amount} | ${item.status}\n`;
      }
      
      if (items.length > 5) result += `\n... and ${items.length - 5} more`;
      return result;
    }

    return '```json\n' + JSON.stringify(result, null, 2) + '\n```';
  }

  private _getHtmlContent(_webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Tools</title>
    <style>
        :root {
            --rzp-blue: #528FF0;
            --rzp-purple: #7C3AED;
            --rzp-green: #10B981;
            --rzp-orange: #F59E0B;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            color: var(--vscode-foreground);
            background: linear-gradient(180deg, var(--vscode-sideBar-background) 0%, var(--vscode-editor-background) 100%);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            padding: 16px;
            background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%);
            color: white;
        }
        .header h3 { 
            font-size: 14px; 
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .header p { font-size: 11px; opacity: 0.9; margin-top: 4px; }
        .output {
            flex: 1;
            overflow-y: auto;
            padding: 14px;
        }
        .message {
            margin-bottom: 12px;
            padding: 12px 14px;
            border-radius: 10px;
            font-size: 12px;
            line-height: 1.6;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(6px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .command { 
            background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%);
            color: white;
            margin-left: 20%;
            border-bottom-right-radius: 4px;
            box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
        }
        .result { 
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            margin-right: 5%;
            border-bottom-left-radius: 4px;
        }
        .result.loading { opacity: 0.7; }
        .input-container {
            padding: 14px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        .input-wrapper { display: flex; gap: 8px; }
        input {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 8px;
            font-size: 12px;
            transition: all 0.2s;
        }
        input:focus { 
            border-color: #7C3AED; 
            outline: none;
            box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
        }
        button {
            padding: 10px 16px;
            background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.15s;
        }
        button:hover { 
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4);
        }
        button:disabled { opacity: 0.5; transform: none; }
        pre { 
            background: #1e1e2e; 
            padding: 12px; 
            border-radius: 8px; 
            overflow-x: auto; 
            font-size: 11px;
            border: 1px solid var(--vscode-panel-border);
        }
        code { 
            font-family: 'Fira Code', 'SF Mono', Consolas, monospace;
            background: rgba(124, 58, 237, 0.1);
            color: #A78BFA;
            padding: 2px 6px; 
            border-radius: 4px;
            font-size: 11px;
        }
        pre code { background: none; color: inherit; padding: 0; }
        .quick-actions { 
            padding: 10px 14px; 
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .quick-btn {
            display: inline-block;
            padding: 6px 12px;
            background: rgba(124, 58, 237, 0.15);
            color: #A78BFA;
            border-radius: 6px;
            font-size: 11px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
            border: 1px solid transparent;
        }
        .quick-btn:hover { 
            background: rgba(124, 58, 237, 0.25);
            border-color: #7C3AED;
        }
        strong { color: var(--vscode-foreground); }
        a { color: #A78BFA; text-decoration: none; }
        a:hover { text-decoration: underline; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(124, 58, 237, 0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(124, 58, 237, 0.5); }
    </style>
</head>
<body>
    <div class="header">
        <h3>MCP Tools</h3>
    </div>
    
    <div class="quick-actions">
        <span class="quick-btn" onclick="run('help')">Help</span>
        <span class="quick-btn" onclick="run('list orders')">Orders</span>
        <span class="quick-btn" onclick="run('list payments')">Payments</span>
        <span class="quick-btn" onclick="run('create order for 500')"> New Order</span>
    </div>
    
    <div class="output" id="output"></div>
    
    <div class="input-container">
        <div class="input-wrapper">
            <input type="text" id="cmdInput" placeholder="e.g., create order for 500" />
            <button onclick="send()" id="sendBtn">Run</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const output = document.getElementById('output');
        const cmdInput = document.getElementById('cmdInput');
        const sendBtn = document.getElementById('sendBtn');
        let loading = false;

        function run(cmd) {
            cmdInput.value = cmd;
            send();
        }

        function send() {
            const cmd = cmdInput.value.trim();
            if (!cmd || loading) return;

            addMsg(cmd, 'command');
            cmdInput.value = '';
            loading = true;
            sendBtn.disabled = true;

            vscode.postMessage({ command: 'executeCommand', text: cmd });
        }

        function addMsg(text, type, replace = false) {
            if (replace) {
                const last = output.querySelector('.result:last-child');
                if (last) { last.innerHTML = format(text); last.classList.remove('loading'); return; }
            }
            const div = document.createElement('div');
            div.className = 'message ' + (type === 'command' ? 'command' : 'result');
            div.innerHTML = type === 'command' ? '> ' + text : format(text);
            output.appendChild(div);
            output.scrollTop = output.scrollHeight;
        }

        function format(text) {
            return text
                .replace(/\`\`\`(\\w+)?\\n([\\s\\S]*?)\`\`\`/g, '<pre>$2</pre>')
                .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\n/g, '<br>');
        }

        cmdInput.addEventListener('keypress', e => { if (e.key === 'Enter') send(); });

        window.addEventListener('message', e => {
            if (e.data.command === 'response') {
                if (e.data.isLoading) {
                    addMsg(e.data.text, 'result');
                    output.querySelector('.result:last-child')?.classList.add('loading');
                } else {
                    addMsg(e.data.text, 'result', true);
                    loading = false;
                    sendBtn.disabled = false;
                }
            }
        });
    </script>
</body>
</html>`;
  }
}
