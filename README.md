# 🐇 MCP SQLite Server (Read-Only Fork)
This is a Model Context Protocol (MCP) server that provides **read-only** SQLite database interaction capabilities with enterprise-grade security.

> **Note**: This is a security-hardened fork of [mcp-sqlite](https://github.com/jparkerweb/mcp-sqlite) by [Justin Parker](https://github.com/jparkerweb). The original project provided full CRUD operations. This fork transforms it into a read-only server with multiple layers of security protection.

## Credits

**Original Project**: [mcp-sqlite](https://github.com/jparkerweb/mcp-sqlite) by [Justin Parker](https://github.com/jparkerweb)
**Original Maintainer**: [eQuill Labs](https://www.equilllabs.com)
**This Fork**: Security-hardened read-only version by [Fanom2813](https://github.com/Fanom2813)

## Features
- 🔒 **Read-only access** - Database opened with `SQLITE_OPEN_READONLY` flag
- 🛡️ **Multi-layer security** - Whitelist-based query validation, SQL injection protection
- 🔍 **Database exploration** - List tables, inspect schemas, query data
- 📊 **Custom read queries** - Execute SELECT queries with parameterized values
- ✅ **Input validation** - Table names, column names, and parameters are strictly validated

## Security Features

This server implements defense-in-depth security:

1. **Database-level protection**: Opened with `SQLITE_OPEN_READONLY` flag
2. **Whitelist validation**: Only SELECT, EXPLAIN, and WITH (CTE) queries allowed
3. **Blacklist dangerous commands**: Blocks INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, ATTACH, DETACH, PRAGMA, etc.
4. **SQL injection prevention**: Parameterized queries and strict identifier validation
5. **Comment stripping**: Removes SQL comments to prevent injection attacks
6. **Multi-statement validation**: Each statement in multi-query requests is validated

## Setup

Define the command in your IDE's MCP Server settings:

e.g. `Cursor`:
```json
{
    "mcpServers": {
        "MCP SQLite Server (Read-Only)": {
            "command": "npx",
            "args": [
                "-y",
                "mcp-sqlite-readonly",
                "<path-to-your-sqlite-database.db>"
            ]
        }
    }
}
```

e.g. `VSCode`:
```json
{
    "servers": {
        "MCP SQLite Server (Read-Only)": {
            "type": "stdio",
            "command": "npx",
            "args": [
                "-y",
                "mcp-sqlite-readonly",
                "<path-to-your-sqlite-database.db>"
            ]
        }
    }
}
```

Your database path must be provided as an argument.

## Available Tools

### Database Information

#### db_info

Get detailed information about the connected database.

Example:
```json
{
  "method": "tools/call",
  "params": {
    "name": "db_info",
    "arguments": {}
  }
}
```

#### list_tables

List all tables in the database.

Example:
```json
{
  "method": "tools/call",
  "params": {
    "name": "list_tables",
    "arguments": {}
  }
}
```

#### get_table_schema

Get detailed information about a table's schema.

Parameters:
- `tableName` (string): Name of the table

Example:
```json
{
  "method": "tools/call",
  "params": {
    "name": "get_table_schema",
    "arguments": {
      "tableName": "users"
    }
  }
}
```

### Read Operations

#### read_records

Query records from a table with optional filtering. All inputs are validated to prevent SQL injection.

Parameters:
- `table` (string): Name of the table (alphanumeric and underscores only)
- `conditions` (object, optional): Filter conditions as key-value pairs
- `limit` (number, optional): Maximum number of records to return
- `offset` (number, optional): Number of records to skip

Example:
```json
{
  "method": "tools/call",
  "params": {
    "name": "read_records",
    "arguments": {
      "table": "users",
      "conditions": {
        "age": 30
      },
      "limit": 10,
      "offset": 0
    }
  }
}
```

### Custom Read-Only Queries

#### query

Execute a read-only SQL query against the database. **Only SELECT, EXPLAIN, and WITH (CTE) queries are allowed.**

The query validator will:
- Strip SQL comments to prevent injection
- Validate each statement in multi-query requests
- Block dangerous commands (INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, ATTACH, DETACH, PRAGMA, etc.)
- Allow parameterized queries for safe value substitution

Parameters:
- `sql` (string): The SELECT query to execute
- `values` (array, optional): Array of parameter values for placeholders (?)

Example:
```json
{
  "method": "tools/call",
  "params": {
    "name": "query",
    "arguments": {
      "sql": "SELECT * FROM users WHERE age > ? AND status = ?",
      "values": [25, "active"]
    }
  }
}
```

**Allowed:**
- `SELECT * FROM users WHERE id = ?`
- `EXPLAIN QUERY PLAN SELECT * FROM users`
- `WITH active_users AS (SELECT * FROM users WHERE status = 'active') SELECT * FROM active_users`

**Blocked:**
- `INSERT INTO users ...`
- `UPDATE users SET ...`
- `DELETE FROM users ...`
- `DROP TABLE users`
- `ATTACH DATABASE ...`

## Built with

- [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [sqlite3](https://github.com/TryGhost/node-sqlite3)

---

## License

ISC License - Same as the original project

## Appreciation

If you found the original project helpful, please consider supporting the original author:
- **Original Author**: [Justin Parker (jparkerweb)](https://github.com/jparkerweb)
- **Support**: [🍵 tip here](https://ko-fi.com/jparkerweb)
