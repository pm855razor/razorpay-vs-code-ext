import * as vscode from 'vscode';
import { findApiPattern, getApiDocumentation, type ApiDocumentation } from '../api/apiDocumentation';

/**
 * Hover provider for Razorpay API calls
 * Shows API documentation including input parameters, required fields, output, and documentation links
 */
export class RazorpayHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    try {
      const lineText = document.lineAt(position.line).text;
      const offset = document.offsetAt(position);
      const fullText = document.getText();
      
      // Find API pattern at the cursor position
      const apiPattern = findApiPattern(fullText, offset);
      
      if (!apiPattern) {
        return null;
      }
      
      // Get API documentation
      const apiDoc = getApiDocumentation(apiPattern);
      
      if (!apiDoc) {
        return null;
      }
      
      // Create hover content
      const hoverContent = this.createHoverContent(apiDoc);
      
      // Get the range of the API call for highlighting
      const range = this.getApiCallRange(document, position, lineText);
      
      return new vscode.Hover(hoverContent, range);
    } catch (error) {
      console.error('Error in RazorpayHoverProvider:', error);
      return null;
    }
  }
  
  /**
   * Create hover content with API documentation
   */
  private createHoverContent(apiDoc: ApiDocumentation): vscode.MarkdownString {
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;
    
    // API Name and Description
    markdown.appendMarkdown(`### ${apiDoc.apiName}\n\n`);
    markdown.appendMarkdown(`${apiDoc.description}\n\n`);
    
    // Method and Endpoint
    markdown.appendMarkdown(`**Method:** \`${apiDoc.method}\` | **Endpoint:** \`${apiDoc.endpoint}\`\n\n`);
    
    // Input Parameters
    markdown.appendMarkdown(`####  Input Parameters\n\n`);
    
    const requiredParams = apiDoc.inputParameters.filter(p => p.required);
    const optionalParams = apiDoc.inputParameters.filter(p => !p.required);
    
    if (requiredParams.length > 0) {
      markdown.appendMarkdown(`**Required Fields:**\n\n`);
      requiredParams.forEach(param => {
        markdown.appendMarkdown(`- **\`${param.name}\`** (${param.type}) ${param.required ? '🔴' : ''}\n`);
        markdown.appendMarkdown(`  ${param.description}\n`);
        if (param.example) {
          markdown.appendMarkdown(`  *Example: ${param.example}*\n`);
        }
        markdown.appendMarkdown(`\n`);
      });
    }
    
    if (optionalParams.length > 0) {
      markdown.appendMarkdown(`**Optional Fields:**\n\n`);
      optionalParams.forEach(param => {
        markdown.appendMarkdown(`- **\`${param.name}\`** (${param.type})\n`);
        markdown.appendMarkdown(`  ${param.description}\n`);
        if (param.example) {
          markdown.appendMarkdown(`  *Example: ${param.example}*\n`);
        }
        markdown.appendMarkdown(`\n`);
      });
    }
    
    // Output Fields
    if (apiDoc.outputFields && apiDoc.outputFields.length > 0) {
      markdown.appendMarkdown(`####  Output Fields\n\n`);
      apiDoc.outputFields.forEach(field => {
        markdown.appendMarkdown(`- ${field}\n`);
      });
      markdown.appendMarkdown(`\n`);
    }
    
    // Examples
    if (apiDoc.examples) {
      if (apiDoc.examples.request) {
        markdown.appendMarkdown(`####  Request Example\n\n`);
        markdown.appendCodeblock(apiDoc.examples.request, 'json');
        markdown.appendMarkdown(`\n`);
      }
      
      if (apiDoc.examples.response) {
        markdown.appendMarkdown(`####  Response Example\n\n`);
        markdown.appendCodeblock(apiDoc.examples.response, 'json');
        markdown.appendMarkdown(`\n`);
      }
    }
    
    // Documentation Link
    markdown.appendMarkdown(`#### 📚 Documentation\n\n`);
    markdown.appendMarkdown(`[View API Reference](${apiDoc.docUrl})`);
    
    return markdown;
  }
  
  /**
   * Get the range of the API call for highlighting
   */
  private getApiCallRange(
    document: vscode.TextDocument,
    position: vscode.Position,
    lineText: string,
  ): vscode.Range {
    // Try to find the API call pattern on the current line
    const patterns = [
      /razorpay\.orders\.create/gi,
      /razorpay_client\.order\.create/gi,
      /razorpay\.Order\.create/gi,
      /razorpayClient\.Order\.Create/gi,
      /razorpay\.Orders\.create/gi,
      /Razorpay::Order\.create/gi,
      /razorpay\.orders\.fetch/gi,
      /razorpay_client\.order\.fetch/gi,
      /razorpay\.Order\.fetch/gi,
      /razorpayClient\.Order\.Fetch/gi,
      /razorpay\.Orders\.fetch/gi,
      /Razorpay::Order\.fetch/gi,
      /razorpay\.payments\.fetch/gi,
      /razorpay_client\.payment\.fetch/gi,
      /razorpay\.Payment\.fetch/gi,
      /razorpayClient\.Payment\.Fetch/gi,
      /razorpay\.Payments\.fetch/gi,
      /Razorpay::Payment\.fetch/gi,
      /razorpay\.payments\.refund/gi,
      /razorpay_client\.payment\.refund/gi,
      /razorpay\.Payment\.refund/gi,
      /razorpayClient\.Payment\.Refund/gi,
      /razorpay\.Payments\.refund/gi,
      /Razorpay::Payment\.refund/gi,
      /razorpay\.refunds\.fetch/gi,
      /razorpay_client\.refund\.fetch/gi,
      /razorpay\.Refund\.fetch/gi,
      /razorpayClient\.Refund\.Fetch/gi,
      /razorpay\.Refunds\.fetch/gi,
      /Razorpay::Refund\.fetch/gi,
    ];
    
    for (const pattern of patterns) {
      const match = lineText.match(pattern);
      if (match && match.index !== undefined) {
        const startPos = new vscode.Position(position.line, match.index);
        const endPos = new vscode.Position(position.line, match.index + match[0].length);
        return new vscode.Range(startPos, endPos);
      }
    }
    
    // Default: return range for the current word
    const wordRange = document.getWordRangeAtPosition(position);
    return wordRange || new vscode.Range(position, position);
  }
}

