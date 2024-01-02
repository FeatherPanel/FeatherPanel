import {
	ColumnType,
	Generated,
	Insertable,
	Selectable,
	Updateable,
} from "kysely";

export interface Database {
	user: UserTable;
	server: ServerTable;
	subuser: SubuserTable;
	backup: BackupTable;
	node: NodeTable;
	apiCredentials: ApiCredentialsTable;
}

type ColumnTypeOf<T> = ColumnType<T, T | undefined, T>;

export interface UserTable {
	id: Generated<number>;
	name: string;
	email: string;
	emailToken: string | null;
	emailVerified: ColumnTypeOf<boolean>;
	emailSentAt: ColumnType<Date, string | undefined, string>;
	password: string;
	passwordToken: string | null;
	lang: string;
	admin: ColumnTypeOf<boolean>;
	superuser: ColumnTypeOf<boolean>;
	suspended: ColumnTypeOf<boolean>;
	otpEnabled: ColumnTypeOf<boolean>;
	otpSecret: string | null;
	otpAuthUrl: string | null;
	otpRecovery: string | null;
	createdAt: ColumnType<Date, string | undefined, never>;
}

export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
export type UpdateUser = Updateable<UserTable>;

export interface ServerTable {
	id: Generated<number>;
	name: string;
	serverId: string;
	containerId: string | null;
	ownerId: number;
	ownerName: string;
	nodeId: number;
	nodeName: string;
	port: number;
	extraPorts: string;
	cpuUsage: ColumnTypeOf<number>;
	cpuShares: ColumnTypeOf<number>;
	ramUsage: ColumnTypeOf<bigint>;
	ramLimit: ColumnTypeOf<bigint>;
	diskUsage: ColumnTypeOf<bigint>;
	diskLimit: ColumnTypeOf<bigint>;
	networkRx: ColumnTypeOf<bigint>;
	networkTx: ColumnTypeOf<bigint>;
	game: string;
	backupsLimit: ColumnTypeOf<number>;
	startCommand: string;
	javaVersion: ColumnTypeOf<string | null>;
	status: ColumnTypeOf<
		| "online"
		| "offline"
		| "unknown"
		| "starting"
		| "stopping"
		| "restarting"
		| "killing"
	>;
	suspended: ColumnTypeOf<boolean>;
	createdAt: ColumnType<Date, string | undefined, never>;
}

export type Server = Selectable<ServerTable>;
export type NewServer = Insertable<ServerTable>;
export type UpdateServer = Updateable<ServerTable>;

export interface SubuserTable {
	id: Generated<number>;
	userId: number;
	serverId: number;
	permissions: string;
	createdAt: ColumnType<Date, string | undefined, never>;
}

export type Subuser = Selectable<SubuserTable>;
export type NewSubuser = Insertable<SubuserTable>;
export type UpdateSubuser = Updateable<SubuserTable>;

export interface BackupTable {
	id: Generated<number>;
	serverId: number;
	name: string;
	size: number;
	status: ColumnTypeOf<"success" | "error" | "in_progress">;
	createdAt: ColumnType<Date, string | undefined, never>;
}

export type Backup = Selectable<BackupTable>;
export type NewBackup = Insertable<BackupTable>;
export type UpdateBackup = Updateable<BackupTable>;

export interface NodeTable {
	id: Generated<number>;
	name: string;
	address: string;
	daemonPort: number;
	sftpPort: number;
	ssl: boolean;
	location: string;
	createdAt: ColumnType<Date, string | undefined, never>;
}

export type Node = Selectable<NodeTable>;
export type NewNode = Insertable<NodeTable>;
export type UpdateNode = Updateable<NodeTable>;

export interface ApiCredentialsTable {
	id: Generated<number>;
	userId: number;
	ipWhitelist: string;
	name: string;
	key: string;
	permissions: string;
	updatedAt: ColumnType<Date, string | undefined, string>;
	createdAt: ColumnType<Date, string | undefined, never>;
}

export type ApiCredentials = Selectable<ApiCredentialsTable>;
export type NewApiCredentials = Insertable<ApiCredentialsTable>;
export type UpdateApiCredentials = Updateable<ApiCredentialsTable>;
