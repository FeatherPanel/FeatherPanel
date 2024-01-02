import { Request, Response } from "express";

import { db } from "../../../../database";
import { io } from "../../../../socket";
import { verifyToken } from "../../../../utils/jwt";
import { hasPermission } from "../../../../utils/user";

module.exports = {
	methods: ["POST"],
	/**
	 * @openapi
	 * /servers/{serverId}/power/start:
	 *  post:
	 *   summary: Start a server
	 *   description: Start a server.
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
	 *     description: Server starting
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
	 *          example: Server starting...
	 *         data:
	 *          type: string
	 *          example: starting
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
	/**
	 * @openapi
	 * /servers/{serverId}/power/stop:
	 *  post:
	 *   summary: Stop a server
	 *   description: Stop a server.
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
	 *     description: Server stopping
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
	 *          example: Server stopping...
	 *         data:
	 *          type: string
	 *          example: stopping
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
	/**
	 * @openapi
	 * /servers/{serverId}/power/restart:
	 *  post:
	 *   summary: Restart a server
	 *   description: Restart a server.
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
	 *     description: Server restarting
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
	 *          example: Server restarting...
	 *         data:
	 *          type: string
	 *          example: restarting
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
	/**
	 * @openapi
	 * /servers/{serverId}/power/kill:
	 *  post:
	 *   summary: Kill a server
	 *   description: Force the server to stop.
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
	 *     description: Server killing
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
	 *          example: Server killing...
	 *         data:
	 *          type: string
	 *          example: killing
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
	post: async (req: Request, res: Response) => {
		const { serverId, action } = req.params;
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

				if (
					!serverId ||
					typeof serverId !== "string" ||
					!action ||
					typeof action !== "string"
				)
					return res.status(400).json({
						status: "error",
						message: "Bad request",
						error: "BAD_REQUEST",
					});

				if (
					action !== "start" &&
					action !== "stop" &&
					action !== "restart" &&
					action !== "kill"
				)
					return res.status(400).json({
						status: "error",
						message: "Invalid action",
						error: "INVALID_ACTION",
					});

				let server = await db
					.selectFrom("server")
					.select(["id", "ownerId", "nodeId", "containerId"])
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
					!(await hasPermission(
						user.id,
						server.id,
						action === "start"
							? "server.power.on"
							: action === "stop"
							? "server.power.off"
							: action === "restart"
							? "server.power.restart"
							: "server.power.kill"
					))
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
					}/servers/power`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
						},
						body: JSON.stringify({
							containerId: server.containerId,
							action,
							serverId,
						}),
					}
				)
					.then((r) => r.json())
					.then((data) => {
						if (data.status === "success") {
							db.updateTable("server")
								.where("serverId", "=", serverId)
								.set({
									status:
										action === "start"
											? "starting"
											: action === "stop"
											? "stopping"
											: action === "restart"
											? "restarting"
											: "killing",
								})
								.execute();

							io.to(`servers/${serverId}`).emit(
								"servers/status",
								{
									status: "success",
									message: `Server ${
										action === "stop"
											? "stopping"
											: action + "ing"
									}...`,
									data:
										action === "start"
											? "starting"
											: action === "stop"
											? "stopping"
											: action === "restart"
											? "restarting"
											: "killing",
								}
							);

							io.to(`servers/${serverId}`).emit("servers/power", {
								status: "success",
								message: `Server ${
									action === "stop"
										? "stopping"
										: action + "ing"
								}...`,
								data: action,
							});

							return res.status(200).json({
								status: "success",
								message: `Server ${
									action === "stop"
										? "stopping"
										: action + "ing"
								}...`,
								data: action,
							});
						}

						return res.status(500).json({
							status: data.status || "error",
							message: data.message || "Failed to start server",
							error: data.error || "FAILED_TO_START_SERVER",
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
