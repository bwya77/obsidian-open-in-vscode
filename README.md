# Open in VSCode Plugin for Obsidian

This plugin allows you to quickly open the current file in Visual Studio Code directly from Obsidian's command palette.

## Features

- **Command Palette**: Open the active file in VSCode with cursor positioning
- **Code Block Buttons**: Click buttons on code blocks to open them in VSCode
- **Smart Detection**: 
  - File paths → Opens the actual file
  - Code content → Creates temporary file with proper syntax highlighting
- **Language Detection**: Automatically detects language and uses appropriate file extensions
- **Button Positioning**: Choose left or right side positioning
- **Works in Reading View**: Buttons appear on all code blocks

## Usage

### Method 1: Command Palette
1. Open any file in Obsidian
2. Press `Cmd/Ctrl + P` to open the command palette
3. Search for "Open current file in VSCode"
4. Press Enter to open the file in VSCode

The plugin will open VSCode with the file and position the cursor at the same line you were viewing in Obsidian.

### Method 2: Code Block Buttons
**In Reading View**, every code block gets a "< > VSCode" button. Click it to:

**For file paths:**
```
/Users/username/project/main.js
./src/components/App.tsx
~/Documents/scripts/script.py
```

**For code snippets:**
```javascript
function hello() {
    console.log("Hello World!");
}
```

- **File paths**: Opens the actual file
- **Code content**: Creates a temporary file with proper syntax highlighting (.js, .py, .java, etc.)

## Requirements

- Visual Studio Code must be installed and accessible from the command line
- The `code` command should be available in your system PATH
- This plugin only works on desktop versions of Obsidian (not mobile)

## Installation

### Manual Installation

1. Download the latest release from the releases page
2. Create a new folder in your vault's `.obsidian/plugins/` directory called `open-in-vscode`
3. Copy `main.js` and `manifest.json` into this folder
4. Reload Obsidian
5. Enable the plugin in Settings > Community plugins

### Development

1. Clone this repository into your vault's `.obsidian/plugins/` folder
2. Run `npm install` to install dependencies
3. Run `npm run dev` for development with auto-reload
4. Run `npm run build` to create a production build

## License

MIT