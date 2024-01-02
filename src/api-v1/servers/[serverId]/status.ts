import { Request, Response } from "express";

import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";
import { hasPermission } from "../../../utils/user";

module.exports = {
	methods: ["GET"],
	/**
	 * @openapi
	 * /servers/{serverId}/status:
	 *  get:
	 *   summary: Get server status
	 *   description: Get server status.
	 *   tags:
	 *   - Power
	 *   parameters:
	 *   - name: serverId
	 *     in: path
	 *     required: true
	 *     description: Server ID
	 *     schema:
	 *      type: string
	 *   responses:
	 *    200:
	 *     description: Status fetched successfully
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
	 *          example: Status fetched successfully
	 *         data:
	 *          type: string
	 *          example: starting
	 *          enum:
	 *          - starting
	 *          - stopping
	 *          - restarting
	 *          - killing
	 *          - unknown
	 *    400:
	 *     $ref: "#/components/responses/BadRequest"
	 *    401:
	 *     $ref: "#/components/responses/Unauthorized"
	 *    403:
	 *     $ref: "#/components/responses/Forbidden"
	 *    500:
	 *     $ref: "#/components/responses/InternalServerError"
	 *   security:
	 *   - BearerAuth: []
	 */
	get: async (req: Request, res: Response) => {
		const serverId = req.params.serverId;
		const token = req.headers.authorization;

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
					.select([
						"id",
						"ownerId",
						"nodeId",
						"containerId",
						"port",
						"status",
					])
					.where("serverId", "=", serverId)
					.executeTakeFirst();

				if (!server) {
					return res.status(400).json({
						status: "error",
						message: "Server not found",
						error: "SERVER_NOT_FOUND",
					});
				}

				if (
					(!server.ownerId || server.ownerId !== user.id) &&
					!user.admin &&
					!(await hasPermission(user.id, server.id))
				) {
					return res.status(403).json({
						status: "error",
						message:
							"You don't have the required permissions to access this resource",
						error: "FORBIDDEN",
					});
				}

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
					}/servers/status`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
						},
						body: JSON.stringify({
							containerId: server.containerId,
							port: server.port,
						}),
					}
				)
					.then((r) => r.json())
					.then((data) => {
						if (data.status === "success") {
							let status: any = "unknown";

							if (
								data.data === "running" &&
								(server?.status === "starting" ||
									server?.status === "stopping" ||
									server?.status === "restarting" ||
									server?.status === "killing")
							) {
								status = server?.status;
							} else if (
								data.data === "online" &&
								(server?.status === "stopping" ||
									server?.status === "restarting" ||
									server?.status === "killing")
							) {
								status = server?.status;
							} else if (data.data === "online") {
								status = "online";
							} else if (data.data === "offline") {
								status = "offline";
							}

							db.updateTable("server")
								.where("serverId", "=", serverId)
								.set({
									status,
								})
								.execute();

							return res.status(200).json({
								status: "success",
								message: "Status fetched successfully",
								data: status,
							});
						}

						return res.status(500).json({
							status: data.status || "error",
							message: data.message || "Failed to get status",
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
