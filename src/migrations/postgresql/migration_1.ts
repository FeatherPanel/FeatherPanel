import "colors";

import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable("user")
		.addColumn("id", "serial", (col) => col.primaryKey())
		.addColumn("name", "varchar", (col) => col.notNull().unique())
		.addColumn("email", "varchar", (col) => col.notNull().unique())
		.addColumn("emailToken", "varchar", (col) => col.defaultTo(null))
		.addColumn("emailVerified", "boolean", (col) =>
			col.notNull().defaultTo(0)
		)
		.addColumn("emailSentAt", "timestamp", (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.addColumn("password", "varchar", (col) => col.notNull())
		.addColumn("passwordToken", "varchar", (col) => col.defaultTo(null))
		.addColumn("lang", "varchar", (col) => col.notNull())
		.addColumn("admin", "boolean", (col) => col.notNull().defaultTo(false))
		.addColumn("superuser", "boolean", (col) =>
			col.notNull().defaultTo(false)
		)
		.addColumn("suspended", "boolean", (col) =>
			col.notNull().defaultTo(false)
		)
		.addColumn("otpEnabled", "boolean", (col) =>
			col.notNull().defaultTo(false)
		)
		.addColumn("otpSecret", "varchar", (col) => col.defaultTo(null))
		.addColumn("otpAuthUrl", "varchar", (col) => col.defaultTo(null))
		.addColumn("otpRecovery", "varchar", (col) => col.defaultTo(null))
		.addColumn("createdAt", "timestamp", (col) =>
			col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
		)
		.execute();

	await db.schema
		.createTable("server")
		.addColumn("id", "serial", (col) => col.primaryKey())
		.addColumn("name", "varchar", (col) => col.notNull())
		.addColumn("serverId", "varchar", (col) => col.notNull().unique())
		.addColumn("containerId", "varchar")
		.addColumn("ownerId", "integer", (col) => col.notNull())
		.addColumn("ownerName", "varchar", (col) => col.notNull())
		.addColumn("nodeId", "integer", (col) => col.notNull())
		.addColumn("nodeName", "varchar", (col) => col.notNull())
		.addColumn("port", "integer", (col) => col.notNull())
		.addColumn("extraPorts", "varchar")
		.addColumn("cpuUsage", "float4", (col) => col.notNull().defaultTo(0))
		.addColumn("cpuShares", "integer", (col) => col.notNull())
		.addColumn("ramUsage", "bigint", (col) => col.notNull().defaultTo(0))
		.addColumn("ramLimit", "bigint", (col) => col.notNull())
		.addColumn("diskUsage", "bigint", (col) => col.notNull().defaultTo(0))
		.addColumn("diskLimit", "bigint", (col) => col.notNull())
		.addColumn("networkRx", "bigint", (col) => col.notNull().defaultTo(0))
		.addColumn("networkTx", "bigint", (col) => col.notNull().defaultTo(0))
		.addColumn("game", "varchar", (col) => col.notNull())
		.addColumn("backupsLimit", "integer", (col) =>
			col.notNull().defaultTo(0)
		)
		.addColumn("startCommand", "varchar", (col) => col.notNull())
		.addColumn("javaVersion", "varchar")
		.addColumn("status", "varchar", (col) =>
			col.notNull().defaultTo("offline")
		)
		.addColumn("suspended", "boolean", (col) =>
			col.notNull().defaultTo(false)
		)
		.addColumn("createdAt", "timestamp", (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.execute();

	await db.schema
		.createTable("subuser")
		.addColumn("id", "serial", (col) => col.primaryKey())
		.addColumn("serverId", "integer", (col) => col.notNull())
		.addColumn("userId", "integer", (col) => col.notNull())
		.addColumn("permissions", "varchar", (col) => col.notNull())
		.addColumn("createdAt", "timestamp", (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.execute();

	await db.schema
		.createTable("backup")
		.addColumn("id", "serial", (col) => col.primaryKey())
		.addColumn("serverId", "integer", (col) => col.notNull())
		.addColumn("name", "varchar", (col) => col.notNull())
		.addColumn("size", "bigint", (col) => col.notNull())
		.addColumn("status", "varchar", (col) => col.notNull())
		.addColumn("createdAt", "timestamp", (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.execute();

	await db.schema
		.createTable("node")
		.addColumn("id", "serial", (col) => col.primaryKey())
		.addColumn("name", "varchar", (col) => col.notNull())
		.addColumn("address", "varchar", (col) => col.notNull())
		.addColumn("daemonPort", "integer", (col) => col.notNull())
		.addColumn("sftpPort", "integer", (col) => col.notNull())
		.addColumn("ssl", "boolean", (col) => col.notNull())
		.addColumn("location", "varchar", (col) => col.notNull())
		.addColumn("createdAt", "timestamp", (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.execute();

	await db.schema
		.createTable("apiCredentials")
		.addColumn("id", "serial", (col) => col.primaryKey())
		.addColumn("userId", "integer", (col) => col.notNull())
		.addColumn("ipWhitelist", "varchar")
		.addColumn("name", "varchar", (col) => col.notNull())
		.addColumn("key", "varchar", (col) => col.notNull().unique())
		.addColumn("permissions", "varchar", (col) => col.notNull())
		.addColumn("updatedAt", "timestamp", (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.addColumn("createdAt", "timestamp", (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.execute();
}

export async function down(db: Kysely<any>): Promise<void> {
	await db.schema.dropTable("user").execute();
	await db.schema.dropTable("server").execute();
	await db.schema.dropTable("subuser").execute();
	await db.schema.dropTable("backup").execute();
	await db.schema.dropTable("node").execute();
	await db.schema.dropTable("apiCredentials").execute();
}
