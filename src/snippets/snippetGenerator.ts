import * as vscode from 'vscode';
import type { Logger } from '../utils/logger';
import type { SnippetTemplate } from '../types';
import { snippetTemplates } from './snippetTemplates';

/**
 * Code snippet generator for Razorpay integration scenarios.
 */
export class SnippetGenerator {
  constructor(private logger: Logger) {}

  /**
   * Generate and insert a snippet into the active editor.
   * Supports pattern matching (e.g., "order.create" will find "order.create-ts" for TypeScript files)
   */
  async generateSnippet(snippetPattern: string, editor: vscode.TextEditor): Promise<void> {
    try {
      const languageId = editor.document.languageId;
      const language = this.normalizeLanguage(languageId);
      
      // Try to find snippet with language suffix first (e.g., "order.create-ts")
      let template = snippetTemplates.find((s) => s.id === `${snippetPattern}-${language}`);
      
      // If not found, try exact match
      if (!template) {
        template = snippetTemplates.find((s) => s.id === snippetPattern);
      }
      
      // If still not found, try to find any snippet matching the pattern for the language
      if (!template) {
        const availableSnippets = this.getAvailableSnippets(language);
        template = availableSnippets.find((s) => s.id.startsWith(snippetPattern));
      }

      if (!template) {
        throw new Error(`Snippet not found for pattern "${snippetPattern}" and language "${language}"`);
      }

      const snippet = new vscode.SnippetString(template.body.join('\n'));
      const position = editor.selection.active;
      await editor.insertSnippet(snippet, position);

      this.logger.info(`Snippet ${template.id} inserted successfully`);
    } catch (error) {
      this.logger.error(`Failed to generate snippet ${snippetPattern}`, error as Error);
      throw error;
    }
  }

  /**
   * Normalize language ID to our supported language suffix names (used in snippet IDs)
   */
  private normalizeLanguage(languageId: string): string {
    const languageMap: Record<string, string> = {
      'javascript': 'js',
      'javascriptreact': 'jsx',
      'typescript': 'ts',
      'typescriptreact': 'tsx',
      'python': 'python',
      'java': 'java',
      'go': 'go',
      'golang': 'go',
      'ruby': 'ruby',
    };
    
    return languageMap[languageId] || 'ts';
  }

  /**
   * Get available snippets for a language.
   */
  getAvailableSnippets(language: string): SnippetTemplate[] {
    return snippetTemplates.filter((s) => s.language.includes(language));
  }

  /**
   * Get all available snippets.
   */
  getAllSnippets(): SnippetTemplate[] {
    return snippetTemplates;
  }
}



