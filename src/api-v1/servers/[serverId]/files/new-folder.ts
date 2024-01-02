import { Request, Response } from "express";
import Client from "ssh2-sftp-client";

import { db } from "../../../../database";
import { verifyToken } from "../../../../utils/jwt";
import { hasPermission } from "../../../../utils/user";

module.exports = {
	methods: ["POST"],
	/**
	 * @openapi
	 * /servers/{serverId}/files/new-folder:
	 *  post:
	 *   summary: Create new folder
	 *   description: Create new folder in directory.
	 *   tags:
	 *   - Files
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
	 *         description: Folder name
	 *         example: folder
	 *         required: true
	 *        path:
	 *         type: string
	 *         description: Folder path
	 *         example: /
	 *   responses:
	 *    200:
	 *     description: Folder created successfully
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
	 *          example: Folder created successfully
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
		let { name, path } = req.body;
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

				if (
					!serverId ||
					typeof serverId !== "string" ||
					(path && typeof path !== "string")
				)
					return res.status(400).json({
						status: "error",
						message: "Bad request",
						error: "BAD_REQUEST",
					});

				if (!path) path = "";
				if (path.endsWith("/")) path = path.slice(0, -1);

				let server = await db
					.selectFrom("server")
					.select(["id", "ownerId", "ownerName", "nodeId"])
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
						user,
						server.id,
						"server.files.write"
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
					.select(["ssl", "address", "daemonPort", "sftpPort"])
					.where("id", "=", server.nodeId)
					.executeTakeFirst();

				if (!node)
					return res.status(400).json({
						status: "error",
						message: "Node not found",
						error: "NODE_NOT_FOUND",
					});

				// SFTP
				let sftp = new Client();
				sftp.connect({
					host: node.address,
					port: node.sftpPort,
					username: `${serverId}_${server.ownerName.toLowerCase()}`,
					password: process.env.SFTP_SECRET,
				})
					.then(() => sftp.mkdir(`${path}/${name}`, true))
					.then(() => {
						res.status(200).json({
							status: "success",
							message: "Folder created successfully",
						});
					})
					.catch(() => {
						res.status(500).json({
							status: "error",
							message: "An error occurred while creating folder",
							error: "INTERNAL_SERVER_ERROR",
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
