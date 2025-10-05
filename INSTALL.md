# Installation Guide

## Prerequisites

This package uses `sqlite3`, which is a native Node.js module that requires compilation. You have two options:

### Option 1: Install Build Tools (Recommended)

Install the necessary build tools on your system:

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y build-essential python3
```

**CentOS/RHEL:**
```bash
sudo yum groupinstall "Development Tools"
sudo yum install python3
```

**macOS:**
```bash
xcode-select --install
```

**Windows:**
```bash
npm install --global windows-build-tools
```

### Option 2: Use Prebuilt Binaries

The `sqlite3` package provides prebuilt binaries for common platforms. If you're on a supported platform, installation should work automatically.

## Installation

### Global Installation (Use anywhere)

```bash
npm install -g git+https://github.com/Fanom2813/mcp-sqlite-readonly.git
```

### Local Installation (Project-specific)

```bash
npm install git+https://github.com/Fanom2813/mcp-sqlite-readonly.git
```

### Direct Clone and Use

```bash
git clone https://github.com/Fanom2813/mcp-sqlite-readonly.git
cd mcp-sqlite-readonly
npm install
```

## Troubleshooting

### Error: `spawn sh ENOENT`

This means the build tools are not installed. Install them using the commands above.

### Error: `node-gyp not found`

Install node-gyp globally:
```bash
npm install -g node-gyp
```

### Still Having Issues?

Try rebuilding sqlite3 manually:
```bash
npm rebuild sqlite3 --build-from-source
```

Or use the prebuilt binary:
```bash
npm rebuild sqlite3
```

## Usage in MCP Clients

After installation, add to your MCP client configuration:

```json
{
    "mcpServers": {
        "MCP SQLite Server (Read-Only)": {
            "command": "npx",
            "args": [
                "-y",
                "mcp-sqlite-readonly",
                "/path/to/your/database.db"
            ]
        }
    }
}
```

Or if installed globally via git:

```json
{
    "mcpServers": {
        "MCP SQLite Server (Read-Only)": {
            "command": "mcp-sqlite-server",
            "args": [
                "/path/to/your/database.db"
            ]
        }
    }
}
```
