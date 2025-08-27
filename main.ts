import { MarkdownView, Notice, Plugin, PluginSettingTab, Setting, TFile, App } from 'obsidian';
import { exec } from 'child_process';
import { promisify } from 'util';
import { platform } from 'os';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

interface OpenInVSCodeSettings {
	customVSCodePath: string;
	backupVSCodePath: string;
	showCodeBlockButtons: boolean;
	buttonPosition: 'left' | 'right' | 'center';
	showOnHoverOnly: boolean;
	useNativeThemeColors: boolean;
}

const DEFAULT_SETTINGS: OpenInVSCodeSettings = {
	customVSCodePath: '',
	backupVSCodePath: '',
	showCodeBlockButtons: true,
	buttonPosition: 'right',
	showOnHoverOnly: false,
	useNativeThemeColors: true
}

export default class OpenInVSCodePlugin extends Plugin {
	settings: OpenInVSCodeSettings;

	async onload() {
		console.log('OpenInVSCode plugin loading...');
		await this.loadSettings();

		// Command to open current file
		this.addCommand({
			id: 'open-current-file-in-vscode',
			name: 'Open current file in VSCode',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				
				if (activeFile) {
					if (!checking) {
						this.openFileInVSCode(activeFile);
					}
					return true;
				}
				
				return false;
			}
		});

		// Command to open current file's folder in VSCode
		this.addCommand({
			id: 'open-current-folder-in-vscode',
			name: 'Open current folder in VSCode',
			checkCallback: (checking: boolean) => {
				const activeFile = this.app.workspace.getActiveFile();
				
				if (activeFile) {
					if (!checking) {
						this.openFolderInVSCode(activeFile);
					}
					return true;
				}
				
				return false;
			}
		});

		// Add settings tab
		this.addSettingTab(new OpenInVSCodeSettingTab(this.app, this));

		// Set up code block buttons for Reading View only
		console.log('Setting up code block buttons, enabled:', this.settings.showCodeBlockButtons);
		if (this.settings.showCodeBlockButtons) {
			this.registerMarkdownPostProcessor((element, context) => {
				console.log('Markdown post processor called');
				this.processCodeBlocksInElement(element);
			});
		}
	}

	processCodeBlocksInElement(element: HTMLElement) {
		const codeBlocks = element.querySelectorAll('pre');
		console.log('Found pre elements:', codeBlocks.length);
		
		codeBlocks.forEach((pre, index) => {
			// Skip if already processed
			if (pre.classList.contains('has-vscode-button')) {
				console.log(`Pre ${index} already has button`);
				return;
			}
			
			const code = pre.querySelector('code');
			if (!code) {
				console.log(`Pre ${index} has no code element`);
				return;
			}
			
			const text = code.textContent || '';
			console.log(`Pre ${index} text:`, text.substring(0, 100));
			
			// Add button to ALL code blocks (not just file paths)
			console.log(`Adding button to pre ${index}`);
			pre.classList.add('has-vscode-button');
			
			// Create button wrapper
			const wrapper = document.createElement('div');
			let wrapperClasses = ['vscode-button-wrapper'];
			
			// Add hover-only class if enabled
			if (this.settings.showOnHoverOnly) {
				wrapperClasses.push('vscode-hover-only');
			}
			
			wrapper.className = wrapperClasses.join(' ');
			wrapper.style.position = 'absolute';
			wrapper.style.top = '8px';
			wrapper.style.zIndex = '10';
			
			// Position based on setting
			if (this.settings.buttonPosition === 'left') {
				wrapper.style.left = '8px';
				wrapper.style.right = 'unset';
				wrapper.style.transform = 'unset';
			} else if (this.settings.buttonPosition === 'center') {
				wrapper.style.left = '50%';
				wrapper.style.right = 'unset';
				wrapper.style.transform = 'translateX(-50%)';
			} else {
				wrapper.style.right = '8px';
				wrapper.style.left = 'unset';
				wrapper.style.transform = 'unset';
			}
			
			// Create button
			const button = this.createVSCodeButton();
			
			button.addEventListener('click', async (e) => {
				e.preventDefault();
				e.stopPropagation();
				console.log('Reading view button clicked!');
				
				// Try to detect file path first
				const filePath = this.detectFilePath(text);
				if (filePath) {
					console.log('File path detected:', filePath);
					new Notice(`Opening file: ${path.basename(filePath)}`);
					const activeFile = this.app.workspace.getActiveFile();
					this.openPathInVSCode(filePath, activeFile ? activeFile.path : '');
				} else {
					// Create temp file with code block content
					console.log('No file path detected, creating temp file with code');
					await this.openCodeBlockInVSCode(text, pre);
				}
			});
			
			wrapper.appendChild(button);
			
			// Make sure pre is positioned relative
			pre.style.position = 'relative';
			
			// Add data attribute for CSS positioning
			pre.setAttribute('data-button-position', this.settings.buttonPosition);
			
			// Add wrapper to pre
			pre.appendChild(wrapper);
			console.log(`Button added to pre ${index}`);
		});
	}

	createVSCodeButton(): HTMLButtonElement {
		const button = document.createElement('button');
		let buttonClasses = ['vscode-open-button'];
		
		// Add theme class based on setting
		if (this.settings.useNativeThemeColors) {
			buttonClasses.push('vscode-native-theme');
		} else {
			buttonClasses.push('vscode-accent-theme');
		}
		
		button.className = buttonClasses.join(' ');
		button.textContent = 'VSCode';
		button.title = 'Open code block in VSCode';
		
		return button;
	}

	async openCodeBlockInVSCode(codeText: string, preElement: HTMLElement) {
		try {
			// Detect language from code block class or pre element
			const language = this.detectLanguage(preElement);
			console.log('Detected language:', language);
			
			// Create temp file with appropriate extension
			const tempDir = require('os').tmpdir();
			const timestamp = Date.now();
			const extension = this.getFileExtension(language);
			const tempFileName = `obsidian-code-${timestamp}${extension}`;
			const tempFilePath = path.join(tempDir, tempFileName);
			
			// Write code content to temp file
			fs.writeFileSync(tempFilePath, codeText, 'utf8');
			console.log('Created temp file:', tempFilePath);
			
			// Open in VSCode
			const vscodeCommand = await this.getVSCodeCommand();
			const command = `"${vscodeCommand}" "${tempFilePath}"`;
			
			const { exec } = require('child_process');
			exec(command, { shell: true }, (error: any) => {
				if (error) {
					console.error('Error opening temp file in VSCode:', error);
					new Notice('Failed to open code block in VSCode');
					// Clean up temp file on error
					try {
						fs.unlinkSync(tempFilePath);
					} catch (e) {
						console.error('Failed to clean up temp file:', e);
					}
				} else {
					new Notice(`Opening code block in VSCode (${language || 'text'})`);
					
					// Clean up temp file after a delay (give VSCode time to read it)
					setTimeout(() => {
						try {
							fs.unlinkSync(tempFilePath);
							console.log('Cleaned up temp file:', tempFilePath);
						} catch (e) {
							console.error('Failed to clean up temp file:', e);
						}
					}, 5000); // 5 second delay
				}
			});
			
		} catch (error) {
			console.error('Error creating temp file:', error);
			new Notice('Failed to create temporary file');
		}
	}

	detectLanguage(preElement: HTMLElement): string | null {
		// Check for language class on code element
		const codeElement = preElement.querySelector('code');
		if (codeElement) {
			// Look for language-* or lang-* classes
			const classList = Array.from(codeElement.classList);
			for (const className of classList) {
				if (className.startsWith('language-')) {
					return className.replace('language-', '');
				}
				if (className.startsWith('lang-')) {
					return className.replace('lang-', '');
				}
			}
		}
		
		// Check for data attributes
		const lang = preElement.getAttribute('data-lang') || 
					 preElement.getAttribute('data-language') ||
					 codeElement?.getAttribute('data-lang') ||
					 codeElement?.getAttribute('data-language');
		
		if (lang) return lang;
		
		// Fallback: try to detect from content patterns
		const code = codeElement?.textContent || '';
		if (code.includes('function ') || code.includes('const ') || code.includes('let ')) {
			return 'javascript';
		}
		if (code.includes('def ') || code.includes('import ') && code.includes('from ')) {
			return 'python';
		}
		if (code.includes('public class ') || code.includes('System.out.')) {
			return 'java';
		}
		if (code.includes('#include') || code.includes('int main(')) {
			return 'cpp';
		}
		
		return null;
	}

	getFileExtension(language: string | null): string {
		if (!language) return '.txt';
		
		const extensionMap: {[key: string]: string} = {
			'javascript': '.js',
			'js': '.js',
			'typescript': '.ts',
			'ts': '.ts',
			'python': '.py',
			'py': '.py',
			'java': '.java',
			'cpp': '.cpp',
			'c++': '.cpp',
			'c': '.c',
			'csharp': '.cs',
			'cs': '.cs',
			'php': '.php',
			'ruby': '.rb',
			'go': '.go',
			'rust': '.rs',
			'swift': '.swift',
			'kotlin': '.kt',
			'scala': '.scala',
			'html': '.html',
			'css': '.css',
			'scss': '.scss',
			'sass': '.sass',
			'json': '.json',
			'xml': '.xml',
			'yaml': '.yaml',
			'yml': '.yml',
			'toml': '.toml',
			'sql': '.sql',
			'sh': '.sh',
			'bash': '.sh',
			'zsh': '.sh',
			'powershell': '.ps1',
			'dockerfile': '.dockerfile',
			'markdown': '.md',
			'md': '.md'
		};
		
		return extensionMap[language.toLowerCase()] || '.txt';
	}

	detectFilePath(text: string): string | null {
		const lines = text.split('\n');
		
		// Pattern for file paths with extensions
		const filePathPattern = /^([~./\\]|[a-zA-Z]:)[^\s]+\.[a-zA-Z0-9]+$/;
		
		// Check each line for a file path
		for (const line of lines) {
			const trimmedLine = line.trim();
			
			// Direct file path
			if (filePathPattern.test(trimmedLine)) {
				return trimmedLine;
			}
			
			// File reference patterns (file: or @file)
			const fileRefMatch = trimmedLine.match(/^(?:file:|@file\s+)(.+)$/);
			if (fileRefMatch && fileRefMatch[1]) {
				return fileRefMatch[1].trim();
			}
		}
		
		// Also check if the entire block is just a file path (single line)
		const singleLineTrimmed = text.trim();
		if (filePathPattern.test(singleLineTrimmed)) {
			return singleLineTrimmed;
		}
		
		return null;
	}

	async openPathInVSCode(filePath: string, contextPath: string) {
		try {
			const adapter = this.app.vault.adapter as any;
			const vaultPath = adapter.basePath || adapter.path || '';
			let fullPath: string;
			
			// Handle different path types
			if (path.isAbsolute(filePath)) {
				// Absolute path
				fullPath = filePath;
			} else if (filePath.startsWith('~')) {
				// Home directory path
				const homedir = process.env.HOME || process.env.USERPROFILE || '';
				fullPath = path.join(homedir, filePath.slice(1));
			} else {
				// Relative path - resolve relative to the current note's directory
				if (contextPath) {
					const currentFile = this.app.vault.getAbstractFileByPath(contextPath);
					if (currentFile && currentFile.parent) {
						// Get the directory of the current note
						const currentDir = currentFile.parent.path;
						// Resolve the path relative to current note's directory
						const relativePath = path.join(currentDir, filePath);
						fullPath = path.join(vaultPath, relativePath);
					} else {
						// Fallback to vault root
						fullPath = path.join(vaultPath, filePath);
					}
				} else {
					// No context, assume relative to vault root
					fullPath = path.join(vaultPath, filePath);
				}
			}

			// Get VSCode command
			const vscodeCommand = await this.getVSCodeCommand();
			const command = `"${vscodeCommand}" "${fullPath}"`;
			
			// Execute command
			const { exec } = require('child_process');
			exec(command, { shell: true }, (error: any) => {
				if (error) {
					console.error('Error opening file in VSCode:', error);
					
					if (error.message.includes('command not found') || error.message.includes('is not recognized')) {
						new Notice('VSCode not found! Please configure the path in plugin settings.');
					} else if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
						new Notice(`File not found: ${filePath}`);
					} else {
						new Notice(`Failed to open file: ${error.message}`);
					}
				} else {
					new Notice(`Opening ${path.basename(fullPath)} in VSCode`);
				}
			});
		} catch (error) {
			console.error('Error opening path in VSCode:', error);
			new Notice(`Failed to open in VSCode: ${error.message}`);
		}
	}

	async getVSCodeCommand(): Promise<string> {
		// Try custom path first, then backup path
		const pathsToTry = [
			this.settings.customVSCodePath,
			this.settings.backupVSCodePath
		].filter(path => path.trim() !== '');
		
		// Test user-provided paths first
		for (const customPath of pathsToTry) {
			try {
				await execAsync(`"${customPath}" --version`);
				console.log('Using custom VSCode path:', customPath);
				return customPath;
			} catch (e) {
				console.log('Custom VSCode path failed:', customPath);
				continue;
			}
		}
		
		// If custom paths failed, fall back to auto-detection
		console.log('Custom paths failed, trying auto-detection');
		if (this.settings.customVSCodePath || this.settings.backupVSCodePath) {
			// User provided custom paths but they failed, still try auto-detection as last resort
		}

		const os = platform();
		
		// Try common VSCode paths based on OS
		const vscodeCommands = ['code'];
		
		if (os === 'darwin') {
			// macOS specific paths
			vscodeCommands.push(
				'/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
				'/usr/local/bin/code',
				'~/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code',
				'/opt/homebrew/bin/code'
			);
		} else if (os === 'win32') {
			// Windows specific paths
			vscodeCommands.push(
				'code.cmd',
				'"%LOCALAPPDATA%\\Programs\\Microsoft VS Code\\bin\\code.cmd"',
				'"%ProgramFiles%\\Microsoft VS Code\\bin\\code.cmd"'
			);
		} else {
			// Linux paths
			vscodeCommands.push(
				'/usr/bin/code',
				'/snap/bin/code',
				'/usr/share/code/bin/code'
			);
		}

		// Test each command to see which one works
		for (const cmd of vscodeCommands) {
			try {
				await execAsync(`${cmd} --version`);
				return cmd;
			} catch (e) {
				// This command didn't work, try the next one
				continue;
			}
		}

		// If nothing worked, return the default and let it fail with a helpful message
		return 'code';
	}

	async openFileInVSCode(file: TFile) {
		try {
			const adapter = this.app.vault.adapter as any;
			const basePath = adapter.basePath || adapter.path || '';
			const filePath = `${basePath}/${file.path}`;
			
			const lineNumber = this.getActiveLineNumber();
			const vscodeCommand = await this.getVSCodeCommand();
			
			let command: string;
			if (lineNumber > 0) {
				command = `"${vscodeCommand}" --goto "${filePath}:${lineNumber}"`;
			} else {
				command = `"${vscodeCommand}" "${filePath}"`;
			}
			
			// Use shell: true to ensure proper command expansion on all platforms
			const { exec } = require('child_process');
			exec(command, { shell: true }, (error: any) => {
				if (error) {
					console.error('Error opening file in VSCode:', error);
					
					// Provide helpful error message
					if (error.message.includes('command not found') || error.message.includes('is not recognized')) {
						new Notice('VSCode not found! Please install VSCode or configure the path in plugin settings.');
						
						// Open settings tab
						(this.app as any).setting.open();
						(this.app as any).setting.openTabById(this.manifest.id);
					} else {
						new Notice(`Failed to open file in VSCode: ${error.message}`);
					}
				} else {
					new Notice(`Opening ${file.name} in VSCode`);
				}
			});
		} catch (error) {
			console.error('Error opening file in VSCode:', error);
			new Notice(`Failed to open file in VSCode: ${error.message}`);
		}
	}

	async openFolderInVSCode(file: TFile) {
		try {
			const adapter = this.app.vault.adapter as any;
			const basePath = adapter.basePath || adapter.path || '';
			let folderPath: string;
			
			// Get the folder containing the file
			if (file.parent) {
				// File is in a subfolder
				folderPath = `${basePath}/${file.parent.path}`;
			} else {
				// File is in root, open the vault root
				folderPath = basePath;
			}
			
			const vscodeCommand = await this.getVSCodeCommand();
			const command = `"${vscodeCommand}" "${folderPath}"`;
			
			// Use shell: true to ensure proper command expansion on all platforms
			const { exec } = require('child_process');
			exec(command, { shell: true }, (error: any) => {
				if (error) {
					console.error('Error opening folder in VSCode:', error);
					
					// Provide helpful error message
					if (error.message.includes('command not found') || error.message.includes('is not recognized')) {
						new Notice('VSCode not found! Please install VSCode or configure the path in plugin settings.');
						
						// Open settings tab
						(this.app as any).setting.open();
						(this.app as any).setting.openTabById(this.manifest.id);
					} else {
						new Notice(`Failed to open folder in VSCode: ${error.message}`);
					}
				} else {
					const folderName = file.parent ? file.parent.name : 'Vault Root';
					new Notice(`Opening folder "${folderName}" in VSCode`);
				}
			});
		} catch (error) {
			console.error('Error opening folder in VSCode:', error);
			new Notice(`Failed to open folder in VSCode: ${error.message}`);
		}
	}

	getActiveLineNumber(): number {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		
		if (activeView && activeView.editor) {
			const cursor = activeView.editor.getCursor();
			return cursor.line + 1;
		}
		
		return 0;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	onunload() {
		console.log('OpenInVSCode plugin unloaded');
	}
}

class OpenInVSCodeSettingTab extends PluginSettingTab {
	plugin: OpenInVSCodePlugin;

	constructor(app: App, plugin: OpenInVSCodePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		const os = platform();
		
		// Primary VSCode path setting with OS-specific instructions
		let primaryPathDesc = 'Full path to VSCode executable (leave empty for auto-detection). ';
		if (os === 'darwin') {
			primaryPathDesc += 'To find your path, run: which code';
		} else if (os === 'win32') {
			primaryPathDesc += 'To find your path, run: where code';
		} else {
			primaryPathDesc += 'To find your path, run: which code';
		}

		new Setting(containerEl)
			.setName('Primary VSCode Path')
			.setDesc(primaryPathDesc)
			.addText(text => text
				.setPlaceholder('Leave empty to auto-detect')
				.setValue(this.plugin.settings.customVSCodePath)
				.onChange(async (value) => {
					this.plugin.settings.customVSCodePath = value;
					await this.plugin.saveSettings();
				}));

		// Backup VSCode path setting
		new Setting(containerEl)
			.setName('Backup VSCode Path')
			.setDesc('Alternative VSCode path to try if the primary path fails')
			.addText(text => text
				.setPlaceholder('Optional backup path')
				.setValue(this.plugin.settings.backupVSCodePath)
				.onChange(async (value) => {
					this.plugin.settings.backupVSCodePath = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Show code block buttons')
			.setDesc('Display "Open in VSCode" buttons on code blocks in Reading View')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showCodeBlockButtons)
				.onChange(async (value) => {
					this.plugin.settings.showCodeBlockButtons = value;
					await this.plugin.saveSettings();
					new Notice('Please reload Obsidian for this change to take effect');
				}));

		new Setting(containerEl)
			.setName('Button position')
			.setDesc('Choose where buttons appear on code blocks')
			.addDropdown(dropdown => dropdown
				.addOption('right', 'Right side')
				.addOption('center', 'Center')
				.addOption('left', 'Left side')
				.setValue(this.plugin.settings.buttonPosition)
				.onChange(async (value: 'left' | 'right' | 'center') => {
					this.plugin.settings.buttonPosition = value;
					await this.plugin.saveSettings();
					new Notice('Please reload Obsidian for this change to take effect');
				}));

		new Setting(containerEl)
			.setName('Show button on hover only')
			.setDesc('Hide button by default and only show when hovering over code blocks (like the copy button)')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showOnHoverOnly)
				.onChange(async (value) => {
					this.plugin.settings.showOnHoverOnly = value;
					await this.plugin.saveSettings();
					new Notice('Please reload Obsidian for this change to take effect');
				}));

		new Setting(containerEl)
			.setName('Use native theme colors')
			.setDesc('Use theme-appropriate colors (grey in light mode, dark in dark mode) instead of accent color')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useNativeThemeColors)
				.onChange(async (value) => {
					this.plugin.settings.useNativeThemeColors = value;
					await this.plugin.saveSettings();
					new Notice('Please reload Obsidian for this change to take effect');
				}));
	}
}