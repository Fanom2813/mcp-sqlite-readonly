#!/usr/bin/env node

/**
 * MCP SQLite Server - Read-Only Mode
 *
 * Security Features:
 * 1. Database opened with OPEN_READONLY flag to prevent any write operations at the SQLite level
 * 2. Whitelist-based query validation (only SELECT, EXPLAIN, WITH allowed)
 * 3. Blacklist dangerous commands (INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, ATTACH, DETACH, PRAGMA, etc.)
 * 4. SQL injection protection via parameterized queries and identifier validation
 * 5. Table and column name sanitization (alphanumeric and underscores only)
 * 6. Comment stripping to prevent SQL injection via comments
 * 7. Multi-statement detection and validation
 * 8. Input validation for LIMIT and OFFSET parameters
 */

const sqlite3 = require('sqlite3').verbose();
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { existsSync, statSync } = require('node:fs');
const { z } = require('zod');
const path = require('path');

class SQLiteHandler {
    constructor(dbPath) {
        this.dbPath = dbPath;

        // Open the database in read-only mode for security
        // SQLITE_OPEN_READONLY = 0x00000001
        this.db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.error(`Error opening database: ${err.message}`);
            }
        });
    }

    async executeQuery(sql, values = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, values, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async executeRun(sql, values = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }

    async listTables() {
        return this.executeQuery(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        );
    }

    async getTableSchema(tableName) {
        // Validate table name to prevent SQL injection
        // Table names should only contain alphanumeric characters and underscores
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name. Only alphanumeric characters and underscores are allowed.');
        }
        return this.executeQuery(`PRAGMA table_info(${tableName})`);
    }

    validateTableName(tableName) {
        // Validate table name to prevent SQL injection
        if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
            throw new Error('Invalid table name. Only alphanumeric characters and underscores are allowed.');
        }
        return tableName;
    }
}

async function main() {
    const dbPath = process.argv[2] || 'mydatabase.db';
    
    // Resolve to absolute path if relative
    const absoluteDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
    const handler = new SQLiteHandler(absoluteDbPath);
    const server = new McpServer({
        name: "mcp-sqlite-server",
        version: "1.0.0"
    });

    // Add a database info tool for debugging
    server.tool(
        "db_info",
        "Get information about the SQLite database including path, existence, size, and table count",
        {},
        async () => {
            try {
                const dbExists = existsSync(absoluteDbPath);
                let fileSize = 0;
                let fileStats = null;
                
                if (dbExists) {
                    fileStats = statSync(absoluteDbPath);
                    fileSize = fileStats.size;
                }
                
                // Get table count
                const tableCountResult = await handler.executeQuery(
                    "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
                );
                
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify({
                            dbPath: absoluteDbPath,
                            exists: dbExists,
                            size: fileSize,
                            lastModified: dbExists ? fileStats.mtime.toString() : null,
                            tableCount: tableCountResult[0].count
                        }, null, 2) 
                    }]
                };
            } catch (error) {
                return {
                    content: [{ 
                        type: "text", 
                        text: `Error getting database info: ${error.message}` 
                    }],
                    isError: true
                };
            }
        }
    );

    // Register SQLite query tool
    server.tool(
        "query",
        "Execute a read-only SQL query against the database with optional parameter values. Only SELECT and EXPLAIN queries are allowed.",
        {
            sql: z.string(),
            values: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
        },
        async ({ sql, values }) => {
            try {
                // Security: Use whitelist approach instead of blacklist
                // Remove comments and normalize whitespace
                const cleanSQL = sql
                    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
                    .replace(/--[^\n]*/g, '') // Remove -- comments
                    .trim()
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    .toUpperCase();

                // Check if SQL is empty after cleaning
                if (!cleanSQL) {
                    return {
                        content: [{
                            type: "text",
                            text: "Error: Empty SQL query provided."
                        }],
                        isError: true
                    };
                }

                // Split by semicolons to handle multiple statements
                const statements = cleanSQL.split(';').map(s => s.trim()).filter(s => s.length > 0);

                // Whitelist: Only allow SELECT and EXPLAIN statements
                const allowedStarts = ['SELECT', 'EXPLAIN', 'WITH'];

                for (const statement of statements) {
                    const isAllowed = allowedStarts.some(allowed => statement.startsWith(allowed));

                    if (!isAllowed) {
                        return {
                            content: [{
                                type: "text",
                                text: `Error: Only SELECT, EXPLAIN, and WITH (CTE) queries are allowed. Found: ${statement.substring(0, 50)}...`
                            }],
                            isError: true
                        };
                    }

                    // Block dangerous commands that could appear in subqueries or CTEs
                    const blockedKeywords = [
                        'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER',
                        'TRUNCATE', 'REPLACE', 'ATTACH', 'DETACH', 'PRAGMA',
                        'REINDEX', 'VACUUM', 'ANALYZE'
                    ];

                    for (const keyword of blockedKeywords) {
                        // Use word boundaries to avoid false positives (e.g., "INSERTED_AT" column name)
                        const keywordPattern = new RegExp(`\\b${keyword}\\b`, 'i');
                        if (keywordPattern.test(statement)) {
                            return {
                                content: [{
                                    type: "text",
                                    text: `Error: Command '${keyword}' is not allowed in read-only mode.`
                                }],
                                isError: true
                            };
                        }
                    }
                }

                const results = await handler.executeQuery(sql, values);
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(results, null, 2)
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: ${error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    // List Tables
    server.tool(
        "list_tables",
        "List all user tables in the SQLite database (excludes system tables)",
        {},
        async () => {
            try {
                const tables = await handler.listTables();
                
                if (tables.length === 0) {
                    return {
                        content: [{ 
                            type: "text", 
                            text: JSON.stringify({
                                message: "No tables found in database",
                                dbPath: absoluteDbPath,
                                exists: existsSync(absoluteDbPath),
                                size: existsSync(absoluteDbPath) ? statSync(absoluteDbPath).size : 0
                            }, null, 2) 
                        }]
                    };
                }
                
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify(tables, null, 2) 
                    }]
                };
            } catch (error) {
                return {
                    content: [{ 
                        type: "text", 
                        text: `Error listing tables: ${error.message}` 
                    }],
                    isError: true
                };
            }
        }
    );

    // Get Table Schema
    server.tool(
        "get_table_schema",
        "Get the schema information for a specific table including column details",
        { 
            tableName: z.string() 
        },
        async ({ tableName }) => {
            try {
                const schema = await handler.getTableSchema(tableName);
                return {
                    content: [{ 
                        type: "text", 
                        text: JSON.stringify(schema, null, 2) 
                    }]
                };
            } catch (error) {
                return {
                    content: [{ 
                        type: "text", 
                        text: `Error getting schema: ${error.message}` 
                    }],
                    isError: true
                };
            }
        }
    );

    // Read Records
    server.tool(
        "read_records",
        "Read records from a table with optional conditions, limit, and offset",
        {
            table: z.string(),
            conditions: z.record(z.any()).optional(),
            limit: z.number().optional(),
            offset: z.number().optional()
        },
        async ({ table, conditions, limit, offset }) => {
            try {
                // Validate table name to prevent SQL injection
                handler.validateTableName(table);

                let sql = `SELECT * FROM ${table}`;
                const values = [];

                // Add WHERE clause if conditions provided
                if (conditions && Object.keys(conditions).length > 0) {
                    const whereConditions = Object.entries(conditions).map(([column, value]) => {
                        // Validate column names to prevent SQL injection
                        if (!/^[a-zA-Z0-9_]+$/.test(column)) {
                            throw new Error(`Invalid column name: ${column}. Only alphanumeric characters and underscores are allowed.`);
                        }
                        values.push(value);
                        return `${column} = ?`;
                    }).join(' AND ');

                    sql += ` WHERE ${whereConditions}`;
                }

                // Add LIMIT and OFFSET with validation
                if (limit !== undefined) {
                    if (!Number.isInteger(limit) || limit < 0) {
                        throw new Error('Limit must be a non-negative integer');
                    }
                    sql += ` LIMIT ${limit}`;

                    if (offset !== undefined) {
                        if (!Number.isInteger(offset) || offset < 0) {
                            throw new Error('Offset must be a non-negative integer');
                        }
                        sql += ` OFFSET ${offset}`;
                    }
                }

                const results = await handler.executeQuery(sql, values);

                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(results, null, 2)
                    }]
                };
            } catch (error) {
                return {
                    content: [{
                        type: "text",
                        text: `Error reading records: ${error.message}`
                    }],
                    isError: true
                };
            }
        }
    );

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main();
