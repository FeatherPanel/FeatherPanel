import "colors";

import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
	await db.schema
		.createTable("user")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("name", "text", (col) => col.notNull().unique())
		.addColumn("email", "text", (col) => col.notNull().unique())
		.addColumn("emailToken", "text", (col) => col.defaultTo(null))
		.addColumn("emailVerified", "boolean", (col) =>
			col.notNull().defaultTo(0)
		)
		.addColumn("emailSentAt", "text", (col) =>
			col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
		)
		.addColumn("password", "text", (col) => col.notNull())
		.addColumn("passwordToken", "text", (col) => col.defaultTo(null))
		.addColumn("lang", "text", (col) => col.notNull())
		.addColumn("admin", "boolean", (col) => col.notNull().defaultTo(0))
		.addColumn("superuser", "boolean", (col) => col.notNull().defaultTo(0))
		.addColumn("suspended", "boolean", (col) => col.notNull().defaultTo(0))
		.addColumn("otpEnabled", "boolean", (col) => col.notNull().defaultTo(0))
		.addColumn("otpSecret", "text", (col) => col.defaultTo(null))
		.addColumn("otpAuthUrl", "text", (col) => col.defaultTo(null))
		.addColumn("otpRecovery", "text", (col) => col.defaultTo(null))
		.addColumn("createdAt", "text", (col) =>
			col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
		)
		.execute();

	await db.schema
		.createTable("server")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("name", "text", (col) => col.notNull())
		.addColumn("serverId", "text", (col) => col.notNull().unique())
		.addColumn("containerId", "text")
		.addColumn("ownerId", "integer", (col) => col.notNull())
		.addColumn("ownerName", "text", (col) => col.notNull())
		.addColumn("nodeId", "integer", (col) => col.notNull())
		.addColumn("nodeName", "text", (col) => col.notNull())
		.addColumn("port", "integer", (col) => col.notNull())
		.addColumn("extraPorts", "text")
		.addColumn("cpuUsage", "float4", (col) => col.notNull().defaultTo(0))
		.addColumn("cpuShares", "integer", (col) => col.notNull())
		.addColumn("ramUsage", "bigint", (col) => col.notNull().defaultTo(0))
		.addColumn("ramLimit", "bigint", (col) => col.notNull())
		.addColumn("diskUsage", "bigint", (col) => col.notNull().defaultTo(0))
		.addColumn("diskLimit", "bigint", (col) => col.notNull())
		.addColumn("networkRx", "bigint", (col) => col.notNull().defaultTo(0))
		.addColumn("networkTx", "bigint", (col) => col.notNull().defaultTo(0))
		.addColumn("game", "text", (col) => col.notNull())
		.addColumn("backupsLimit", "integer", (col) =>
			col.notNull().defaultTo(0)
		)
		.addColumn("startCommand", "text", (col) => col.notNull())
		.addColumn("javaVersion", "text")
		.addColumn("suspended", "boolean", (col) => col.notNull().defaultTo(0))
		.addColumn("status", "text", (col) =>
			col.notNull().defaultTo("offline")
		)
		.addColumn("createdAt", "text", (col) =>
			col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
		)
		.execute();

	await db.schema
		.createTable("subuser")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("serverId", "integer", (col) => col.notNull())
		.addColumn("userId", "integer", (col) => col.notNull())
		.addColumn("permissions", "text", (col) => col.notNull())
		.addColumn("createdAt", "text", (col) =>
			col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
		)
		.execute();

	await db.schema
		.createTable("backup")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("serverId", "integer", (col) => col.notNull())
		.addColumn("name", "text", (col) => col.notNull())
		.addColumn("size", "bigint", (col) => col.notNull())
		.addColumn("status", "text", (col) => col.notNull())
		.addColumn("createdAt", "text", (col) =>
			col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
		)
		.execute();

	await db.schema
		.createTable("node")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("name", "text", (col) => col.notNull())
		.addColumn("address", "text", (col) => col.notNull())
		.addColumn("daemonPort", "integer", (col) => col.notNull())
		.addColumn("sftpPort", "integer", (col) => col.notNull())
		.addColumn("ssl", "boolean", (col) => col.notNull())
		.addColumn("location", "text", (col) => col.notNull())
		.addColumn("createdAt", "text", (col) =>
			col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
		)
		.execute();

	await db.schema
		.createTable("apiCredentials")
		.addColumn("id", "integer", (col) => col.primaryKey().autoIncrement())
		.addColumn("userId", "integer", (col) => col.notNull())
		.addColumn("ipWhitelist", "text")
		.addColumn("name", "text", (col) => col.notNull())
		.addColumn("key", "text", (col) => col.notNull())
		.addColumn("permissions", "text", (col) => col.notNull())
		.addColumn("updatedAt", "text", (col) =>
			col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
		)
		.addColumn("createdAt", "text", (col) =>
			col.defaultTo(sql`CURRENT_TIMESTAMP`).notNull()
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
