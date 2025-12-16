/**
 * Snippet template structure.
 */
export interface SnippetTemplate {
  /** Unique identifier */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Category (payment, order, refund, etc.) */
  category: string;

  /** Supported languages */
  language: string[];

  /** Snippet body (VS Code snippet format) */
  body: string[];

  /** Prefix to trigger snippet */
  prefix: string;
}

