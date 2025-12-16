import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import type { ProjectType } from './projectDetector';
import type { Logger } from './logger';

export interface InstallCommand {
  command: string;
  cwd: string;
  description: string;
}

/**
 * Handles SDK installation for different project types.
 */
export class SDKInstaller {
  constructor(private logger: Logger) {}

  /**
   * Get installation command for a project type
   */
  async getInstallCommand(projectType: ProjectType, rootPath: string): Promise<InstallCommand | null> {
    switch (projectType) {
      case 'node':
      case 'nextjs':
      case 'vue':
      case 'angular':
        return {
          command: 'npm install razorpay',
          cwd: rootPath,
          description: 'Installing Razorpay Node.js SDK...',
        };

      case 'react':
        // Check if react-razorpay is needed
        return {
          command: 'npm install react-razorpay',
          cwd: rootPath,
          description: 'Installing Razorpay React SDK...',
        };

      case 'python':
        return {
          command: 'pip install razorpay',
          cwd: rootPath,
          description: 'Installing Razorpay Python SDK...',
        };

      case 'php':
        return {
          command: 'composer require razorpay/razorpay:2.*',
          cwd: rootPath,
          description: 'Installing Razorpay PHP SDK...',
        };

      case 'ruby':
        return await this.getRubyInstallCommand(rootPath);

      case 'java':
        return await this.getJavaInstallCommand(rootPath);

      case 'go':
        return {
          command: 'go get github.com/razorpay/razorpay-go',
          cwd: rootPath,
          description: 'Installing Razorpay Go SDK...',
        };

      case 'flutter':
        return {
          command: 'flutter pub add razorpay_flutter',
          cwd: rootPath,
          description: 'Installing Razorpay Flutter SDK...',
        };

      case 'android':
        // Android requires manual Gradle configuration
        return null;

      case 'ios':
        // iOS requires manual Podfile configuration
        return null;

      case 'web':
        // Web uses CDN, no installation needed
        return null;

      default:
        return null;
    }
  }

  /**
   * Install SDK with user confirmation
   */
  async installSDK(projectType: ProjectType, rootPath: string): Promise<boolean> {
    const installCmd = await this.getInstallCommand(projectType, rootPath);

    if (!installCmd) {
      // Manual installation required
      return await this.handleManualInstallation(projectType, rootPath);
    }

    // Show confirmation dialog
    const confirm = await vscode.window.showInformationMessage(
      installCmd.description,
      'Install',
      'Cancel',
    );

    if (confirm !== 'Install') {
      return false;
    }

    try {
      this.logger.info(`Executing: ${installCmd.command} in ${installCmd.cwd}`);
      
      const terminal = vscode.window.createTerminal({
        name: 'Razorpay SDK Installation',
        cwd: installCmd.cwd,
      });

      terminal.sendText(installCmd.command);
      terminal.show();

      // Wait a bit and check if command succeeded
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.logger.info(`SDK installation command sent to terminal: ${installCmd.command}`);
      return true;
    } catch (error) {
      this.logger.error('Failed to install SDK', error as Error);
      vscode.window.showErrorMessage(`Failed to install SDK: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Handle manual installation (Android, iOS)
   */
  private async handleManualInstallation(projectType: ProjectType, rootPath: string): Promise<boolean> {
    if (projectType === 'android') {
      return await this.installAndroidSDK(rootPath);
    } else if (projectType === 'ios') {
      return await this.installIOSSDK(rootPath);
    }
    return false;
  }

  /**
   * Install Android SDK by modifying build.gradle
   */
  private async installAndroidSDK(rootPath: string): Promise<boolean> {
    const buildGradlePath = path.join(rootPath, 'app', 'build.gradle');
    const buildGradleKtsPath = path.join(rootPath, 'app', 'build.gradle.kts');
    
    let targetFile: string | null = null;
    if (await this.fileExists(buildGradlePath)) {
      targetFile = buildGradlePath;
    } else if (await this.fileExists(buildGradleKtsPath)) {
      targetFile = buildGradleKtsPath;
    } else {
      vscode.window.showErrorMessage('Could not find build.gradle or build.gradle.kts in app directory');
      return false;
    }

    const confirm = await vscode.window.showInformationMessage(
      'Android SDK requires adding dependency to build.gradle. Would you like to add it automatically?',
      'Add Dependency',
      'Cancel',
    );

    if (confirm !== 'Add Dependency') {
      return false;
    }

    try {
      const content = await fs.promises.readFile(targetFile, 'utf-8');
      
      // Check if already added
      if (content.includes('com.razorpay:razorpay-android')) {
        vscode.window.showInformationMessage('Razorpay Android SDK dependency already exists');
        return true;
      }

      // Add dependency
      const dependency = targetFile.endsWith('.kts')
        ? '    implementation("com.razorpay:razorpay-android:1.6.33")'
        : '    implementation \'com.razorpay:razorpay-android:1.6.33\'';

      // Find dependencies block
      if (content.includes('dependencies {')) {
        const newContent = content.replace(
          /(dependencies\s*\{)/,
          `$1\n${dependency}`,
        );
        await fs.promises.writeFile(targetFile, newContent, 'utf-8');
        vscode.window.showInformationMessage('Razorpay Android SDK dependency added to build.gradle');
        return true;
      } else {
        vscode.window.showWarningMessage('Could not find dependencies block. Please add manually.');
        return false;
      }
    } catch (error) {
      this.logger.error('Failed to add Android SDK dependency', error as Error);
      vscode.window.showErrorMessage('Failed to add Android SDK dependency');
      return false;
    }
  }

  /**
   * Install iOS SDK by modifying Podfile
   */
  private async installIOSSDK(rootPath: string): Promise<boolean> {
    const podfilePath = path.join(rootPath, 'Podfile');
    
    if (!(await this.fileExists(podfilePath))) {
      vscode.window.showErrorMessage('Could not find Podfile');
      return false;
    }

    const confirm = await vscode.window.showInformationMessage(
      'iOS SDK requires adding pod to Podfile. Would you like to add it automatically?',
      'Add Pod',
      'Cancel',
    );

    if (confirm !== 'Add Pod') {
      return false;
    }

    try {
      const content = await fs.promises.readFile(podfilePath, 'utf-8');
      
      // Check if already added
      if (content.includes('razorpay-pod') || content.includes('Razorpay')) {
        vscode.window.showInformationMessage('Razorpay iOS SDK pod already exists');
        return true;
      }

      // Add pod
      const podLine = "pod 'razorpay-pod', '~> 1.2.0'";
      
      // Find target block or add at end
      if (content.includes('target ')) {
        const newContent = content.replace(
          /(target\s+['"][^'"]+['"]\s+do)/,
          `$1\n  ${podLine}`,
        );
        await fs.promises.writeFile(podfilePath, newContent, 'utf-8');
        vscode.window.showInformationMessage('Razorpay iOS SDK pod added to Podfile. Run "pod install" in terminal.');
        
        // Offer to run pod install
        const runPodInstall = await vscode.window.showInformationMessage(
          'Would you like to run "pod install" now?',
          'Run pod install',
          'Later',
        );
        
        if (runPodInstall === 'Run pod install') {
          const terminal = vscode.window.createTerminal({
            name: 'Razorpay iOS Installation',
            cwd: rootPath,
          });
          terminal.sendText('pod install');
          terminal.show();
        }
        
        return true;
      } else {
        vscode.window.showWarningMessage('Could not find target block. Please add manually.');
        return false;
      }
    } catch (error) {
      this.logger.error('Failed to add iOS SDK pod', error as Error);
      vscode.window.showErrorMessage('Failed to add iOS SDK pod');
      return false;
    }
  }

  /**
   * Get Ruby installation command (may need to modify Gemfile)
   */
  private async getRubyInstallCommand(rootPath: string): Promise<InstallCommand | null> {
    const gemfilePath = path.join(rootPath, 'Gemfile');
    
    if (await this.fileExists(gemfilePath)) {
      // Check if already in Gemfile
      try {
        const content = await fs.promises.readFile(gemfilePath, 'utf-8');
        if (content.includes("gem 'razorpay'") || content.includes('gem "razorpay"')) {
          return {
            command: 'bundle install',
            cwd: rootPath,
            description: 'Installing Razorpay Ruby SDK (bundle install)...',
          };
        }
      } catch {
        // Continue to add gem
      }

      // Need to add gem first
      return {
        command: 'bundle add razorpay',
        cwd: rootPath,
        description: 'Adding and installing Razorpay Ruby SDK...',
      };
    }

    return {
      command: 'gem install razorpay',
      cwd: rootPath,
      description: 'Installing Razorpay Ruby SDK...',
    };
  }

  /**
   * Get Java installation command (may need to modify pom.xml or build.gradle)
   */
  private async getJavaInstallCommand(rootPath: string): Promise<InstallCommand | null> {
    const pomXmlPath = path.join(rootPath, 'pom.xml');
    const buildGradlePath = path.join(rootPath, 'build.gradle');
    const buildGradleKtsPath = path.join(rootPath, 'build.gradle.kts');

    if (await this.fileExists(pomXmlPath)) {
      // Maven project - need to add dependency manually
      return null;
    } else if (await this.fileExists(buildGradlePath) || await this.fileExists(buildGradleKtsPath)) {
      // Gradle project - can add via command or manually
      return null;
    }

    return null;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      const stats = await fs.promises.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }
}

