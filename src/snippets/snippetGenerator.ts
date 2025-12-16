import * as vscode from 'vscode';
import type { Logger } from '../utils/logger';
import type { SnippetTemplate } from '../types';
import { snippetTemplates } from './snippetTemplates';


export class SnippetGenerator {
  constructor(private logger: Logger) {}

 
  async generateSnippet(snippetPattern: string, editor: vscode.TextEditor): Promise<void> {
    try {
      const languageId = editor.document.languageId;
      const language = this.normalizeLanguage(languageId);
      
      let template = snippetTemplates.find((s) => s.id === `${snippetPattern}-${language}`);
      
      if (!template) {
        template = snippetTemplates.find((s) => s.id === snippetPattern);
      }
      
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

 
  getAvailableSnippets(language: string): SnippetTemplate[] {
    return snippetTemplates.filter((s) => s.language.includes(language));
  }

  
  getAllSnippets(): SnippetTemplate[] {
    return snippetTemplates;
  }
}

