import * as vscode from 'vscode';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import * as https from 'https';
import type { Logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LLMType = ChatOpenAI | ChatGoogleGenerativeAI | any;

interface SmartronHistoryItem {
  question: string;
  answer: string;
}

interface SmartronResponse {
  answer?: string;
  sources?: Array<{
    title?: string;
    url?: string;
  }>;
  error?: string;
}

interface MCPTool {
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: string;
  id: number;
  result?: {
    tools?: MCPTool[];
    content?: Array<{ type: string; text: string }>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  error?: {
    code: number;
    message: string;
  };
}

export class AssistantWebviewProvider {
  // Separate panels for each agent
  private static razorpayPanel: vscode.WebviewPanel | undefined = undefined;
  private static mcpPanel: vscode.WebviewPanel | undefined = undefined;
  private mcpRequestId = 0;
  private smartronHistory: SmartronHistoryItem[] = [];

  constructor(private context: vscode.ExtensionContext, private logger: Logger) { }

  public show(agent?: string): void {
    const selectedAgent = agent || 'razorpay';

    if (selectedAgent === 'mcp') {
      this.showMCPPanel();
    } else {
      this.showRazorpayPanel();
    }
  }

  private showRazorpayPanel(): void {
    if (AssistantWebviewProvider.razorpayPanel) {
      AssistantWebviewProvider.razorpayPanel.reveal(vscode.ViewColumn.Two);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'razorpayAI',
      '🤖 Razorpay AI',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri],
      },
    );

    panel.webview.html = this.getRazorpayChatContent(panel.webview);

    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === 'askQuestion') {
          await this.handleQuestion(message.text, 'razorpay', panel);
        }
      },
      null,
      this.context.subscriptions,
    );

    panel.onDidDispose(() => {
      AssistantWebviewProvider.razorpayPanel = undefined;
    });

    AssistantWebviewProvider.razorpayPanel = panel;
  }

  private showMCPPanel(): void {
    if (AssistantWebviewProvider.mcpPanel) {
      AssistantWebviewProvider.mcpPanel.reveal(vscode.ViewColumn.Two);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'razorpayMCP',
      '⚡ Razorpay MCP',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.context.extensionUri],
      },
    );

    panel.webview.html = this.getMCPChatContent(panel.webview);

    panel.webview.onDidReceiveMessage(
      async (message) => {
        if (message.command === 'askQuestion') {
          await this.handleQuestion(message.text, 'mcp', panel);
        }
      },
      null,
      this.context.subscriptions,
    );

    panel.onDidDispose(() => {
      AssistantWebviewProvider.mcpPanel = undefined;
    });

    AssistantWebviewProvider.mcpPanel = panel;
  }

  private async handleQuestion(question: string, agent: string, panel: vscode.WebviewPanel): Promise<void> {
    this.logger.info(`Assistant question (${agent}): ${question}`);

    // Show loading state
    panel.webview.postMessage({
      command: 'response',
      text: agent === 'mcp' ? 'Connecting to Razorpay MCP Server...' : 'Thinking...',
      agent: agent,
      isLoading: true,
    });

    try {
      let response: string;

      if (agent === 'mcp') {
        // Use Razorpay Remote MCP Server via HTTP
        response = await this.handleMCPQuestion(question);
      } else if (agent === 'razorpay') {
        // Use AI-powered Razorpay assistant
        response = await this.handleRazorpayQuestion(question);
      } else {
        response = 'Unknown agent selected.';
      }

      panel.webview.postMessage({
        command: 'response',
        text: response,
        agent: agent,
        isLoading: false,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error('Failed to handle question', error as Error);

      panel.webview.postMessage({
        command: 'response',
        text: `Error: ${errorMessage}`,
        agent: agent,
        isLoading: false,
      });
    }
  }

  /**
   * Handle questions using Razorpay Remote MCP Server via HTTP
   * Based on: https://razorpay.com/docs/mcp-server/remote/
   */
  private async handleMCPQuestion(question: string): Promise<string> {
    const config = vscode.workspace.getConfiguration('razorpay');
    const keyId = config.get<string>('keyId');
    const keySecret = config.get<string>('keySecret');

    if (!keyId || !keySecret) {
      return `⚠️ **MCP Server requires Razorpay API credentials**

Please configure your API keys in VS Code Settings → Razorpay:
- \`razorpay.keyId\`: Your Razorpay Key ID
- \`razorpay.keySecret\`: Your Razorpay Key Secret

**How to get API keys:**
1. Log in to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Go to Account & Settings → API Keys
3. Generate and copy your Key ID and Key Secret

Learn more: https://razorpay.com/docs/mcp-server/remote/`;
    }

    try {
      // Parse the question to determine which MCP tool to use
      const toolRequest = this.parseQuestionForMCPTool(question);
      
      if (toolRequest.action === 'list_tools') {
        return await this.listMCPTools(keyId, keySecret);
      }

      if (toolRequest.action === 'need_input') {
        // Check if there's a custom message
        if (toolRequest.message) {
          return toolRequest.message;
        }
        const missing = (toolRequest.params as { missing?: string }).missing || 'required parameters';
        return `⚠️ **Missing Required Parameter**

To use \`${toolRequest.tool}\`, please provide: **${missing}**

**Example:**
- "Capture payment pay_XXXXX for 100"
- "Fetch order order_XXXXX"
- "Fetch payment pay_XXXXX"`;
      }

      // Execute the MCP tool
      return await this.executeMCPTool(keyId, keySecret, toolRequest.tool, toolRequest.params);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('MCP Server error', error as Error);
      
      return ` **MCP Server Error**

${errorMessage}

**Troubleshooting:**
1. Check your internet connection
2. Verify your API credentials are correct
3. Try again in a few seconds

Learn more: https://razorpay.com/docs/mcp-server/remote/`;
    }
  }

  /**
   * Create base64 encoded merchant token for MCP authentication
   */
  private createMerchantToken(keyId: string, keySecret: string): string {
    const credentials = `${keyId}:${keySecret}`;
    return Buffer.from(credentials).toString('base64');
  }

  /**
   * Make HTTP request to Razorpay MCP Server
   */
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
        
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            // Handle streaming response - take first valid JSON
            const lines = data.split('\n').filter(line => line.trim());
            for (const line of lines) {
              try {
                const response = JSON.parse(line);
                if (response.jsonrpc) {
                  resolve(response);
                  return;
                }
              } catch {
                // Try next line
              }
            }
            // Try parsing whole response
            const response = JSON.parse(data);
            resolve(response);
    } catch (error) {
            this.logger.error('Failed to parse MCP response', error as Error);
            reject(new Error(`Invalid response from MCP server: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`MCP Server connection failed: ${error.message}`));
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('MCP Server request timed out'));
      });

      req.write(requestBody);
      req.end();
    });
  }

  private parseQuestionForMCPTool(question: string): { action: string; tool: string; params: Record<string, unknown>; message?: string } {
    const lowerQuestion = question.toLowerCase();

    // Check for list tools command
    if (lowerQuestion.includes('list tools') || lowerQuestion.includes('available tools') || 
        lowerQuestion.includes('show tools') || lowerQuestion.includes('what can you do') ||
        lowerQuestion.match(/^help$/)) {
      return { action: 'list_tools', tool: '', params: {} };
    }

    // PRIORITY: Check for PAYMENT-related commands FIRST (before order commands)
    // CREATE/GENERATE PAYMENT / PAY FOR ORDER - Create payment link
    if ((lowerQuestion.includes('create payment') || lowerQuestion.includes('generate payment') ||
         lowerQuestion.includes('make payment') || lowerQuestion.includes('pay for') || 
         lowerQuestion.includes('send payment')) && 
        question.match(/order_\w+/i)) {
      const orderIdMatch = question.match(/order_\w+/i);
      
      // Extract amount - look for patterns like "100", "₹100", "Rs 100", "for 100", "20 rupees"
      let amount: number | null = null;
      const amountPatterns = [
        /(?:₹|rs\.?|inr|rupees?)\s*(\d+)/i,  // ₹100, Rs 100
        /(\d+)\s*(?:₹|rs\.?|inr|rupees?)/i,   // 100 Rs, 100 rupees, 20 rupees
        /(?:amount[:\s])\s*(\d{1,6})\b/i,     // amount: 100
        /\b(\d{1,5})\s*(?:rs|rupees?|inr)/i   // 20 rupees, 100 rs
      ];
      
      for (const pattern of amountPatterns) {
        const match = question.match(pattern);
        if (match && parseInt(match[1]) < 1000000) {
          amount = parseInt(match[1]) * 100;
          break;
        }
      }
      
      // If no amount specified, ask user to provide it
      if (amount === null) {
        return {
          action: 'need_input',
          tool: 'create_payment_link',
          params: { 
            missing: 'amount',
            orderId: orderIdMatch![0]
          },
          message: `⚠️ **Please specify the amount**\n\nInclude the amount in your command:\n\n\`Generate payment for ${orderIdMatch![0]} for <amount> rupees\`\n\n💡 **Tip:** Use the same amount as your order!`
        };
      }
      
      // Extract customer details if provided
      const emailMatch = question.match(/[\w.-]+@[\w.-]+\.\w+/i);
      const phoneMatch = question.match(/\b[6-9]\d{9}\b/);
      
      // Build params
      const params: any = { 
        amount: amount,
        currency: 'INR',
        description: `Payment for ${orderIdMatch![0]}`
      };
      
      // Add customer details if email or phone provided
      if (emailMatch || phoneMatch) {
        params.customer = {
          email: emailMatch ? emailMatch[0] : '',
          contact: phoneMatch ? `+91${phoneMatch[0]}` : ''
        };
        params.notify = {
          email: emailMatch ? true : false,
          sms: phoneMatch ? true : false
        };
      }
      
      return {
        action: 'call_tool',
        tool: 'create_payment_link',
        params: params
      };
    }

    // Parse for specific operations - CREATE ORDER (only when NOT about payment)
    if ((lowerQuestion.includes('create') && lowerQuestion.includes('order') && 
         !lowerQuestion.includes('payment')) || 
        lowerQuestion.includes('new order') ||
        (lowerQuestion.match(/order.*for.*\d+/) && !lowerQuestion.includes('payment')) ||
        lowerQuestion.match(/^\d+.*order$/)) {
      const amountMatch = question.match(/(\d+)/);
      const amount = amountMatch ? parseInt(amountMatch[1]) * 100 : 50000; // Convert to paise
      return {
        action: 'call_tool',
        tool: 'create_order',
        params: { amount, currency: 'INR' }
      };
    }

    // FETCH ORDER (single order by ID)
    if (question.match(/order_\w+/i) && 
        (lowerQuestion.includes('fetch') || lowerQuestion.includes('get') || 
         lowerQuestion.includes('details') || lowerQuestion.includes('info') ||
         lowerQuestion.includes('status') || lowerQuestion.includes('show'))) {
      const orderIdMatch = question.match(/order_\w+/i);
      return {
        action: 'call_tool',
        tool: 'fetch_order',
        params: { order_id: orderIdMatch![0] }
      };
    }

    // LIST/FETCH ALL ORDERS
    if (lowerQuestion.includes('list order') || lowerQuestion.includes('all order') ||
        lowerQuestion.includes('show order') || 
        (lowerQuestion.includes('fetch') && lowerQuestion.includes('order') && !question.match(/order_\w+/i)) ||
        lowerQuestion.match(/orders$/)) {
      return {
        action: 'call_tool',
        tool: 'fetch_all_orders',
        params: { count: 10 }
      };
    }

    // FETCH ORDER without ID - ask for it
    if ((lowerQuestion.includes('fetch order') || lowerQuestion.includes('get order')) && 
        !question.match(/order_\w+/i)) {
      return { action: 'need_input', tool: 'fetch_order', params: { missing: 'order_id (e.g., order_XXXXX)' } };
    }

    // FETCH PAYMENT (single payment by ID)
    if ((lowerQuestion.includes('fetch payment') || lowerQuestion.includes('get payment') ||
        lowerQuestion.match(/payment.*(details|info|status)/)) && question.match(/pay_\w+/i)) {
      const paymentIdMatch = question.match(/pay_\w+/i);
      return {
        action: 'call_tool',
        tool: 'fetch_payment',
        params: { payment_id: paymentIdMatch ? paymentIdMatch[0] : '' }
      };
    }

    // LIST/FETCH ALL PAYMENTS
    if (lowerQuestion.includes('list payment') || lowerQuestion.includes('all payment') ||
        lowerQuestion.includes('show payment') || lowerQuestion.includes('fetch payment') ||
        lowerQuestion.match(/payments$/)) {
      return {
        action: 'call_tool',
        tool: 'fetch_all_payments',
        params: { count: 10 }
      };
    }

    // FETCH REFUND (single refund by ID)
    if ((lowerQuestion.includes('fetch refund') || lowerQuestion.includes('get refund')) && 
        question.match(/rfnd_\w+/i)) {
      const refundIdMatch = question.match(/rfnd_\w+/i);
      return {
        action: 'call_tool',
        tool: 'fetch_refund',
        params: { refund_id: refundIdMatch ? refundIdMatch[0] : '' }
      };
    }

    // LIST/FETCH ALL REFUNDS
    if (lowerQuestion.includes('list refund') || lowerQuestion.includes('all refund') ||
        lowerQuestion.includes('show refund') || lowerQuestion.match(/refunds$/)) {
      return {
        action: 'call_tool',
        tool: 'fetch_all_refunds',
        params: { count: 10 }
      };
    }

    // CAPTURE PAYMENT
    if (lowerQuestion.includes('capture') && lowerQuestion.includes('payment')) {
      const paymentIdMatch = question.match(/pay_\w+/i);
      const amountMatch = question.match(/(\d+)/);
      if (!paymentIdMatch) {
        return { action: 'need_input', tool: 'capture_payment', params: { missing: 'payment_id' } };
      }
      return {
        action: 'call_tool',
        tool: 'capture_payment',
        params: { 
          payment_id: paymentIdMatch[0],
          amount: amountMatch ? parseInt(amountMatch[1]) * 100 : 10000,
          currency: 'INR'
        }
      };
    }

    // FETCH ORDER PAYMENTS
    if (lowerQuestion.includes('order payment') || 
        (lowerQuestion.includes('payment') && lowerQuestion.includes('for') && question.match(/order_\w+/i) &&
         !lowerQuestion.includes('create') && !lowerQuestion.includes('make') && !lowerQuestion.includes('send'))) {
      const orderIdMatch = question.match(/order_\w+/i);
      if (orderIdMatch) {
        return {
          action: 'call_tool',
          tool: 'fetch_order_payments',
          params: { order_id: orderIdMatch[0] }
        };
      }
    }

    // CREATE PAYMENT LINK (generic)
    if (lowerQuestion.includes('payment link') || lowerQuestion.includes('create_payment_link')) {
      // Extract amount - look for patterns like "100", "₹100", "Rs 100", "for 100"
      let amount = 50000; // Default ₹500
      const amountPatterns = [
        /(?:₹|rs\.?|inr|rupees?)\s*(\d+)/i,
        /(\d+)\s*(?:₹|rs\.?|inr|rupees?)/i,
        /link\s+(?:for\s+)?(\d{1,6})\b/i,
        /(?:for|amount[:\s])\s*(\d{1,6})\b/i
      ];
      
      for (const pattern of amountPatterns) {
        const match = question.match(pattern);
        if (match && parseInt(match[1]) < 1000000) {
          amount = parseInt(match[1]) * 100;
          break;
        }
      }
      
      // Extract customer details if provided
      const emailMatch = question.match(/[\w.-]+@[\w.-]+\.\w+/i);
      const phoneMatch = question.match(/\b[6-9]\d{9}\b/);
      
      // Build params with customer if available
      const params: any = { 
        amount: amount,
        currency: 'INR',
        description: 'Payment Link'
      };
      
      // Add customer details if email or phone provided
      if (emailMatch || phoneMatch) {
        params.customer = {
          email: emailMatch ? emailMatch[0] : '',
          contact: phoneMatch ? `+91${phoneMatch[0]}` : ''
        };
        params.notify = {
          email: emailMatch ? true : false,
          sms: phoneMatch ? true : false
        };
      }
      
      return {
        action: 'call_tool',
        tool: 'create_payment_link',
        params: params
      };
    }

    // FETCH ALL PAYMENT LINKS
    if (lowerQuestion.includes('payment link') && (lowerQuestion.includes('list') || lowerQuestion.includes('all') || lowerQuestion.includes('fetch'))) {
      return {
        action: 'call_tool',
        tool: 'fetch_all_payment_links',
        params: {}
      };
    }

    // SEND PAYMENT LINK NOTIFICATION
    if ((lowerQuestion.includes('send') || lowerQuestion.includes('notify')) && 
        lowerQuestion.includes('link') && question.match(/plink_\w+/i)) {
      const linkIdMatch = question.match(/plink_\w+/i);
      const emailMatch = question.match(/[\w.-]+@[\w.-]+\.\w+/i);
      const phoneMatch = question.match(/\b[6-9]\d{9}\b/);
      
      // Determine medium (email or sms)
      let medium = 'email';
      if (lowerQuestion.includes('sms') || (phoneMatch && !emailMatch)) {
        medium = 'sms';
      }
      
      return {
        action: 'call_tool',
        tool: 'payment_link_notify',
        params: {
          plink_id: linkIdMatch![0],
          medium: medium
        }
      };
    }

    // CREATE QR CODE
    if (lowerQuestion.includes('qr') && lowerQuestion.includes('create')) {
      const amountMatch = question.match(/(\d+)/);
      return {
        action: 'call_tool',
        tool: 'create_qr_code',
        params: { 
          usage: 'single_use',
          fixed_amount: true,
          payment_amount: amountMatch ? parseInt(amountMatch[1]) * 100 : 50000
        }
      };
    }

    // FETCH ALL QR CODES
    if (lowerQuestion.includes('qr') && (lowerQuestion.includes('list') || lowerQuestion.includes('all') || lowerQuestion.includes('fetch'))) {
      return {
        action: 'call_tool',
        tool: 'fetch_all_qr_codes',
        params: {}
      };
    }

    // FETCH ALL SETTLEMENTS
    if (lowerQuestion.includes('settlement')) {
      return {
        action: 'call_tool',
        tool: 'fetch_all_settlements',
        params: { count: 10 }
      };
    }

    // FETCH ALL PAYOUTS
    if (lowerQuestion.includes('payout')) {
      return {
        action: 'call_tool',
        tool: 'fetch_all_payouts',
        params: {}
      };
    }

    // Default: list available tools
    return { action: 'list_tools', tool: '', params: {} };
  }

  private async listMCPTools(keyId: string, keySecret: string): Promise<string> {
    try {
      const response = await this.mcpRequest(keyId, keySecret, 'tools/list', {});
      
      if (response.error) {
        throw new Error(response.error.message);
      }

      const tools = response.result?.tools || [];
      
      if (tools.length === 0) {
        return this.getStaticToolsList();
      }

      let result = `## 🛠️ Available Razorpay MCP Tools\n\n`;
      
      for (const tool of tools) {
        result += `### ${tool.name}\n`;
        result += `${tool.description}\n\n`;
      }

      result += `\n---\n**Usage Examples:**\n`;
      result += `- "Create order for 500 rupees"\n`;
      result += `- "Fetch order order_ABC123"\n`;
      result += `- "List all payments"\n`;
      result += `- "Refund payment pay_XYZ789"\n`;

      return result;
    } catch (error) {
      this.logger.warn('Failed to fetch MCP tools dynamically, using static list');
      return this.getStaticToolsList();
    }
  }

  private getStaticToolsList(): string {
    return `## 🛠️ Available Razorpay MCP Tools

The Razorpay MCP Server provides **32 tools** for direct API operations:

### 📦 Orders (4 tools)
- **create_order** - "Create order for 500"
- **fetch_order** - "Fetch order order_XXXXX"
- **fetch_all_orders** - "List orders"
- **update_order** - "Update order order_XXXXX"

### 💳 Payments (5 tools)
- **fetch_payment** - "Fetch payment pay_XXXXX"
- **fetch_all_payments** - "List payments"
- **fetch_order_payments** - "Get payments for order_XXXXX"
- **capture_payment** - "Capture payment pay_XXXXX" *(requires authorized payment)*
- **initiate_payment** -  *Requires S2S API access*

### 🔗 Payment Links (4 tools)
- **create_payment_link** - "Generate payment for order_XXX" or "Create payment link for 500"
- **fetch_payment_link** - "Fetch link plink_XXXXX"
- **fetch_all_payment_links** - "List payment links"
- **update_payment_link** - Update link details

### 📱 QR Codes (5 tools)
- **create_qr_code** - "Create QR code for 100"
- **fetch_qr_code** - Fetch QR by ID
- **fetch_all_qr_codes** - "List QR codes"
- **fetch_qr_codes_by_customer_id** - QR by customer
- **fetch_payments_for_qr_code** - Payments on QR

### 💸 Refunds (4 tools)
- **fetch_refund** - "Fetch refund rfnd_XXXXX"
- **fetch_all_refunds** - "List refunds"
- **fetch_multiple_refunds_for_payment** - Refunds for payment
- **update_refund** - Update refund notes

### 🏦 Settlements (4 tools)
- **fetch_all_settlements** - "List settlements"
- **fetch_settlement_with_id** - Fetch by ID
- **fetch_all_instant_settlements** - Instant settlements
- **fetch_settlement_recon_details** - Recon report

### 💰 Payouts (2 tools)
- **fetch_all_payouts** - "List payouts"
- **fetch_payout_with_id** - Fetch by ID

### 🔐 Tokens (2 tools)
- **fetch_tokens** - Get saved payment methods
- **revoke_token** - Revoke a token

### 🔔 Notifications (2 tools)
- **payment_link_notify** - Send link notification
- **payment_link_upi_create** - Create UPI link

---
**Quick Commands:**
| Action | Command |
|--------|---------|
| Create Order | "Create order for 500" |
| List Orders | "List orders" |
| Fetch Order | "Fetch order order_XXXXX" |
| List Payments | "List payments" |
| Create Link | "Generate payment for order_XXX" or "Create payment link for 1000" |
| List Refunds | "List refunds" |

Learn more: https://razorpay.com/docs/mcp-server/`;
  }

  private async executeMCPTool(keyId: string, keySecret: string, toolName: string, params: Record<string, unknown>): Promise<string> {
    try {
      this.logger.info(`Executing MCP tool: ${toolName} with params: ${JSON.stringify(params)}`);
      
      const response = await this.mcpRequest(keyId, keySecret, 'tools/call', {
        name: toolName,
        arguments: params
      });

      if (response.error) {
        return `## ❌ Error\n\n**${response.error.message}**\n\nError code: ${response.error.code}`;
      }

      if (response.result?.content) {
        const textContent = response.result.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('\n');
        
        // Try to pretty-print JSON and add human-readable amounts
        try {
          const parsed = JSON.parse(textContent);
          const formatted = this.formatMCPResult(parsed);
          return `## ✅ ${toolName} Result\n\n${formatted}`;
        } catch {
          return `## ✅ ${toolName} Result\n\n${textContent}`;
        }
      }

      // Return raw result if no content array
      const formatted = this.formatMCPResult(response.result);
      return `## ✅ ${toolName} Result\n\n${formatted}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to execute ${toolName}: ${errorMessage}`);
    }
  }

  /**
   * Format MCP result with human-readable amounts
   */
  private formatMCPResult(result: unknown): string {
    if (!result || typeof result !== 'object') {
      return `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
    }

    const data = result as Record<string, unknown>;
    
    // For payment link result - show only essential info with clickable link
    if (data.id && typeof data.id === 'string' && data.id.startsWith('plink_') && data.short_url) {
      const amount = typeof data.amount === 'number' ? data.amount / 100 : 0;
      const currency = data.currency || 'INR';
      
      let summary = `### 🔗 Payment Link Created!\n\n`;
      summary += `**Amount:** ₹${amount} ${currency}\n\n`;
      summary += `**Payment Link:**\n`;
      summary += `### 👉 [Click here to pay](${data.short_url})\n\n`;
      summary += `\`${data.short_url}\`\n\n`;
      summary += `---\n`;
      summary += `**Link ID:** \`${data.id}\`\n`;
      summary += `**Status:** ${data.status}\n`;
      if (data.description) summary += `**Description:** ${data.description}\n`;
      
      return summary;
    }
    
    // For single order/payment result
    if (data.entity === 'order' || data.entity === 'payment') {
      const amount = typeof data.amount === 'number' ? data.amount / 100 : 0;
      const amountDue = typeof data.amount_due === 'number' ? data.amount_due / 100 : 0;
      const amountPaid = typeof data.amount_paid === 'number' ? data.amount_paid / 100 : 0;
      const currency = data.currency || 'INR';
      
      let summary = `### ${data.entity === 'order' ? '📦 Order Created!' : '💳 Payment Details'}\n\n`;
      summary += `| Field | Value |\n|-------|-------|\n`;
      summary += `| ID | \`${data.id}\` |\n`;
      summary += `| Amount | **₹${amount}** |\n`;
      if (data.amount_due !== undefined) summary += `| Amount Due | ₹${amountDue} |\n`;
      if (data.amount_paid !== undefined) summary += `| Amount Paid | ₹${amountPaid} |\n`;
      summary += `| Currency | ${currency} |\n`;
      summary += `| Status | **${data.status}** |\n`;
      if (data.receipt) summary += `| Receipt | ${data.receipt} |\n`;
      if (data.created_at) {
        const date = new Date((data.created_at as number) * 1000);
        summary += `| Created | ${date.toLocaleString()} |\n`;
      }
      
      // Add helpful next step for orders
      if (data.entity === 'order') {
        summary += `\n---\n💡 **Next Step:** Generate payment link:\n\`Generate payment for ${data.id} for ${amount} rupees\``;
      }
      
      return summary;
    }
    
    // For collection results (list of items)
    if (data.entity === 'collection' && Array.isArray(data.items)) {
      const items = data.items as Array<Record<string, unknown>>;
      let summary = `### 📋 Found ${data.count || items.length} items\n\n`;
      
      if (items.length > 0) {
        summary += `| ID | Amount | Status | Created |\n|-----|--------|--------|----------|\n`;
        
        for (const item of items.slice(0, 10)) {
          const itemAmount = typeof item.amount === 'number' ? `₹${item.amount / 100}` : '-';
          const status = item.status || '-';
          const created = item.created_at 
            ? new Date((item.created_at as number) * 1000).toLocaleDateString() 
            : '-';
          summary += `| \`${item.id}\` | ${itemAmount} | ${status} | ${created} |\n`;
        }
        
        if (items.length > 10) {
          summary += `\n*... and ${items.length - 10} more*\n`;
        }
      }
      
      return summary;
    }
    
    // Default: just return formatted JSON
    return `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
  }

  /**
   * Call Razorpay Smartron API (RAY) for intelligent documentation assistance
   * This API doesn't require any authentication
   */
  private async callSmartronAPI(question: string): Promise<SmartronResponse> {
    const requestBody = JSON.stringify({
      question: question,
      products: ['docs'],
      history: this.smartronHistory.slice(-5) // Keep last 5 conversation items for context
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'smartron.razorpay.com',
        port: 443,
        path: '/query',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Origin': 'https://razorpay.com',
          'Referer': 'https://razorpay.com/',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            this.logger.error('Failed to parse Smartron response', error as Error);
            reject(new Error(`Invalid response from Smartron API: ${data.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Smartron API connection failed: ${error.message}`));
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Smartron API request timed out'));
      });

      req.write(requestBody);
      req.end();
    });
  }

  /**
   * Format Smartron API response with sources
   */
  private formatSmartronResponse(response: SmartronResponse): string {
    if (response.error) {
      return `⚠️ **Error:** ${response.error}`;
    }

    let result = response.answer || 'No response received.';

    // Add sources if available
    if (response.sources && response.sources.length > 0) {
      result += '\n\n---\n📚 **Sources:**\n';
      for (const source of response.sources) {
        if (source.url) {
          result += `- [${source.title || 'Razorpay Docs'}](${source.url})\n`;
        }
      }
    }

    return result;
  }

  private createLLM(): LLMType | null {
    const config = vscode.workspace.getConfiguration('razorpay');
    
    const openaiKey = config.get<string>('ai.openai.apiKey');
    const openaiModel = config.get<string>('ai.openai.model') || 'gpt-4o-mini';
    
    if (openaiKey) {
      return new ChatOpenAI({
        apiKey: openaiKey,
        model: openaiModel,
        temperature: 0.2,
      });
    }

    const geminiKey = config.get<string>('ai.gemini.apiKey');
    const geminiModel = config.get<string>('ai.gemini.model') || 'gemini-2.0-flash';
    
    if (geminiKey) {
      return new ChatGoogleGenerativeAI({
        apiKey: geminiKey,
        model: geminiModel,
        temperature: 0.2,
      });
    }

    return null;
  }

  private async handleRazorpayQuestion(question: string): Promise<string> {
    // First, try to use Razorpay Smartron API (RAY) - no API key needed
    try {
      this.logger.info('Calling Razorpay Smartron API...');
      const smartronResponse = await this.callSmartronAPI(question);
      
      if (smartronResponse.answer) {
        // Store in history for context in future questions
        this.smartronHistory.push({
          question: question,
          answer: smartronResponse.answer
        });
        
        // Keep history limited to last 10 items
        if (this.smartronHistory.length > 10) {
          this.smartronHistory = this.smartronHistory.slice(-10);
        }
        
        return this.formatSmartronResponse(smartronResponse);
      }
    } catch (error) {
      this.logger.warn(`Smartron API call failed, falling back to LLM: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Fallback to LangChain LLM if Smartron fails
    const llm = this.createLLM();
    
    if (llm) {
      try {
        // Use LangChain LLM for AI-powered responses
        return await this.callAI(llm, question);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error('AI call failed', error as Error);
        
        // Provide helpful error messages
        if (errorMessage.includes('404') || errorMessage.includes('not found')) {
          return `⚠️ Model not found. Try changing the model in Settings → Razorpay → AI.\n\nAvailable models:\n- Gemini: gemini-2.0-flash, gemini-1.5-pro, gemini-pro\n- OpenAI: gpt-4o-mini, gpt-4o, gpt-3.5-turbo\n\n${this.getFallbackResponse(question)}`;
        }
        if (errorMessage.includes('401') || errorMessage.includes('API key')) {
          return `⚠️ Invalid API key. Please check your API key in Settings → Razorpay → AI.\n\n${this.getFallbackResponse(question)}`;
        }
        if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          return `⚠️ Rate limit exceeded. Please wait a moment and try again.\n\n${this.getFallbackResponse(question)}`;
        }
        
        return `⚠️ AI Error: ${errorMessage}\n\n${this.getFallbackResponse(question)}`;
      }
    }

    // Fallback to hardcoded responses if no API key is configured
    return this.getFallbackResponse(question);
  }

  private getFallbackResponse(question: string): string {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('payment') || lowerQuestion.includes('checkout')) {
      return `For Razorpay payment integration, you can:

1. **Create an Order**: Use the "Create Order" trigger event to generate an order ID
2. **Integrate Checkout**: Use the Razorpay Checkout.js library in your frontend
3. **Handle Webhooks**: Set up webhooks to receive payment status updates

Example checkout integration:
\`\`\`javascript
const options = {
  key: 'YOUR_KEY_ID',
  amount: orderAmount,
  currency: 'INR',
  name: 'Your Company',
  order_id: orderId,
  handler: function(response) {
    // Payment successful
    console.log('Payment ID:', response.razorpay_payment_id);
  }
};
const rzp = new Razorpay(options);
rzp.open();
\`\`\`

Would you like more specific help with any of these?

💡 Tip: Set your AI API key in Settings → Razorpay for smarter responses!`;
    }

    if (lowerQuestion.includes('order') || lowerQuestion.includes('create order')) {
      return `To create a Razorpay order:

1. Use the "Create Order" trigger event in this extension
2. Or use the API directly:
\`\`\`javascript
const order = await razorpay.orders.create({
  amount: 50000, // in paise
  currency: 'INR',
  receipt: 'receipt_001'
});
\`\`\`

The order ID can then be used in the checkout flow.

💡 Tip: Set your AI API key in Settings → Razorpay for smarter responses!`;
    }

    if (lowerQuestion.includes('webhook') || lowerQuestion.includes('event')) {
      return `Razorpay webhooks notify you of payment events:

- **payment.captured**: Payment successfully captured
- **payment.failed**: Payment failed
- **order.paid**: Order fully paid

Set up webhooks in your Razorpay Dashboard under Settings → Webhooks.

💡 Tip: Set your AI API key in Settings → Razorpay for smarter responses!`;
    }

    if (lowerQuestion.includes('refund') || lowerQuestion.includes('cancel')) {
      return `To process a refund in Razorpay:

\`\`\`javascript
const refund = await razorpay.payments.refund(paymentId, {
  amount: 50000, // optional, full refund if omitted
  notes: {
    reason: 'Customer request'
  }
});
\`\`\`

💡 Tip: Set your AI API key in Settings → Razorpay for smarter responses!`;
    }

    return `I'm the Razorpay assistant. I can help you with:

- Payment integration and checkout
- Order creation and management
- Webhook setup and handling
- Refunds and cancellations
- API usage and code snippets

💡 Tip: Set your AI API key in Settings → Razorpay → AI (OpenAI or Gemini) for smarter AI-powered responses!

What specific Razorpay topic would you like help with?`;
  }

  /**
   * Call AI using LangChain (supports OpenAI and Google Gemini)
   */
  private async callAI(llm: LLMType, question: string): Promise<string> {
    const systemMessage = new SystemMessage(
      'You are a helpful assistant specializing in Razorpay payment integration. Help developers with Razorpay APIs, SDKs, webhooks, and best practices.'
    );
    const humanMessage = new HumanMessage(question);

    const response = await llm.invoke([systemMessage, humanMessage]);
    
    // Extract text content from the response
    const content = response.content;
    if (typeof content === 'string') {
      return content;
    }
    
    // Handle array of content parts (for multimodal responses)
    if (Array.isArray(content)) {
      return content
        .map((part: unknown) => {
          if (typeof part === 'string') return part;
          if (part && typeof part === 'object' && 'text' in part) {
            return (part as { text: string }).text;
          }
          return '';
        })
        .join('');
    }

    return 'No response received';
  }

  private getBaseStyles(): string {
    return `
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .header-icon { font-size: 28px; }
        .header-info { flex: 1; }
        .header-title { font-weight: 600; font-size: 15px; margin-bottom: 2px; }
        .header-desc { font-size: 12px; color: var(--vscode-descriptionForeground); }
        .chat-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        .chat-history {
            flex: 1;
            overflow-y: auto;
            padding: 16px 20px;
        }
        .message {
            margin-bottom: 12px;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 13px;
            line-height: 1.5;
            word-wrap: break-word;
        }
        .user-message {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: 20%;
            border-bottom-right-radius: 4px;
        }
        .assistant-message {
            background: var(--vscode-textBlockQuote-background);
            margin-right: 20%;
            border-bottom-left-radius: 4px;
        }
        .input-area {
            padding: 12px 20px 16px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 8px;
        }
        input {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid var(--vscode-input-border);
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 6px;
            font-size: 13px;
        }
        input:focus { outline: 1px solid var(--vscode-focusBorder); }
        button {
            padding: 10px 18px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }
        button:hover { background: var(--vscode-button-hoverBackground); }
        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 8px 0;
            font-size: 12px;
        }
        code { font-family: var(--vscode-editor-font-family); }
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--vscode-descriptionForeground);
        }
        .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
        .empty-text { font-size: 13px; }
    `;
  }

  private getBaseScript(): string {
    return `
        const vscode = acquireVsCodeApi();
        const questionInput = document.getElementById('questionInput');
        const chatHistory = document.getElementById('chatHistory');

        function askQuestion() {
            const question = questionInput.value.trim();
            if (!question) return;

            const empty = chatHistory.querySelector('.empty-state');
            if (empty) empty.remove();

            addMessage(question, 'user');
            questionInput.value = '';

            vscode.postMessage({
                command: 'askQuestion',
                text: question
            });
        }

        function addMessage(text, type) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + (type === 'user' ? 'user-message' : 'assistant-message');
            
            if (type === 'assistant') {
                messageDiv.innerHTML = formatMessage(text);
            } else {
                messageDiv.textContent = text;
            }
            
            chatHistory.appendChild(messageDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }

        function formatMessage(text) {
            if (!text) return '';
            let formatted = String(text);
            // Code blocks
            formatted = formatted.replace(/\`\`\`([\\w]*)?\\n([\\s\\S]*?)\`\`\`/g, '<pre><code>$2</code></pre>');
            // Inline code
            formatted = formatted.replace(/\`([^\`]+)\`/g, '<code style="background:var(--vscode-textCodeBlock-background);padding:2px 4px;border-radius:3px;">$1</code>');
            // Bold
            formatted = formatted.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
            // Links
            formatted = formatted.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" style="color:var(--vscode-textLink-foreground);" target="_blank">$1</a>');
            // Line breaks
            formatted = formatted.replace(/\\n/g, '<br>');
            return formatted;
        }

        questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') askQuestion();
        });

        window.addEventListener('message', event => {
            const message = event.data;
            console.log('Received message:', message);
            if (message.command === 'response') {
                const lastMsg = chatHistory.lastElementChild;
                if (message.isLoading) {
                    if (lastMsg && lastMsg.classList.contains('assistant-message')) {
                        lastMsg.textContent = message.text;
                    } else {
                        addMessage(message.text, 'assistant');
                    }
                } else {
                    if (lastMsg && (lastMsg.textContent.includes('Thinking...') || lastMsg.textContent.includes('Connecting'))) {
                        lastMsg.innerHTML = formatMessage(message.text);
                    } else {
                        addMessage(message.text, 'assistant');
                    }
                }
            }
        });

        // Focus input on load
        questionInput.focus();
    `;
  }

  private getRazorpayChatContent(_webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Razorpay AI</title>
    <style>${this.getBaseStyles()}</style>
</head>
<body>
    <div class="header">
        <div class="header-icon">🤖</div>
        <div class="header-info">
            <div class="header-title">@razorpay</div>
            <div class="header-desc">AI Docs Assistant</div>
        </div>
    </div>
    
    <div class="chat-container">
        <div class="chat-history" id="chatHistory">
            <div class="empty-state">
                <div class="empty-icon">💬</div>
                <div class="empty-text">Ask about Razorpay APIs, webhooks, and integration</div>
            </div>
        </div>
        
        <div class="input-area">
            <input type="text" id="questionInput" placeholder="Ask about Razorpay..." />
            <button onclick="askQuestion()">Send</button>
        </div>
    </div>

    <script>${this.getBaseScript()}</script>
</body>
</html>`;
  }

  private getMCPChatContent(_webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Razorpay MCP</title>
    <style>${this.getBaseStyles()}</style>
</head>
<body>
    <div class="header">
        <div class="header-icon">⚡</div>
        <div class="header-info">
            <div class="header-title">@mcp</div>
            <div class="header-desc">API Operations</div>
        </div>
    </div>
    
    <div class="chat-container">
        <div class="chat-history" id="chatHistory">
            <div class="empty-state">
                <div class="empty-icon">🔧</div>
                <div class="empty-text">Create orders, payments, refunds via Razorpay API</div>
            </div>
        </div>
        
        <div class="input-area">
            <input type="text" id="questionInput" placeholder="Try: list tools, create order..." />
            <button onclick="askQuestion()">Send</button>
        </div>
    </div>

    <script>${this.getBaseScript()}</script>
</body>
</html>`;
  }
}

