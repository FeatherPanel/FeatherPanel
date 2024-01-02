import { Request, Response } from "express";
import detect from "language-detect";
import Client from "ssh2-sftp-client";

import { db } from "../../../../database";
import { verifyToken } from "../../../../utils/jwt";
import { hasPermission } from "../../../../utils/user";

module.exports = {
	methods: ["GET"],
	/**
	 * @openapi
	 * /servers/{serverId}/files/stat:
	 *  get:
	 *   summary: Get file infos
	 *   description: Get file infos.
	 *   tags:
	 *   - Files
	 *   parameters:
	 *   - name: serverId
	 *     in: path
	 *     required: true
	 *     description: Server ID
	 *     schema:
	 *      type: string
	 *   - name: name
	 *     in: query
	 *     required: true
	 *     description: File name
	 *     schema:
	 *      type: string
	 *      example: file.txt
	 *   - name: path
	 *     in: query
	 *     required: false
	 *     description: File path
	 *     schema:
	 *      type: string
	 *      example: /
	 *   responses:
	 *    200:
	 *     description: File infos fetched successfully
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
	 *          example: File infos fetched successfully
	 *         data:
	 *          type: object
	 *          properties:
	 *           mode: number
	 *           uid: number
	 *           gid: number
	 *           size: number
	 *           accessTime: number
	 *           modifyTime: number
	 *           isDirectory: boolean
	 *           isFile: boolean
	 *           isBlockDevice: boolean
	 *           isCharacterDevice: boolean
	 *           isSymbolicLink: boolean
	 *           isFIFO: boolean
	 *           isSocket: boolean
	 *           name: string
	 *           path: string
	 *           language: string
	 *          example:
	 *           mode: 33188
	 *           uid: 1000
	 *           gid: 0
	 *           size: 13
	 *           accessTime: 1621234567
	 *           modifyTime: 1621234567
	 *           isDirectory: false
	 *           isFile: true
	 *           isBlockDevice: false
	 *           isCharacterDevice: false
	 *           isSymbolicLink: false
	 *           isFIFO: false
	 *           isSocket: false
	 *           name: file.txt
	 *           path: /
	 *           language: Text
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
		let { name, path } = req.query;
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
					!name ||
					typeof name !== "string" ||
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
					!(await hasPermission(user, server.id, "server.files.read"))
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
					.then(() => sftp.stat(`${path}/${name}`))
					.then((data) => {
						res.status(200).json({
							status: "success",
							message: "File infos fetched successfully",
							data: {
								...data,
								name,
								path: path + "/",
								language: detect.filename(name as string),
							},
						});
					})
					.catch(() => {
						res.status(500).json({
							status: "error",
							message: "An error occurred while fetching file",
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
