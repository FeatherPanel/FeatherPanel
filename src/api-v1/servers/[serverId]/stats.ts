import { Request, Response } from "express";

import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";
import { hasPermission } from "../../../utils/user";

module.exports = {
	methods: ["GET"],
	/**
	 * @openapi
	 * /servers/{serverId}/stats:
	 *  get:
	 *   summary: Get server stats
	 *   description: Get server stats like CPU usage, RAM usage and disk usage.
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
	 *     description: Server stats fetched successfully
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
	 *          example: Server stats fetched successfully
	 *         data:
	 *          type: object
	 *          properties:
	 *           cpuUsage:
	 *            type: number
	 *            example: 0.5
	 *           ramUsage:
	 *            type: number
	 *            example: 1073741824
	 *           ramLimit:
	 *            type: number
	 *            example: 2147483648
	 *           diskUsage:
	 *            type: number
	 *            example: 1073741824
	 *           diskLimit:
	 *            type: number
	 *            example: 2147483648
	 *           network:
	 *            type: object
	 *            properties:
	 *             rx:
	 *              type: number
	 *              example: 1073741824
	 *             tx:
	 *              type: number
	 *              example: 1073741824
	 *    400:
	 *     $ref: '#/components/responses/BadRequest'
	 *    401:
	 *     $ref: '#/components/responses/Unauthorized'
	 *    403:
	 *     $ref: '#/components/responses/Forbidden'
	 *    500:
	 *     $ref: '#/components/responses/InternalServerError'
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

				if (!serverId || typeof serverId !== "string")
					return res.status(400).json({
						status: "error",
						message: "Bad request",
						error: "BAD_REQUEST",
					});

				let server = await db
					.selectFrom("server")
					.select([
						"id",
						"ownerId",
						"nodeId",
						"containerId",
						"diskLimit",
						"ramLimit",
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
					}/servers/stats`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
						},
						body: JSON.stringify({
							containerId: server.containerId,
						}),
					}
				)
					.then((r) => r.json())
					.then(async (data) => {
						if (data.status === "success") {
							await db
								.updateTable("server")
								.set({
									cpuUsage: parseFloat(
										data.data.cpuUsage.toString()
									),
									ramUsage: BigInt(data.data.ramUsage),
									ramLimit:
										data.data.ramLimit > 0
											? BigInt(data.data.ramLimit)
											: BigInt(server!.ramLimit),
									diskUsage: BigInt(data.data.diskUsage),
									diskLimit:
										data.data.diskLimit > 0
											? BigInt(data.data.diskLimit)
											: BigInt(server!.diskLimit),
									networkRx: BigInt(data.data.network.rx),
									networkTx: BigInt(data.data.network.tx),
								})
								.where("id", "=", server!.id)
								.execute();

							return res.status(200).json({
								status: "success",
								message: "Server stats fetched successfully",
								data: data.data,
							});
						}

						return res.status(500).json({
							status: data.status || "error",
							message:
								data.message || "Failed to get server stats",
							error: data.error || "INTERNAL_SERVER_ERROR",
						});
					})
					.catch((e) => {
						console.error(e);
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
