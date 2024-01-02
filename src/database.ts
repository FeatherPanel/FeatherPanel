import "colors";
import "dotenv/config";

import SQLite from "better-sqlite3";
import { Kysely, MysqlDialect, PostgresDialect, SqliteDialect } from "kysely";
import { createPool } from "mysql2";
import { Pool } from "pg";

import { Database } from "./types";

export function initDatabase(
	options?:
		| {
				type: "mysql" | "postgresql";
				database: string;
				host: string;
				user: string;
				password: string;
				port: number;
				connectionLimit: number;
		  }
		| { type: "sqlite"; path: string }
		| any,
	throwError: boolean = true
) {
	let dialect;

	if (options) {
		if (options.type === "postgresql") {
			dialect = new PostgresDialect({
				pool: new Pool({
					database: options.database,
					host: options.host,
					user: options.user,
					password: options.password,
					port: options.port,
					max: 10,
				}),
			});
		} else if (options.type === "mysql") {
			dialect = new MysqlDialect({
				pool: createPool({
					database: options.database,
					host: options.host,
					user: options.user,
					password: options.password,
					port: options.port,
					connectionLimit: options.connectionLimit,
				}),
			});
		} else if (options.type === "sqlite") {
			dialect = new SqliteDialect({
				database: new SQLite(options.path),
			});
		} else {
			if (throwError) {
				console.error(
					"La configuration de la base de données est invalide".red
				);
				process.exit(1);
			} else {
				return null;
			}
		}

		return new Kysely<Database>({
			dialect,
		});
	} else {
		if (process.env.DATABASE_TYPE === "postgresql") {
			dialect = new PostgresDialect({
				pool: new Pool({
					database: process.env.DATABASE_NAME,
					host: process.env.DATABASE_HOST,
					user: process.env.DATABASE_USER,
					password: process.env.DATABASE_PASSWORD,
					port: parseInt(process.env.DATABASE_PORT!) || 5432,
					max: 10,
				}),
			});
		} else if (process.env.DATABASE_TYPE === "mysql") {
			dialect = new MysqlDialect({
				pool: createPool({
					database: process.env.DATABASE_NAME,
					host: process.env.DATABASE_HOST,
					user: process.env.DATABASE_USER,
					password: process.env.DATABASE_PASSWORD,
					port: parseInt(process.env.DATABASE_PORT!) || 3306,
					connectionLimit: 10,
				}),
			});
		} else if (process.env.DATABASE_TYPE === "sqlite") {
			dialect = new SqliteDialect({
				database: new SQLite(
					process.env.DATABASE_SQLITE_PATH || ":memory:"
				),
			});
		} else {
			if (throwError) {
				console.error(
					"La configuration de la base de données est invalide".red
				);
				process.exit(1);
			} else {
				return null;
			}
		}
	}

	// Database interface is passed to Kysely's constructor, and from now on, Kysely
	// knows your database structure.
	// Dialect is passed to Kysely's constructor, and from now on, Kysely knows how
	// to communicate with your database.
	return new Kysely<Database>({
		dialect,
	});
}

export const db = initDatabase()!;
