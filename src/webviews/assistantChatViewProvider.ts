import * as vscode from 'vscode';
import * as https from 'https';
import type { Logger } from '../utils/logger';

/**
 * Sidebar Chat View Provider for Razorpay AI Assistant
 * Opens in the sidebar panel (like Stripe) instead of editor area
 * Uses Razorpay Smartron API for intelligent documentation assistance
 */
export class AssistantChatViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'razorpayAssistantChat';

  private _view?: vscode.WebviewView;

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

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'askQuestion':
          await this.handleQuestion(message.text);
          break;
      }
    });
  }

  private async handleQuestion(question: string): Promise<void> {
    if (!this._view) return;

    this.logger.info(`Assistant question: ${question}`);

    // Show loading state
    this._view.webview.postMessage({
      command: 'response',
      text: 'Thinking...',
      isLoading: true
    });

    try {
      const response = await this.callSmartronAPI(question);

      this._view.webview.postMessage({
        command: 'response',
        text: response,
        isLoading: false
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Smartron API error', error as Error);
      
      this._view.webview.postMessage({
        command: 'response',
        text: `Error: ${errorMessage}`,
        isLoading: false
      });
    }
  }

  /**
   * Call Razorpay Smartron API for AI-powered assistance
   * Response format: text/event-stream with plain markdown text
   */
  private async callSmartronAPI(question: string): Promise<string> {
    const requestBody = JSON.stringify({
      question: question,
      products: ['docs'],
      history: [] 
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'smartron.razorpay.com',
        port: 443,
        path: '/query',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Origin': 'https://razorpay.com',
          'Referer': 'https://razorpay.com/',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = https.request(options, (res) => {
        let rawData = '';

        res.on('data', (chunk) => {
          rawData += chunk.toString();
        });

        res.on('end', () => {
          this.logger.info('Smartron API response length: ' + rawData.length);
          
          // The Smartron API returns text/event-stream with plain markdown text
          let answer = rawData.trim();
          
          // If response contains SSE format "data:" lines, extract the text content
          if (answer.includes('data:')) {
            const lines = answer.split('\n');
            const contentLines: string[] = [];
            
            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('data:')) {
                const content = trimmedLine.substring(5).trim();
                if (content && content !== '[DONE]') {
                  try {
                    const parsed = JSON.parse(content);
                    const textContent = parsed.content || parsed.text || parsed.answer || 
                                       parsed.response || parsed.delta?.content;
                    if (textContent) {
                      contentLines.push(textContent);
                    }
                  } catch {
                    contentLines.push(content);
                  }
                }
              } else if (trimmedLine && !trimmedLine.startsWith('event:') && !trimmedLine.startsWith(':')) {
                contentLines.push(trimmedLine);
              }
            }
            
            if (contentLines.length > 0) {
              answer = contentLines.join('\n');
            }
          }

          if (answer.trim()) {
            resolve(answer.trim());
          } else {
            this.logger.error('Smartron API: Empty response received');
            reject(new Error('No response content received from Smartron API'));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Smartron API connection failed: ${error.message}`));
      });

      req.setTimeout(60000, () => {
        req.destroy();
        reject(new Error('Smartron API request timed out'));
      });

      req.write(requestBody);
      req.end();
    });
  }

  private _getHtmlContent(_webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Razorpay AI Assistant</title>
    <style>
        :root {
            --rzp-blue: #528FF0;
            --rzp-blue-dark: #3B7DE0;
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
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
            background: linear-gradient(135deg, #528FF0 0%, #3B7DE0 100%);
            color: white;
        }
        .header h3 {
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .header p {
            font-size: 11px;
            opacity: 0.9;
            margin-top: 4px;
        }
        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }
        .message {
            margin-bottom: 14px;
            padding: 12px 14px;
            border-radius: 12px;
            font-size: 13px;
            line-height: 1.6;
            word-wrap: break-word;
            animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .user-message {
            background: linear-gradient(135deg, #528FF0 0%, #3B7DE0 100%);
            color: white;
            margin-left: 15%;
            border-bottom-right-radius: 4px;
            box-shadow: 0 2px 8px rgba(82, 143, 240, 0.3);
        }
        .assistant-message {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            margin-right: 5%;
            border-bottom-left-radius: 4px;
        }
        .assistant-message.loading {
            opacity: 0.7;
        }
        .input-container {
            padding: 14px;
            border-top: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
        }
        .input-wrapper {
            display: flex;
            gap: 8px;
        }
        input {
            flex: 1;
            padding: 10px 14px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 8px;
            font-size: 13px;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        input:focus {
            border-color: #528FF0;
            box-shadow: 0 0 0 3px rgba(82, 143, 240, 0.15);
        }
        input::placeholder {
            color: var(--vscode-input-placeholderForeground);
        }
        button {
            padding: 10px 18px;
            background: linear-gradient(135deg, #528FF0 0%, #3B7DE0 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        button:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(82, 143, 240, 0.4);
        }
        button:active {
            transform: translateY(0);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        .welcome {
            text-align: center;
            padding: 24px 16px;
        }
        .welcome h4 {
            margin-bottom: 8px;
            color: var(--vscode-foreground);
            font-size: 15px;
        }
        .welcome p {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }
        .suggestions {
            margin-top: 20px;
        }
        .suggestion {
            display: block;
            padding: 10px 14px;
            margin: 8px 0;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
            text-align: left;
            transition: all 0.2s;
            color: var(--vscode-foreground);
        }
        .suggestion:hover {
            border-color: #528FF0;
            background: rgba(82, 143, 240, 0.1);
            transform: translateX(4px);
        }
        pre {
            background-color: #1e1e2e;
            padding: 12px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 10px 0;
            font-size: 12px;
            border: 1px solid var(--vscode-panel-border);
        }
        code {
            font-family: 'Fira Code', 'SF Mono', Consolas, monospace;
            background-color: rgba(82, 143, 240, 0.1);
            color: #528FF0;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 12px;
        }
        pre code {
            background: none;
            color: inherit;
            padding: 0;
        }
        a {
            color: #528FF0;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
        strong {
            color: var(--vscode-foreground);
            font-weight: 600;
        }
        ::-webkit-scrollbar {
            width: 6px;
        }
        ::-webkit-scrollbar-track {
            background: transparent;
        }
        ::-webkit-scrollbar-thumb {
            background: rgba(82, 143, 240, 0.3);
            border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: rgba(82, 143, 240, 0.5);
        }
    </style>
</head>
<body>
    <div class="header">
        <h3>Razorpay AI Assistant</h3>
        <p>Ask about integration, APIs, webhooks & more</p>
    </div>
    
    <div class="chat-container" id="chatContainer">
        <div class="welcome" id="welcome">
            <h4>How can I help you?</h4>
            <p>Ask me anything about Razorpay integration</p>
            <div class="suggestions">
                <div class="suggestion" onclick="askSuggestion('How do I integrate Razorpay checkout?')">How do I integrate Razorpay checkout?</div>
                <div class="suggestion" onclick="askSuggestion('How to create an order using API?')">How to create an order using API?</div>
                <div class="suggestion" onclick="askSuggestion('What webhooks should I handle?')">What webhooks should I handle?</div>
                <div class="suggestion" onclick="askSuggestion('How to verify payment signature?')">How to verify payment signature?</div>
            </div>
        </div>
    </div>
    
    <div class="input-container">
        <div class="input-wrapper">
            <input type="text" id="questionInput" placeholder="Ask a question..." />
            <button onclick="sendMessage()" id="sendBtn">Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const questionInput = document.getElementById('questionInput');
        const welcome = document.getElementById('welcome');
        const sendBtn = document.getElementById('sendBtn');
        let isLoading = false;

        function askSuggestion(text) {
            questionInput.value = text;
            sendMessage();
        }

        function sendMessage() {
            const question = questionInput.value.trim();
            if (!question || isLoading) return;

            // Hide welcome message
            if (welcome) welcome.style.display = 'none';

            // Add user message
            addMessage(question, 'user');
            questionInput.value = '';
            isLoading = true;
            sendBtn.disabled = true;

            // Send to extension
            vscode.postMessage({
                command: 'askQuestion',
                text: question
            });
        }

        function addMessage(text, type, replace = false) {
            if (replace) {
                const lastMsg = chatContainer.querySelector('.assistant-message:last-child');
                if (lastMsg) {
                    lastMsg.innerHTML = formatMessage(text);
                    lastMsg.classList.remove('loading');
                    return;
                }
            }
            
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message ' + (type === 'user' ? 'user-message' : 'assistant-message');
            
            if (type === 'assistant') {
                msgDiv.innerHTML = formatMessage(text);
            } else {
                msgDiv.textContent = text;
            }
            
            chatContainer.appendChild(msgDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function formatMessage(text) {
            let formatted = text;
            
            // Code blocks
            formatted = formatted.replace(/\`\`\`(\\w+)?\\n([\\s\\S]*?)\`\`\`/g, '<pre><code>$2</code></pre>');
            
            // Inline code
            formatted = formatted.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
            
            // Bold
            formatted = formatted.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
            
            // Links
            formatted = formatted.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a href="$2" target="_blank">$1</a>');
            
            // Line breaks
            formatted = formatted.replace(/\\n/g, '<br>');
            
            return formatted;
        }

        questionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !isLoading) {
                sendMessage();
            }
        });

        // Listen for responses from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'response') {
                if (message.isLoading) {
                    addMessage(message.text, 'assistant');
                    chatContainer.querySelector('.assistant-message:last-child')?.classList.add('loading');
                } else {
                    addMessage(message.text, 'assistant', true);
                    isLoading = false;
                    sendBtn.disabled = false;
                }
            }
        });
    </script>
</body>
</html>`;
  }
}

