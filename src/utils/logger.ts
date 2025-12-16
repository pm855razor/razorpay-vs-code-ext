import * as vscode from 'vscode';

/**
 * Logger utility for centralized logging using VS Code output channel.
 */
export class Logger {
  private outputChannel: vscode.OutputChannel;

  constructor(channelName: string) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
  }

  /**
   * Log an info message.
   */
  info(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[INFO ${timestamp}] ${message}`);
  }

  /**
   * Log a warning message.
   */
  warn(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[WARN ${timestamp}] ${message}`);
  }

  /**
   * Log an error message.
   */
  error(message: string, error?: Error): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[ERROR ${timestamp}] ${message}`);
    if (error) {
      this.outputChannel.appendLine(`Error details: ${error.message}`);
      if (error.stack) {
        this.outputChannel.appendLine(`Stack trace: ${error.stack}`);
      }
    }
  }

  /**
   * Log a debug message.
   */
  debug(message: string): void {
    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[DEBUG ${timestamp}] ${message}`);
  }

  /**
   * Show the output channel.
   */
  show(): void {
    this.outputChannel.show();
  }

  /**
   * Dispose the logger.
   */
  dispose(): void {
    this.outputChannel.dispose();
  }
}

