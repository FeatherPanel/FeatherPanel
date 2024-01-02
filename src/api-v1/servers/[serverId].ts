import { Request, Response } from "express";

import { db } from "../../database";
import { verifyToken } from "../../utils/jwt";
import { hasPermission } from "../../utils/user";

module.exports = {
	methods: ["GET"],
	/**
	 * @openapi
	 * /servers/{serverId}:
	 *  get:
	 *   summary: Get server infos
	 *   description: Get informations about a server with a given ID.
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
	 *     description: Server infos fetched successfully
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
	 *          example: Server infos fetched successfully
	 *         data:
	 *          type: object
	 *          properties:
	 *           id:
	 *            type: number
	 *            example: 1
	 *           serverId:
	 *            type: string
	 *            example: ABCDEF
	 *           name:
	 *            type: string
	 *            example: My server
	 *           ownerId:
	 *            type: number
	 *            example: 1
	 *           ownerName:
	 *            type: string
	 *            example: John Doe
	 *           nodeAddress:
	 *            type: string
	 *            example: 0.0.0.0
	 *           nodeLocation:
	 *            type: string
	 *            example: France
	 *           port:
	 *            type: number
	 *            example: 25565
	 *           extraPorts:
	 *            type: string
	 *            example: 25566,25567
	 *           cpuUsage:
	 *            type: number
	 *            example: 15.376941176470588
	 *           cpuShares:
	 *            type: number
	 *            example: 10
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
	 *           networkRx:
	 *            type: number
	 *            example: 52428800
	 *           networkTx:
	 *            type: number
	 *            example: 1048576
	 *           game:
	 *            type: string
	 *            example: minecraft
	 *           backupsLimit:
	 *            type: number
	 *            example: 5
	 *           startCommand:
	 *            type: string
	 *            example: java -jar server.jar
	 *           status:
	 *            type: string
	 *            example: offline
	 *    400:
	 *     $ref: '#/components/responses/BadRequest'
	 *    401:
	 *     $ref: '#/components/responses/Unauthorized'
	 *    403:
	 *     $ref: '#/components/responses/Forbidden'
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
					.leftJoin("node", "server.nodeId", "node.id")
					.select([
						"server.id",
						"serverId",
						"server.name",
						"ownerId",
						"ownerName",
						"nodeId",
						"nodeName",
						"node.address as nodeAddress",
						"node.sftpPort as nodeSftpPort",
						"node.location as nodeLocation",
						"port",
						"extraPorts",
						"cpuShares",
						"cpuUsage",
						"ramLimit",
						"ramUsage",
						"diskLimit",
						"diskUsage",
						"game",
						"backupsLimit",
						"containerId",
						"startCommand",
						"javaVersion",
						"status",
					])
					.where("serverId", "=", serverId)
					.executeTakeFirst()
					.catch(() => null);

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

				res.status(200).json({
					status: "success",
					message: "Server infos fetched successfully",
					data: {
						...server,
						nodeId: user.admin ? server.nodeId : undefined,
						nodeName: user.admin ? server.nodeName : undefined,
						containerId: user.admin
							? server.containerId
							: undefined,
					},
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
	 * /servers/{serverId}:
	 *  patch:
	 *   summary: Update server infos
	 *   description: Update informations about a server with a given ID.
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
	 *    description: Server infos
	 *    required: true
	 *    content:
	 *     application/json:
	 *      schema:
	 *       type: object
	 *       properties:
	 *        name:
	 *         type: string
	 *         example: My server
	 *   responses:
	 *    200:
	 *     description: Server infos updated successfully
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
	 *          example: Server infos updated successfully
	 *    400:
	 *     $ref: '#/components/responses/BadRequest'
	 *    401:
	 *     $ref: '#/components/responses/Unauthorized'
	 *    403:
	 *     $ref: '#/components/responses/Forbidden'
	 *   security:
	 *   - BearerAuth: []
	 */
	patch: async (req: Request, res: Response) => {
		const serverId = req.params.serverId;
		const token = req.headers.authorization;
		const { name } = req.body;

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				if (name && typeof name !== "string") {
					return res.status(400).json({
						status: "error",
						message: "Invalid name",
						error: "BAD_REQUEST",
					});
				}

				let server = await db
					.selectFrom("server")
					.select(["id", "serverId", "ownerId"])
					.where("serverId", "=", serverId)
					.executeTakeFirst()
					.catch(() => null);

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

				if (name) {
					if (name.length < 3 || name.length > 32) {
						return res.status(400).json({
							status: "error",
							message:
								"The name must be between 3 and 32 characters",
							error: "BAD_REQUEST",
						});
					}

					let query = await db
						.updateTable("server")
						.set({ name })
						.where("serverId", "=", serverId)
						.execute()
						.catch(() => null);

					if (!query) {
						return res.status(400).json({
							status: "error",
							message: "Server not found",
							error: "SERVER_NOT_FOUND",
						});
					}
				}

				res.status(name ? 200 : 400).json({
					status: "success",
					message: name
						? "Server infos updated successfully"
						: "No changes were made",
				});
			}
		}
	},
};
