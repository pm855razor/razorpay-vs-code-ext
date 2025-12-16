import * as vscode from 'vscode';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import * as https from 'https';
import type { Logger } from '../utils/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LLMType = ChatOpenAI | ChatGoogleGenerativeAI | any;

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
  private static currentPanel: vscode.WebviewPanel | undefined = undefined;
  private mcpRequestId = 0;

  constructor(private context: vscode.ExtensionContext, private logger: Logger) { }

  public show(): void {
    if (AssistantWebviewProvider.currentPanel) {
      AssistantWebviewProvider.currentPanel.reveal();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'razorpayAssistant',
      'Razorpay Assistant',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    panel.webview.html = this.getWebviewContent(panel.webview);

    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'askQuestion':
            await this.handleQuestion(message.text, message.agent || 'razorpay');
            break;
        }
      },
      null,
      this.context.subscriptions,
    );

    panel.onDidDispose(() => {
      AssistantWebviewProvider.currentPanel = undefined;
    });

    AssistantWebviewProvider.currentPanel = panel;
  }

  private async handleQuestion(question: string, agent: string): Promise<void> {
    this.logger.info(`Assistant question (${agent}): ${question}`);

    if (AssistantWebviewProvider.currentPanel) {
      // Show loading state
      AssistantWebviewProvider.currentPanel.webview.postMessage({
        command: 'response',
        text: agent === 'mcp' ? 'Connecting to Razorpay MCP Server...' : 'Thinking...',
        agent: agent,
        isLoading: true,
      });
    }

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

      if (AssistantWebviewProvider.currentPanel) {
        AssistantWebviewProvider.currentPanel.webview.postMessage({
          command: 'response',
          text: response,
          agent: agent,
          isLoading: false,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error('Failed to handle question', error as Error);

      if (AssistantWebviewProvider.currentPanel) {
        AssistantWebviewProvider.currentPanel.webview.postMessage({
          command: 'response',
          text: `Error: ${errorMessage}`,
          agent: agent,
          isLoading: false,
        });
      }
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

  private getWebviewContent(_webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Razorpay Assistant</title>
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
            margin-bottom: 20px;
        }
        .agent-selector {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            padding: 10px;
            background-color: var(--vscode-input-background);
            border-radius: 4px;
            border: 1px solid var(--vscode-input-border);
        }
        .agent-option {
            flex: 1;
            padding: 12px;
            border: 2px solid transparent;
            border-radius: 6px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-foreground);
            cursor: pointer;
            text-align: center;
            transition: all 0.2s;
        }
        .agent-option:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .agent-option.selected {
            border-color: var(--vscode-textLink-foreground);
            background-color: var(--vscode-list-activeSelectionBackground);
        }
        .agent-option .agent-name {
            font-weight: 600;
            margin-bottom: 4px;
            font-size: 14px;
        }
        .agent-option .agent-desc {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        .agent-option .agent-icon {
            font-size: 24px;
            margin-bottom: 6px;
        }
        .input-container {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
        }
        input {
            flex: 1;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
            font-size: 14px;
        }
        button {
            padding: 10px 20px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;
        }
        button:hover { background-color: var(--vscode-button-hoverBackground); }
        .chat-history { 
            max-height: 400px; 
            overflow-y: auto; 
            margin-top: 20px;
            padding: 10px;
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
        }
        .message { 
            margin-bottom: 15px; 
            padding: 12px; 
            border-radius: 8px;
            line-height: 1.5;
        }
        .user-message { 
            background-color: var(--vscode-input-background); 
            text-align: right;
            margin-left: 20%;
        }
        .assistant-message { 
            background-color: var(--vscode-textBlockQuote-background);
            margin-right: 20%;
        }
        .info-box {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textLink-foreground);
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 0 4px 4px 0;
            font-size: 13px;
        }
        pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 10px 0;
        }
        code {
            font-family: var(--vscode-editor-font-family);
        }
        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 600;
            margin-left: 4px;
        }
        .badge-cloud {
            background-color: #4CAF50;
            color: white;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Razorpay Assistant</h1>
        
        <div class="info-box">
            <strong>Choose your assistant:</strong><br>
           
        </div>
        
        <div class="agent-selector">
            <div class="agent-option" id="agent-razorpay" onclick="selectAgent('razorpay')">
                <div class="agent-icon">🤖</div>
                <div class="agent-name">@razorpay</div>
            </div>
            <div class="agent-option" id="agent-mcp" onclick="selectAgent('mcp')">
                <div class="agent-icon">⚡</div>
                <div class="agent-name">@mcp</div>
            </div>
        </div>
        
        <div class="input-container">
            <input type="text" id="questionInput" placeholder="Ask a question..." />
            <button onclick="askQuestion()">Send</button>
        </div>
        
        <div class="chat-history" id="chatHistory"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const questionInput = document.getElementById('questionInput');
        const chatHistory = document.getElementById('chatHistory');
        let selectedAgent = 'razorpay';

        // Initialize with Razorpay agent selected
        selectAgent('razorpay');

        function selectAgent(agent) {
            selectedAgent = agent;
            
            // Update UI
            document.querySelectorAll('.agent-option').forEach(option => {
                option.classList.remove('selected');
            });
            document.getElementById('agent-' + agent).classList.add('selected');
            
            // Update placeholder
            if (agent === 'razorpay') {
                questionInput.placeholder = 'Ask about Razorpay integration, APIs, webhooks...';
            } else {
                questionInput.placeholder = 'Try: "list tools", "create order for 500", "list payments"...';
            }
        }

        function askQuestion() {
            const question = questionInput.value.trim();
            if (!question) return;

            // Add user message to chat with agent indicator
            const agentLabel = selectedAgent === 'razorpay' ? '@razorpay' : '@mcp';
            addMessage(question, 'user', agentLabel);
            questionInput.value = '';

            // Send to extension
            vscode.postMessage({
                command: 'askQuestion',
                text: question,
                agent: selectedAgent
            });
        }

        function addMessage(text, type, agentLabel = null) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + (type === 'user' ? 'user-message' : 'assistant-message');
            
            if (type === 'user' && agentLabel) {
                const labelSpan = document.createElement('span');
                labelSpan.style.cssText = 'font-size: 11px; color: var(--vscode-textLink-foreground); margin-right: 8px; font-weight: 600;';
                labelSpan.textContent = agentLabel;
                messageDiv.appendChild(labelSpan);
            }
            
            const textNode = document.createElement('span');
            if (type === 'assistant') {
                // Support markdown-like formatting for code blocks
                textNode.innerHTML = formatMessage(text);
            } else {
                textNode.textContent = text;
            }
            messageDiv.appendChild(textNode);
            
            chatHistory.appendChild(messageDiv);
            chatHistory.scrollTop = chatHistory.scrollHeight;
        }

        function formatMessage(text) {
            // Simple markdown formatting
            let formatted = text;
            
            // Code blocks
            formatted = formatted.replace(/\`\`\`(\\w+)?\\n([\\s\\S]*?)\`\`\`/g, function(match, lang, code) {
                return '<pre><code>' + escapeHtml(code.trim()) + '</code></pre>';
            });
            
            // Inline code
            formatted = formatted.replace(/\`([^\`]+)\`/g, '<code style="background-color: var(--vscode-textCodeBlock-background); padding: 2px 6px; border-radius: 3px;">$1</code>');
            
            // Bold text
            formatted = formatted.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
            
            // Headers
            formatted = formatted.replace(/^### (.+)$/gm, '<h4 style="margin: 10px 0 5px 0;">$1</h4>');
            formatted = formatted.replace(/^## (.+)$/gm, '<h3 style="margin: 15px 0 8px 0;">$1</h3>');
            
            // Links
            formatted = formatted.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" style="color: var(--vscode-textLink-foreground);">$1</a>');
            
            // Line breaks
            formatted = formatted.replace(/\\n/g, '<br>');
            
            return formatted;
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                askQuestion();
            }
        });

        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'response') {
                if (message.isLoading) {
                    // Update last message if loading
                    const lastMessage = chatHistory.lastElementChild;
                    if (lastMessage && lastMessage.classList.contains('assistant-message')) {
                        lastMessage.querySelector('span').textContent = message.text;
                    } else {
                        addMessage(message.text, 'assistant');
                    }
                } else {
                    // Replace loading message or add new one
                    const lastMessage = chatHistory.lastElementChild;
                    if (lastMessage && (lastMessage.textContent.includes('Thinking...') || lastMessage.textContent.includes('Connecting to'))) {
                        lastMessage.querySelector('span').innerHTML = formatMessage(message.text);
                    } else {
                addMessage(message.text, 'assistant');
                    }
                }
            }
        });
    </script>
</body>
</html>`;
  }
}

