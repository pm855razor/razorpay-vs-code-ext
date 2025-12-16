import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export type ProjectType = 
  | 'web'           // Plain HTML/JS
  | 'react'         // React project
  | 'nextjs'        // Next.js project
  | 'vue'           // Vue.js project
  | 'angular'       // Angular project
  | 'android'       // Android native
  | 'ios'           // iOS native
  | 'flutter'       // Flutter project
  | 'node'          // Node.js server
  | 'python'        // Python server
  | 'php'           // PHP server
  | 'ruby'          // Ruby server
  | 'java'          // Java server
  | 'go'            // Go server
  | 'unknown';      // Unknown project type

export interface ProjectInfo {
  type: ProjectType;
  rootPath: string;
  hasSDK: boolean;
  sdkPackage?: string;
}

/**
 * Detects the project type and checks if Razorpay SDK is already installed.
 */
export class ProjectDetector {
  /**
   * Detect project type from workspace
   */
  static async detectProject(workspaceFolder?: vscode.WorkspaceFolder): Promise<ProjectInfo> {
    const rootPath = workspaceFolder?.uri.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    
    if (!rootPath) {
      return {
        type: 'unknown',
        rootPath: '',
        hasSDK: false,
      };
    }

    // Check for Flutter
    if (await this.isFlutterProject(rootPath)) {
      return {
        type: 'flutter',
        rootPath,
        hasSDK: await this.hasFlutterSDK(rootPath),
        sdkPackage: 'razorpay_flutter',
      };
    }

    // Check for Android
    if (await this.isAndroidProject(rootPath)) {
      return {
        type: 'android',
        rootPath,
        hasSDK: await this.hasAndroidSDK(rootPath),
        sdkPackage: 'com.razorpay:razorpay-android',
      };
    }

    // Check for iOS
    if (await this.isIOSProject(rootPath)) {
      return {
        type: 'ios',
        rootPath,
        hasSDK: await this.hasIOSSDK(rootPath),
        sdkPackage: 'razorpay-pod',
      };
    }

    // Check for Next.js
    if (await this.isNextJSProject(rootPath)) {
      return {
        type: 'nextjs',
        rootPath,
        hasSDK: await this.hasNodeSDK(rootPath),
        sdkPackage: 'razorpay',
      };
    }

    // Check for React
    if (await this.isReactProject(rootPath)) {
      return {
        type: 'react',
        rootPath,
        hasSDK: await this.hasNodeSDK(rootPath) || await this.hasReactRazorpaySDK(rootPath),
        sdkPackage: 'react-razorpay',
      };
    }

    // Check for Vue
    if (await this.isVueProject(rootPath)) {
      return {
        type: 'vue',
        rootPath,
        hasSDK: await this.hasNodeSDK(rootPath),
        sdkPackage: 'razorpay',
      };
    }

    // Check for Angular
    if (await this.isAngularProject(rootPath)) {
      return {
        type: 'angular',
        rootPath,
        hasSDK: await this.hasNodeSDK(rootPath),
        sdkPackage: 'razorpay',
      };
    }

    // Check for Node.js server
    if (await this.isNodeProject(rootPath)) {
      return {
        type: 'node',
        rootPath,
        hasSDK: await this.hasNodeSDK(rootPath),
        sdkPackage: 'razorpay',
      };
    }

    // Check for Python server
    if (await this.isPythonProject(rootPath)) {
      return {
        type: 'python',
        rootPath,
        hasSDK: await this.hasPythonSDK(rootPath),
        sdkPackage: 'razorpay',
      };
    }

    // Check for PHP server
    if (await this.isPHPProject(rootPath)) {
      return {
        type: 'php',
        rootPath,
        hasSDK: await this.hasPHPSDK(rootPath),
        sdkPackage: 'razorpay/razorpay',
      };
    }

    // Check for Ruby server
    if (await this.isRubyProject(rootPath)) {
      return {
        type: 'ruby',
        rootPath,
        hasSDK: await this.hasRubySDK(rootPath),
        sdkPackage: 'razorpay',
      };
    }

    // Check for Java server
    if (await this.isJavaProject(rootPath)) {
      return {
        type: 'java',
        rootPath,
        hasSDK: await this.hasJavaSDK(rootPath),
        sdkPackage: 'com.razorpay:razorpay-java',
      };
    }

    // Check for Go server
    if (await this.isGoProject(rootPath)) {
      return {
        type: 'go',
        rootPath,
        hasSDK: await this.hasGoSDK(rootPath),
        sdkPackage: 'github.com/razorpay/razorpay-go',
      };
    }

    // Check for generic web project (HTML/JS)
    if (await this.isWebProject(rootPath)) {
      return {
        type: 'web',
        rootPath,
        hasSDK: false, // Web uses CDN, no package to check
        sdkPackage: undefined,
      };
    }

    return {
      type: 'unknown',
      rootPath,
      hasSDK: false,
    };
  }

  // Detection methods
  private static async isFlutterProject(rootPath: string): Promise<boolean> {
    const pubspecPath = path.join(rootPath, 'pubspec.yaml');
    const libPath = path.join(rootPath, 'lib');
    return (await this.fileExists(pubspecPath)) && (await this.directoryExists(libPath));
  }

  private static async isAndroidProject(rootPath: string): Promise<boolean> {
    const buildGradle = path.join(rootPath, 'build.gradle');
    const buildGradleKts = path.join(rootPath, 'build.gradle.kts');
    const androidManifest = path.join(rootPath, 'AndroidManifest.xml');
    const appDir = path.join(rootPath, 'app');
    
    return (
      (await this.fileExists(buildGradle)) ||
      (await this.fileExists(buildGradleKts)) ||
      (await this.fileExists(androidManifest)) ||
      (await this.directoryExists(appDir))
    );
  }

  private static async isIOSProject(rootPath: string): Promise<boolean> {
    const podfile = path.join(rootPath, 'Podfile');
    const xcodeproj = await this.findFile(rootPath, '.xcodeproj');
    const infoPlist = path.join(rootPath, 'Info.plist');
    const iosDir = path.join(rootPath, 'ios');
    
    return (
      (await this.fileExists(podfile)) ||
      xcodeproj !== null ||
      (await this.fileExists(infoPlist)) ||
      (await this.directoryExists(iosDir))
    );
  }

  private static async isNextJSProject(rootPath: string): Promise<boolean> {
    const packageJson = path.join(rootPath, 'package.json');
    if (await this.fileExists(packageJson)) {
      try {
        const content = await fs.promises.readFile(packageJson, 'utf-8');
        const pkg = JSON.parse(content);
        return !!(pkg.dependencies?.['next'] || pkg.devDependencies?.['next']);
      } catch {
        return false;
      }
    }
    return false;
  }

  private static async isReactProject(rootPath: string): Promise<boolean> {
    const packageJson = path.join(rootPath, 'package.json');
    if (await this.fileExists(packageJson)) {
      try {
        const content = await fs.promises.readFile(packageJson, 'utf-8');
        const pkg = JSON.parse(content);
        return !!(pkg.dependencies?.['react'] || pkg.devDependencies?.['react']);
      } catch {
        return false;
      }
    }
    return false;
  }

  private static async isVueProject(rootPath: string): Promise<boolean> {
    const packageJson = path.join(rootPath, 'package.json');
    if (await this.fileExists(packageJson)) {
      try {
        const content = await fs.promises.readFile(packageJson, 'utf-8');
        const pkg = JSON.parse(content);
        return !!(pkg.dependencies?.['vue'] || pkg.devDependencies?.['vue']);
      } catch {
        return false;
      }
    }
    return false;
  }

  private static async isAngularProject(rootPath: string): Promise<boolean> {
    const packageJson = path.join(rootPath, 'package.json');
    const angularJson = path.join(rootPath, 'angular.json');
    if (await this.fileExists(packageJson)) {
      try {
        const content = await fs.promises.readFile(packageJson, 'utf-8');
        const pkg = JSON.parse(content);
        return !!(pkg.dependencies?.['@angular/core'] || await this.fileExists(angularJson));
      } catch {
        return false;
      }
    }
    return false;
  }

  private static async isNodeProject(rootPath: string): Promise<boolean> {
    const packageJson = path.join(rootPath, 'package.json');
    return await this.fileExists(packageJson);
  }

  private static async isPythonProject(rootPath: string): Promise<boolean> {
    const requirementsTxt = path.join(rootPath, 'requirements.txt');
    const setupPy = path.join(rootPath, 'setup.py');
    const pyProjectToml = path.join(rootPath, 'pyproject.toml');
    return (
      (await this.fileExists(requirementsTxt)) ||
      (await this.fileExists(setupPy)) ||
      (await this.fileExists(pyProjectToml))
    );
  }

  private static async isPHPProject(rootPath: string): Promise<boolean> {
    const composerJson = path.join(rootPath, 'composer.json');
    return await this.fileExists(composerJson);
  }

  private static async isRubyProject(rootPath: string): Promise<boolean> {
    const gemfile = path.join(rootPath, 'Gemfile');
    return await this.fileExists(gemfile);
  }

  private static async isJavaProject(rootPath: string): Promise<boolean> {
    const pomXml = path.join(rootPath, 'pom.xml');
    const buildGradle = path.join(rootPath, 'build.gradle');
    const buildGradleKts = path.join(rootPath, 'build.gradle.kts');
    return (
      (await this.fileExists(pomXml)) ||
      (await this.fileExists(buildGradle)) ||
      (await this.fileExists(buildGradleKts))
    );
  }

  private static async isGoProject(rootPath: string): Promise<boolean> {
    const goMod = path.join(rootPath, 'go.mod');
    return await this.fileExists(goMod);
  }

  private static async isWebProject(rootPath: string): Promise<boolean> {
    const htmlFiles = await this.findFiles(rootPath, '*.html');
    const jsFiles = await this.findFiles(rootPath, '*.js');
    return htmlFiles.length > 0 || jsFiles.length > 0;
  }

  // SDK detection methods
  private static async hasNodeSDK(rootPath: string): Promise<boolean> {
    const packageJson = path.join(rootPath, 'package.json');
    if (await this.fileExists(packageJson)) {
      try {
        const content = await fs.promises.readFile(packageJson, 'utf-8');
        const pkg = JSON.parse(content);
        return !!(pkg.dependencies?.['razorpay'] || pkg.devDependencies?.['razorpay']);
      } catch {
        return false;
      }
    }
    return false;
  }

  private static async hasReactRazorpaySDK(rootPath: string): Promise<boolean> {
    const packageJson = path.join(rootPath, 'package.json');
    if (await this.fileExists(packageJson)) {
      try {
        const content = await fs.promises.readFile(packageJson, 'utf-8');
        const pkg = JSON.parse(content);
        return !!(pkg.dependencies?.['react-razorpay'] || pkg.devDependencies?.['react-razorpay']);
      } catch {
        return false;
      }
    }
    return false;
  }

  private static async hasFlutterSDK(rootPath: string): Promise<boolean> {
    const pubspecPath = path.join(rootPath, 'pubspec.yaml');
    if (await this.fileExists(pubspecPath)) {
      try {
        const content = await fs.promises.readFile(pubspecPath, 'utf-8');
        return content.includes('razorpay_flutter');
      } catch {
        return false;
      }
    }
    return false;
  }

  private static async hasAndroidSDK(rootPath: string): Promise<boolean> {
    const buildGradle = path.join(rootPath, 'app', 'build.gradle');
    const buildGradleKts = path.join(rootPath, 'app', 'build.gradle.kts');
    
    const filesToCheck = [buildGradle, buildGradleKts];
    for (const file of filesToCheck) {
      if (await this.fileExists(file)) {
        try {
          const content = await fs.promises.readFile(file, 'utf-8');
          return content.includes('com.razorpay:razorpay-android');
        } catch {
          // Continue to next file
        }
      }
    }
    return false;
  }

  private static async hasIOSSDK(rootPath: string): Promise<boolean> {
    const podfile = path.join(rootPath, 'Podfile');
    if (await this.fileExists(podfile)) {
      try {
        const content = await fs.promises.readFile(podfile, 'utf-8');
        return content.includes('razorpay-pod') || content.includes('Razorpay');
      } catch {
        return false;
      }
    }
    return false;
  }

  private static async hasPythonSDK(rootPath: string): Promise<boolean> {
    const requirementsTxt = path.join(rootPath, 'requirements.txt');
    if (await this.fileExists(requirementsTxt)) {
      try {
        const content = await fs.promises.readFile(requirementsTxt, 'utf-8');
        return content.includes('razorpay');
      } catch {
        return false;
      }
    }
    return false;
  }

  private static async hasPHPSDK(rootPath: string): Promise<boolean> {
    const composerJson = path.join(rootPath, 'composer.json');
    if (await this.fileExists(composerJson)) {
      try {
        const content = await fs.promises.readFile(composerJson, 'utf-8');
        const pkg = JSON.parse(content);
        return !!(pkg.require?.['razorpay/razorpay'] || pkg['require-dev']?.['razorpay/razorpay']);
      } catch {
        return false;
      }
    }
    return false;
  }

  private static async hasRubySDK(rootPath: string): Promise<boolean> {
    const gemfile = path.join(rootPath, 'Gemfile');
    if (await this.fileExists(gemfile)) {
      try {
        const content = await fs.promises.readFile(gemfile, 'utf-8');
        return content.includes("gem 'razorpay'") || content.includes('gem "razorpay"');
      } catch {
        return false;
      }
    }
    return false;
  }

  private static async hasJavaSDK(rootPath: string): Promise<boolean> {
    const pomXml = path.join(rootPath, 'pom.xml');
    const buildGradle = path.join(rootPath, 'build.gradle');
    const buildGradleKts = path.join(rootPath, 'build.gradle.kts');
    
    const filesToCheck = [pomXml, buildGradle, buildGradleKts];
    for (const file of filesToCheck) {
      if (await this.fileExists(file)) {
        try {
          const content = await fs.promises.readFile(file, 'utf-8');
          return content.includes('razorpay-java') || content.includes('com.razorpay');
        } catch {
          // Continue to next file
        }
      }
    }
    return false;
  }

  private static async hasGoSDK(rootPath: string): Promise<boolean> {
    const goMod = path.join(rootPath, 'go.mod');
    if (await this.fileExists(goMod)) {
      try {
        const content = await fs.promises.readFile(goMod, 'utf-8');
        return content.includes('razorpay-go');
      } catch {
        return false;
      }
    }
    return false;
  }

  // Helper methods
  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      const stats = await fs.promises.stat(filePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  private static async directoryExists(dirPath: string): Promise<boolean> {
    try {
      await fs.promises.access(dirPath);
      const stats = await fs.promises.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  private static async findFile(rootPath: string, pattern: string): Promise<string | null> {
    try {
      const files = await fs.promises.readdir(rootPath);
      for (const file of files) {
        if (file.includes(pattern)) {
          return path.join(rootPath, file);
        }
      }
    } catch {
      // Ignore errors
    }
    return null;
  }

  private static async findFiles(rootPath: string, pattern: string): Promise<string[]> {
    const results: string[] = [];
    try {
      const files = await fs.promises.readdir(rootPath);
      for (const file of files) {
        if (file.match(pattern.replace('*', '.*'))) {
          results.push(path.join(rootPath, file));
        }
      }
    } catch {
      // Ignore errors
    }
    return results;
  }
}

