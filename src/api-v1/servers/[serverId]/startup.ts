import { Request, Response } from "express";

import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";
import { hasPermission } from "../../../utils/user";

module.exports = {
	methods: ["PATCH"],
	/**
	 * @openapi
	 * /servers/{serverId}/startup:
	 *  patch:
	 *   summary: Update server startup command
	 *   description: Update server startup command.
	 *   tags:
	 *   - Servers
	 *   parameters:
	 *   - name: serverId
	 *     in: path
	 *     required: true
	 *     description: Server ID
	 *     schema:
	 *      type: string
	 *   responses:
	 *    200:
	 *     description: Server startup command updated successfully
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
	 *          example: Server startup command updated successfully
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

				if (server.game === "minecraft") {
					const { runType, jarFile, txtFile } = req.body;

					if (
						!runType ||
						typeof runType !== "string" ||
						(runType !== "jar" && runType !== "txt")
					) {
						return res.status(400).json({
							status: "error",
							message:
								"You must provide a valid runType (jar or txt)",
							error: "BAD_REQUEST",
						});
					}

					if (
						runType == "jar" &&
						(!jarFile ||
							typeof jarFile !== "string" ||
							!new RegExp(
								/^(?!\.)(?!com[0-9]$)(?!con$)(?!lpt[0-9]$)(?!nul$)(?!prn$)[^\ \|\*\?\\\:\<\>\&\$\"]*[^\ \.\|\*\?\\\:\<\>\$\"]+(\.jar)$/gi
							).test(jarFile))
					) {
						return res.status(400).json({
							status: "error",
							message: "You must provide a valid jarFile",
							error: "BAD_REQUEST",
						});
					}

					if (
						runType == "txt" &&
						(!txtFile ||
							typeof txtFile !== "string" ||
							!new RegExp(
								/^(?!\.)(?!com[0-9]$)(?!con$)(?!lpt[0-9]$)(?!nul$)(?!prn$)[^\ \|\*\?\\\:\<\>\&\$\"]*[^\ \.\|\*\?\\\:\<\>\$\"]+(\.txt)$/gi
							).test(txtFile))
					) {
						return res.status(400).json({
							status: "error",
							message: "You must provide a valid txtFile",
							error: "BAD_REQUEST",
						});
					}

					fetch(
						`${node.ssl ? "https" : "http"}://${node.address}:${
							node.daemonPort
						}/servers/startup`,
						{
							method: "PATCH",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
							},
							body: JSON.stringify({
								containerId: server.containerId,
								runType,
								jarFile,
								txtFile,
							}),
						}
					)
						.then((r) => r.json())
						.then((data) => {
							if (
								data.status === "success" &&
								data.data?.startCommand
							) {
								db.updateTable("server")
									.set({
										startCommand: data.data.startCommand,
									})
									.where("id", "=", server!.id)
									.execute();

								return res.status(200).json({
									status: "success",
									message:
										"Server startup command updated successfully",
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
					return res.status(400).json({
						status: "error",
						message: "Server game is not supported",
						error: "SERVER_GAME_NOT_SUPPORTED",
					});
				}
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
