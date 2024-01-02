import { Request, Response } from "express";

import { db } from "../../../../database";
import { verifyToken } from "../../../../utils/jwt";
import { hasPermission } from "../../../../utils/user";

module.exports = {
	methods: ["GET", "POST", "DELETE"],
	/**
	 * @openapi
	 * /servers/{serverId}/backups:
	 *  get:
	 *   summary: Get server backups
	 *   description: Get server backups.
	 *   tags:
	 *   - Backups
	 *   parameters:
	 *   - name: serverId
	 *     in: path
	 *     required: true
	 *     description: Server ID
	 *     schema:
	 *      type: string
	 *   responses:
	 *    200:
	 *     description: Server backups fetched successfully
	 *     content:
	 *      application/json:
	 *       schema:
	 *        type: object
	 *        properties:
	 *         status:
	 *          type: string
	 *          example: success
	 *         message:
	 *          type: string
	 *          example: Server backups fetched successfully
	 *         data:
	 *          type: array
	 *          items:
	 *           type: object
	 *           properties:
	 *            id:
	 *             type: number
	 *             description: Backup ID
	 *             example: 1
	 *            name:
	 *             type: string
	 *             description: Backup name
	 *             example: backup-1
	 *            size:
	 *             type: number
	 *             description: Backup size in bytes
	 *             example: 1024
	 *            createdAt:
	 *             type: string
	 *             description: Backup creation date
	 *             example: 2021-01-01T00:00:00.000Z
	 *    400:
	 *     $ref: '#/components/responses/BadRequest'
	 *    401:
	 *     $ref: '#/components/responses/Unauthorized'
	 *    403:
	 *     $ref: '#/components/responses/Forbidden'
	 *    500:
	 *     $ref: '#/components/responses/InternalServerError'
	 *   security:
	 *   - BearerAuth: []
	 */
	get: async (req: Request, res: Response) => {
		const token = req.headers.authorization;
		const serverId = req.params.serverId;

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				if (!serverId || typeof serverId !== "string")
					return res.status(400).json({
						status: "error",
						message: "Bad request",
						error: "BAD_REQUEST",
					});

				let server = await db
					.selectFrom("server")
					.where("serverId", "=", serverId)
					.select(["id", "ownerId"])
					.executeTakeFirst()
					.catch(() => null);

				if (!server)
					return res.status(400).json({
						status: "error",
						message: "Server not found",
						error: "SERVER_NOT_FOUND",
					});

				if (
					server.ownerId !== user.id &&
					!user.admin &&
					!hasPermission(user.id, server.id, "server.files.backups")
				)
					return res.status(403).json({
						status: "error",
						message:
							"You don't have the required permissions to access this resource",
						error: "FORBIDDEN",
					});

				let backups = [];
				backups = await db
					.selectFrom("backup")
					.where("serverId", "=", server.id)
					.selectAll()
					.execute()
					.catch(() => []);

				backups = backups.sort((a, b) => {
					if (a.id < b.id) return -1;
					if (a.id > b.id) return 1;
					return 0;
				});

				res.status(200).json({
					status: "success",
					message: "Server backups fetched successfully",
					data: backups,
				});
			} else {
				res.status(401).json({
					status: "error",
					message: "Access token is missing or invalid",
					error: "UNAUTHORIZED",
				});
			}
		} else {
			res.status(401).json({
				status: "error",
				message: "Access token is missing or invalid",
				error: "UNAUTHORIZED",
			});
		}
	},
	/**
	 * @openapi
	 * /servers/{serverId}/backups:
	 *  post:
	 *   summary: Create server backup
	 *   description: Create server backup.
	 *   tags:
	 *   - Backups
	 *   parameters:
	 *   - name: serverId
	 *     in: path
	 *     required: true
	 *     description: Server ID
	 *     schema:
	 *      type: string
	 *   requestBody:
	 *    required: true
	 *    content:
	 *     application/json:
	 *      schema:
	 *       type: object
	 *       properties:
	 *        name:
	 *         type: string
	 *         description: Backup name
	 *         example: backup-1
	 *        ignore:
	 *         type: array
	 *         description: Files to ignore
	 *         items:
	 *          type: string
	 *          example: logs/*
	 *   responses:
	 *    200:
	 *     description: Backup creation started
	 *     content:
	 *      application/json:
	 *       schema:
	 *        type: object
	 *        properties:
	 *         status:
	 *          type: string
	 *          example: pending
	 *         message:
	 *          type: string
	 *          example: Backup creation started
	 *    400:
	 *     $ref: '#/components/responses/BadRequest'
	 *    401:
	 *     $ref: '#/components/responses/Unauthorized'
	 *    403:
	 *     $ref: '#/components/responses/Forbidden'
	 *    500:
	 *     $ref: '#/components/responses/InternalServerError'
	 *   security:
	 *   - BearerAuth: []
	 */
	post: async (req: Request, res: Response) => {
		const { name, ignore } = req.body;
		const serverId = req.params.serverId;
		const token = req.headers.authorization;

		if (
			!name ||
			typeof name !== "string" ||
			!serverId ||
			typeof serverId !== "string" ||
			(ignore && !Array.isArray(ignore))
		)
			return res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
			});

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				let server = await db
					.selectFrom("server")
					.where("serverId", "=", serverId)
					.select([
						"id",
						"nodeId",
						"containerId",
						"ownerId",
						"backupsLimit",
					])
					.executeTakeFirst()
					.catch(() => null);

				if (!server)
					return res.status(400).json({
						status: "error",
						message: "Server not found",
						error: "SERVER_NOT_FOUND",
					});

				if (
					server.ownerId !== user.id &&
					!user.admin &&
					!hasPermission(user.id, server.id, "server.files.backups")
				)
					return res.status(403).json({
						status: "error",
						message:
							"You don't have the required permissions to access this resource",
						error: "FORBIDDEN",
					});

				let backupsCount = await db
					.selectFrom("backup")
					.where("serverId", "=", server.id)
					.execute()
					.then((data) => data.length)
					.catch(() => 0);

				if (backupsCount >= server.backupsLimit)
					return res.status(400).json({
						status: "error",
						message:
							"You have reached the maximum number of backups",
						error: "MAXIMUM_BACKUPS_REACHED",
					});

				let backupExists = await db
					.selectFrom("user")
					.where("name", "=", name)
					.executeTakeFirst()
					.then((data) => !!data)
					.catch(() => null);

				if (backupExists)
					return res.status(400).json({
						status: "error",
						message: "Backup already exists",
						error: "BACKUP_ALREADY_EXISTS",
					});

				let node = await db
					.selectFrom("node")
					.select(["ssl", "address", "daemonPort"])
					.where("id", "=", server.nodeId)
					.executeTakeFirst();

				if (!node)
					return res.status(400).json({
						status: "error",
						message: "Node not found",
						error: "NODE_NOT_FOUND",
					});

				fetch(
					`${node.ssl ? "https" : "http"}://${node.address}:${
						node.daemonPort
					}/servers/backups`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
						},
						body: JSON.stringify({
							containerId: server.containerId,
							name,
							ignore,
						}),
					}
				)
					.then((r) => r.json())
					.then(async (data) => {
						if (data.status === "pending") {
							await db
								.insertInto("backup")
								.values({
									serverId: server!.id,
									name,
									size: data.data.size,
									status: "in_progress",
								})
								.execute();

							return res.status(200).json({
								status: "pending",
								message: "Server backup creation started",
								data: data.data,
							});
						}

						return res.status(500).json({
							status: data.status || "error",
							message: data.message || "Failed to create backup",
							error: data.error || "INTERNAL_SERVER_ERROR",
						});
					})
					.catch(() => {
						return res.status(500).json({
							status: "error",
							message: "Could not connect to node",
							error: "COULD_NOT_CONNECT_TO_NODE",
						});
					});
			} else {
				res.status(401).json({
					status: "error",
					message: "Access token is missing or invalid",
					error: "UNAUTHORIZED",
				});
			}
		} else {
			res.status(401).json({
				status: "error",
				message: "Access token is missing or invalid",
				error: "UNAUTHORIZED",
			});
		}
	},
	/**
	 * @openapi
	 * /servers/{serverId}/backups:
	 *  delete:
	 *   summary: Delete server backup
	 *   description: Delete server backup.
	 *   tags:
	 *   - Backups
	 *   parameters:
	 *   - name: serverId
	 *     in: path
	 *     required: true
	 *     description: Server ID
	 *     schema:
	 *      type: string
	 *   requestBody:
	 *    required: true
	 *    content:
	 *     application/json:
	 *      schema:
	 *       type: object
	 *       properties:
	 *        id:
	 *         type: number
	 *         description: Backup ID
	 *         example: 1
	 *   responses:
	 *    200:
	 *     description: Backup deleted successfully
	 *     content:
	 *      application/json:
	 *       schema:
	 *        type: object
	 *        properties:
	 *         status:
	 *          type: string
	 *          example: success
	 *         message:
	 *          type: string
	 *          example: Backup deleted successfully
	 *    400:
	 *     $ref: '#/components/responses/BadRequest'
	 *    401:
	 *     $ref: '#/components/responses/Unauthorized'
	 *    403:
	 *     $ref: '#/components/responses/Forbidden'
	 *    500:
	 *     $ref: '#/components/responses/InternalServerError'
	 *   security:
	 *   - BearerAuth: []
	 */
	delete: async (req: Request, res: Response) => {
		const token = req.headers.authorization;
		const id = req.body.id;

		if (!id || typeof id !== "number")
			return res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
			});

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				let server = await db
					.selectFrom("backup")
					.where("backup.id", "=", id)
					.innerJoin("server", "backup.serverId", "server.id")
					.select([
						"server.id",
						"server.ownerId",
						"server.nodeId",
						"server.containerId",
					])
					.executeTakeFirst()
					.catch(() => null);

				if (!server)
					return res.status(400).json({
						status: "error",
						message: "Backup not found",
						error: "BACKUP_NOT_FOUND",
					});

				if (
					server.ownerId !== user.id &&
					!user.admin &&
					!hasPermission(user.id, server.id, "server.files.backups")
				)
					return res.status(403).json({
						status: "error",
						message:
							"You don't have the required permissions to access this resource",
						error: "FORBIDDEN",
					});

				let node = await db
					.selectFrom("node")
					.select(["ssl", "address", "daemonPort"])
					.where("id", "=", server.nodeId)
					.executeTakeFirst();

				if (!node)
					return res.status(400).json({
						status: "error",
						message: "Node not found",
						error: "NODE_NOT_FOUND",
					});

				let query = await db
					.deleteFrom("backup")
					.where("id", "=", id)
					.returning("name")
					.executeTakeFirst()
					.catch(() => null);

				if (!query)
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});

				fetch(
					`${node.ssl ? "https" : "http"}://${node.address}:${
						node.daemonPort
					}/servers/backups`,
					{
						method: "DELETE",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
						},
						body: JSON.stringify({
							containerId: server.containerId,
							name: query.name,
						}),
					}
				).catch(() => {});

				res.status(200).json({
					status: "success",
					message: "Backup deleted successfully",
				});
			} else {
				res.status(401).json({
					status: "error",
					message: "Access token is missing or invalid",
					error: "UNAUTHORIZED",
				});
			}
		} else {
			res.status(401).json({
				status: "error",
				message: "Access token is missing or invalid",
				error: "UNAUTHORIZED",
			});
		}
	},
};
