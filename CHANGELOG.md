# Changelog

All notable changes to the MCP SQLite Server will be documented in this file.

## [1.1.0] - 2025-10-05
### 🔒 BREAKING CHANGES - Read-Only Mode
This release transforms the server into a **read-only** SQLite database interface with enterprise-grade security.

### ✨ Added
- **Database-level read-only protection**: Database now opens with `sqlite3.OPEN_READONLY` flag
- **Whitelist-based query validation**: Only SELECT, EXPLAIN, and WITH (CTE) queries are allowed
- **Multi-layer security validation**:
  - SQL comment stripping (removes `/* */` and `--` comments)
  - Multi-statement query validation
  - Dangerous command blocking (INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, ATTACH, DETACH, PRAGMA, REINDEX, VACUUM, ANALYZE)
  - Word boundary detection to prevent false positives
- **SQL injection prevention**:
  - Table name validation (alphanumeric and underscores only)
  - Column name validation (alphanumeric and underscores only)
  - LIMIT/OFFSET parameter validation (non-negative integers only)
  - Parameterized query support maintained
- **Comprehensive security documentation** in code comments

### ❌ Removed
- `create_record` tool (write operation)
- `update_records` tool (write operation)
- `delete_records` tool (write operation)

### 📝 Updated
- `query` tool now enforces read-only operations with strict validation
- Package description updated to reflect read-only capabilities
- README.md updated with security features and usage examples
- All remaining tools (`db_info`, `list_tables`, `get_table_schema`, `read_records`, `query`) enhanced with security validations

### 🛡️ Security
This release implements defense-in-depth security with multiple layers of protection against SQL injection, unauthorized writes, and malicious queries.

## [1.0.7] - 2025-06-02
### 📦 Updated
- Added a "description" parameter to each tool definitions for better Agent selection

### 🐛 Fixed
- Resolved a know validation issue with VS Code that requires stricter JSON schema validation

## [1.0.0] - 2025-04-05
### ✨ Added
- Initial release of MCP SQLite Server
- Complete set of CRUD operations:
  - `create_record` - Insert data into tables
  - `read_records` - Query records with filtering, limit and offset
  - `update_records` - Modify existing records with conditions
  - `delete_records` - Remove records matching conditions
- Database exploration tools:
  - `list_tables` - List all tables in the database
  - `get_table_schema` - Get column information for tables
  - `db_info` - Get database file metadata
- Custom SQL query execution with the `query` tool
- Support for relative and absolute database paths
- Detailed error reporting for all operations
- Comprehensive JSON response formatting
- Full documentation in README.md 