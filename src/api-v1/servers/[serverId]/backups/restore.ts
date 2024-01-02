import { Request, Response } from "express";

import { db } from "../../../../database";
import { verifyToken } from "../../../../utils/jwt";
import { hasPermission } from "../../../../utils/user";

module.exports = {
	methods: ["POST"],
	/**
	 * @openapi
	 * /servers/{serverId}/backups/restore:
	 *  post:
	 *   summary: Restore server backup
	 *   description: Restore server backup.
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
	 *     description: Backup restoration started
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
	 *          example: Backup restoration started
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
		const { id } = req.body;
		const serverId = req.params.serverId;
		const token = req.headers.authorization;

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
					.selectFrom("server")
					.where("serverId", "=", serverId)
					.select(["id", "nodeId", "containerId", "ownerId"])
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

				let backup = await db
					.selectFrom("backup")
					.where("serverId", "=", server.id)
					.where("id", "=", id)
					.select("name")
					.executeTakeFirst();

				if (!backup)
					return res.status(400).json({
						status: "error",
						message: "Backup not found",
						error: "BACKUP_NOT_FOUND",
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
						method: "PUT",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
						},
						body: JSON.stringify({
							containerId: server.containerId,
							name: backup.name,
						}),
					}
				)
					.then((r) => r.json())
					.then(async (data) => {
						if (data.status === "pending") {
							return res.status(200).json({
								status: "pending",
								message: "Backup restoration started",
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
};
