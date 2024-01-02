import { Request, Response } from "express";

import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";
import { hasPermission } from "../../../utils/user";

module.exports = {
	methods: ["PATCH"],
	/**
	 * @openapi
	 * /servers/{serverId}/java:
	 *  patch:
	 *   summary: Update java version (Minecraft)
	 *   description: Update java version for Minecraft servers.
	 *   tags:
	 *   - Servers
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
	 *        javaVersion:
	 *         type: string
	 *         description: Java version
	 *         example: 16
	 *   responses:
	 *    200:
	 *     description: Java version updated successfully
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
	 *          example: Java version updated successfully
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
	patch: async (req: Request, res: Response) => {
		const serverId = req.params.serverId;
		const token = req.headers.authorization;
		const { javaVersion } = req.body;

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				if (
					!javaVersion ||
					typeof javaVersion !== "string" ||
					!javaVersion.match(/^(8|11|17|21)$/)
				) {
					return res.status(400).json({
						status: "error",
						message:
							"You must provide a valid javaVersion (8, 11, 17 or 21)",
						error: "BAD_REQUEST",
					});
				}

				let server = await db
					.selectFrom("server")
					.select(["id", "ownerId", "nodeId", "containerId", "game"])
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
					}/servers/java`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
						},
						body: JSON.stringify({
							containerId: server.containerId,
							javaVersion,
						}),
					}
				)
					.then((r) => r.json())
					.then((data) => {
						if (data.status === "success") {
							db.updateTable("server")
								.set({
									javaVersion,
								})
								.where("id", "=", server!.id)
								.execute();

							return res.status(200).json({
								status: "success",
								message: "Java version updated successfully",
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
