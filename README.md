# Razorpay for VS Code

Integrate Razorpay payment gateway into your projects with AI-powered assistance, code snippets, SDK integration, and webhook event handling.

![VS Code Version](https://img.shields.io/badge/VS%20Code-1.80+-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

### AI-Powered Assistant
Get intelligent help with Razorpay integration. Ask questions about:
- Payment flows and best practices
- API usage and parameters
- Error handling and debugging
- Security considerations

### Code Snippets
Ready-to-use code snippets for common Razorpay operations:
- Create orders
- Verify payments
- Process refunds
- Handle webhooks
- And more...

### SDK Integration
Easily integrate Razorpay SDK into your project:
- Automatic project type detection (Node.js, Ruby, Python, etc.)
- One-click SDK installation
- Configuration templates

### Trigger Events
Test webhook events directly from VS Code:
- Simulate payment events
- Test refund callbacks
- Debug webhook handlers

## Installation

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Razorpay for VS Code"
4. Click Install

## Getting Started

1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Razorpay" to see available commands
3. Or click the Razorpay icon in the Activity Bar

### Configuration

Configure your Razorpay credentials in VS Code settings:

```json
{
  "razorpay.keyId": "your_key_id",
  "razorpay.keySecret": "your_key_secret"
}
```

For AI Assistant features, configure your preferred AI provider:

```json
{
  "razorpay.ai.openai.apiKey": "your_openai_key",
  "razorpay.ai.openai.model": "gpt-4o-mini"
}
```

Or use Google Gemini:

```json
{
  "razorpay.ai.gemini.apiKey": "your_gemini_key",
  "razorpay.ai.gemini.model": "gemini-1.5-flash"
}
```

## Available Commands

| Command | Description |
|---------|-------------|
| `Razorpay: Open Assistant` | Open the AI-powered assistant |
| `Razorpay: Code Snippets` | Browse and insert code snippets |
| `Razorpay: Trigger Events` | Test webhook events |
| `Razorpay: SDK Integration` | Integrate Razorpay SDK |

## Supported Languages

- TypeScript / JavaScript
- Ruby
- Python
- PHP
- Java
- Go
- .NET

## Requirements

- VS Code 1.80.0 or higher
- Node.js (for JavaScript/TypeScript projects)
- Internet connection (for AI features)

## Extension Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `razorpay.enableLogging` | Enable extension logging | `true` |
| `razorpay.keyId` | Your Razorpay Key ID | `""` |
| `razorpay.keySecret` | Your Razorpay Key Secret | `""` |
| `razorpay.ai.openai.apiKey` | OpenAI API Key | `""` |
| `razorpay.ai.openai.model` | OpenAI model | `gpt-4o-mini` |
| `razorpay.ai.gemini.apiKey` | Google Gemini API Key | `""` |
| `razorpay.ai.gemini.model` | Gemini model | `gemini-1.5-flash` |

## Privacy & Security

- Your API keys are stored locally in VS Code settings
- AI queries are sent to the configured AI provider (OpenAI or Google)
- No data is collected or stored by this extension

## Contributing

Contributions are welcome! Please visit our [GitHub repository](https://github.com/pm855razor/razorpay-vs-code-ext).

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- [Report Issues](https://github.com/pm855razor/razorpay-vs-code-ext/issues)
- [Razorpay Documentation](https://razorpay.com/docs/)

---

**Made with ❤️ for developers integrating Razorpay**
