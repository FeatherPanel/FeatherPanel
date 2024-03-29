import "colors";

import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable("user")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("name", "varchar(255)", (col) => col.notNull().unique())
		.addColumn("email", "varchar(255)", (col) => col.notNull().unique())
		.addColumn("emailToken", "varchar(255)", (col) => col.defaultTo(null))
		.addColumn("emailVerified", "boolean", (col) =>
			col.notNull().defaultTo(0)
		)
		.addColumn("emailSentAt", "timestamp", (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.addColumn("password", "varchar(255)", (col) => col.notNull())
		.addColumn("passwordToken", "varchar(255)", (col) =>
			col.defaultTo(null)
		)
		.addColumn("lang", "varchar(255)", (col) => col.notNull())
		.addColumn("admin", "boolean", (col) => col.notNull().defaultTo(0))
		.addColumn("superuser", "boolean", (col) => col.notNull().defaultTo(0))
		.addColumn("suspended", "boolean", (col) => col.notNull().defaultTo(0))
		.addColumn("otpEnabled", "boolean", (col) => col.notNull().defaultTo(0))
		.addColumn("otpSecret", "varchar(255)", (col) => col.defaultTo(null))
		.addColumn("otpAuthUrl", "varchar(255)", (col) => col.defaultTo(null))
		.addColumn("otpRecovery", "varchar(255)", (col) => col.defaultTo(null))
		.addColumn("createdAt", "timestamp", (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.execute();

	await db.schema
		.createTable("server")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("name", "varchar(255)", (col) => col.notNull())
		.addColumn("serverId", "varchar(255)", (col) => col.notNull().unique())
		.addColumn("containerId", "varchar(255)")
		.addColumn("ownerId", "integer", (col) => col.notNull())
		.addColumn("ownerName", "varchar(255)", (col) => col.notNull())
		.addColumn("nodeId", "integer", (col) => col.notNull())
		.addColumn("nodeName", "varchar(255)", (col) => col.notNull())
		.addColumn("port", "integer", (col) => col.notNull())
		.addColumn("extraPorts", "varchar(255)")
		.addColumn("cpuUsage", "float4", (col) => col.notNull().defaultTo(0))
		.addColumn("cpuShares", "integer", (col) => col.notNull())
		.addColumn("ramUsage", "bigint", (col) => col.notNull().defaultTo(0))
		.addColumn("ramLimit", "bigint", (col) => col.notNull())
		.addColumn("diskUsage", "bigint", (col) => col.notNull().defaultTo(0))
		.addColumn("diskLimit", "bigint", (col) => col.notNull())
		.addColumn("networkRx", "bigint", (col) => col.notNull().defaultTo(0))
		.addColumn("networkTx", "bigint", (col) => col.notNull().defaultTo(0))
		.addColumn("game", "varchar(255)", (col) => col.notNull())
		.addColumn("backupsLimit", "integer", (col) =>
			col.notNull().defaultTo(0)
		)
		.addColumn("startCommand", "varchar(255)", (col) => col.notNull())
		.addColumn("javaVersion", "varchar(255)")
		.addColumn("status", "varchar(255)", (col) =>
			col.notNull().defaultTo("offline")
		)
		.addColumn("suspended", "boolean", (col) => col.notNull().defaultTo(0))
		.addColumn("createdAt", "timestamp", (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.execute();

	await db.schema
		.createTable("subuser")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("serverId", "integer", (col) => col.notNull())
		.addColumn("userId", "integer", (col) => col.notNull())
		.addColumn("permissions", "text", (col) => col.notNull())
		.addColumn("createdAt", "timestamp", (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.execute();

	await db.schema
		.createTable("backup")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("serverId", "integer", (col) => col.notNull())
		.addColumn("name", "varchar(255)", (col) => col.notNull())
		.addColumn("size", "bigint", (col) => col.notNull())
		.addColumn("status", "varchar(255)", (col) => col.notNull())
		.addColumn("createdAt", "timestamp", (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.execute();

	await db.schema
		.createTable("node")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("name", "varchar(255)", (col) => col.notNull())
		.addColumn("address", "varchar(255)", (col) => col.notNull())
		.addColumn("daemonPort", "integer", (col) => col.notNull())
		.addColumn("sftpPort", "integer", (col) => col.notNull())
		.addColumn("ssl", "boolean", (col) => col.notNull())
		.addColumn("location", "varchar(255)", (col) => col.notNull())
		.addColumn("createdAt", "timestamp", (col) =>
			col.defaultTo(sql`now()`).notNull()
		)
		.execute();

	await db.schema
		.createTable("apiCredentials")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("userId", "integer", (col) => col.notNull())
		.addColumn("ipWhitelist", "text", (col) => col.notNull())
		.addColumn("name", "varchar(255)", (col) => col.notNull())
		.addColumn("key", "varchar(255)", (col) => col.notNull().unique())
		.addColumn("permissions", "text", (col) => col.notNull())
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
