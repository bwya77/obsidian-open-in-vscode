# Open in VSCode Plugin for Obsidian

A powerful Obsidian plugin that seamlessly integrates with Visual Studio Code, allowing you to open files and code blocks with smart detection and customizable interface options.

## Features

### 🎯 **Smart Code Block Integration**
- **Clickable buttons** on every code block in Reading View
- **Intelligent detection**: File paths open actual files, code content creates temporary files
- **Language detection**: Automatically detects programming languages and applies proper file extensions (.js, .py, .java, etc.)

### ⚙️ **Highly Customizable**
- **Button positioning**: Choose left, center, or right placement
- **Visibility control**: Show buttons always or only on hover (like copy button)
- **Theme integration**: Native theme colors or accent colors
- **Path detection**: Supports absolute, relative, and home directory (~) paths

### 🚀 **Command Palette Integration**
- **Current file**: Open active file at exact cursor position
- **Quick access**: Available through Obsidian's command palette

## Usage

### Method 1: Code Block Buttons
**In Reading View**, every code block displays a "VSCode" button. Click it to:

**File paths automatically open the actual file:**
```
/Users/username/project/main.js
./src/components/App.tsx
~/Documents/scripts/script.py
file: src/utils/helper.ts
```

**Code snippets create temporary files with syntax highlighting:**
```javascript
function hello() {
    console.log("Hello World!");
}
```

```python
def calculate_fibonacci(n):
    if n <= 1:
        return n
    return calculate_fibonacci(n-1) + calculate_fibonacci(n-2)
```

### Method 2: Command Palette
1. Open any file in Obsidian
2. Press `Cmd/Ctrl + P` to open command palette
3. Search for "Open current file in VSCode"
4. File opens in VSCode at your current cursor position

## Settings

### Core Settings
- **Show code block buttons**: Enable/disable the code block integration
- **Custom VSCode Path**: Specify VSCode executable path if auto-detection fails

### Button Customization
- **Button position**: Left side, Center, or Right side
- **Show on hover only**: Hide buttons by default, show when hovering over code blocks
- **Use native theme colors**: Theme-appropriate styling (grey in light mode, dark colors in dark mode) vs accent colors

### Button Position Examples
- **Right**: Traditional top-right corner placement
- **Center**: Centered at top of code block (header-style)
- **Left**: Top-left with extra spacing below button

## Requirements

- **Visual Studio Code** must be installed and accessible
- **Desktop only** (mobile not supported)
- **VSCode CLI**: The `code` command should be in your PATH, or specify custom path in settings

### Setting up VSCode CLI (if needed)
**macOS/Linux:**
1. Open VSCode
2. Press `Cmd/Ctrl + Shift + P`
3. Search "Shell Command: Install 'code' command in PATH"
4. Click to install

**Windows:** Usually works automatically, or specify full path in plugin settings.

## Installation

### From Obsidian Community Plugins
1. Open Settings → Community plugins
2. Browse and search for "Open in VSCode"
3. Install and enable the plugin

### Manual Installation
1. Download the latest release files
2. Create folder: `[vault]/.obsidian/plugins/open-in-vscode/`
3. Copy `main.js`, `manifest.json`, and `styles.css` into the folder
4. Reload Obsidian and enable in Community plugins

### Development
```bash
# Clone and build
git clone [repository-url]
cd obsidian-open-in-vscode
npm install
npm run build

# For development with auto-reload
npm run dev
```

## Supported Languages

Auto-detected languages with proper file extensions:
- **JavaScript/TypeScript**: `.js`, `.ts`, `.jsx`, `.tsx`
- **Python**: `.py`
- **Java**: `.java`
- **C/C++**: `.c`, `.cpp`
- **C#**: `.cs`
- **Web**: `.html`, `.css`, `.scss`
- **Data**: `.json`, `.yaml`, `.xml`
- **Shell**: `.sh`, `.bash`
- **And many more...**

## Troubleshooting

### VSCode not found
1. **Install VSCode CLI**: Follow the requirements section above
2. **Custom path**: Use plugin settings to specify full path to VSCode executable
3. **Check PATH**: Ensure `code` command works in your terminal

### Buttons not showing
1. **Switch to Reading View**: Buttons only appear in Reading View, not Edit mode
2. **Check settings**: Ensure "Show code block buttons" is enabled
3. **Hover mode**: If enabled, buttons only appear when hovering over code blocks

### File paths not working
- **Relative paths**: Resolved relative to current note's directory
- **Absolute paths**: Must exist on your system
- **Home paths**: Use `~/` for home directory

## Contributing

Found a bug or have a feature request? Please open an issue on the GitHub repository.

## License

MIT License - feel free to modify and distribute.

---

**Author**: Bradley Wyatt  
**Version**: 1.0.0  
**Compatibility**: Obsidian 0.15.0+