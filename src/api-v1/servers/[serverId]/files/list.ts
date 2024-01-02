import { Request, Response } from "express";
import Client from "ssh2-sftp-client";

import { db } from "../../../../database";
import { verifyToken } from "../../../../utils/jwt";
import { hasPermission } from "../../../../utils/user";

module.exports = {
	methods: ["GET"],
	/**
	 * @openapi
	 * /servers/{serverId}/files/list:
	 *  get:
	 *   summary: List files in directory
	 *   description: List files in directory.
	 *   tags:
	 *   - Files
	 *   parameters:
	 *   - name: serverId
	 *     in: path
	 *     required: true
	 *     description: Server ID
	 *     schema:
	 *      type: string
	 *   - name: path
	 *     in: query
	 *     required: false
	 *     description: Path to directory
	 *     schema:
	 *      type: string
	 *      example: /
	 *   responses:
	 *    200:
	 *     description: Files listed successfully
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
	 *          example: Files listed successfully
	 *         data:
	 *          type: array
	 *          items:
	 *           type: object
	 *           properties:
	 *            type: string
	 *            name: string
	 *            size: number
	 *            modifyTime: number
	 *            accessTime: number
	 *            rights: object
	 *            owner: number
	 *            group: number
	 *            longname: string
	 *          example:
	 *          - type: d
	 *            name: folder
	 *            size: 0
	 *            modifyTime: 1621234567
	 *            accessTime: 1621234567
	 *            rights:
	 *             user: rwx
	 *             group: r
	 *             other: r
	 *            owner: 1000
	 *            group: 0
	 *            longname: drwxr--r-- 1 1000 0 13 May 17 2021 folder
	 *          - type: '-'
	 *            name: file.txt
	 *            size: 13
	 *            modifyTime: 1621234567
	 *            accessTime: 1621234567
	 *            rights:
	 *             user: rwx
	 *             group: r
	 *             other: r
	 *            owner: 1000
	 *            group: 0
	 *            longname: -rwxr--r-- 1 1000 0 13 May 17 2021 file.txt
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
		let path = req.query.path;
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
					!(await hasPermission(user, server.id, "server.files.list"))
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
					.then(() => sftp.list((path as string) || "/"))
					.then((data) => {
						res.status(200).json({
							status: "success",
							message: "Files listed successfully",
							data: data.sort((a, b) => {
								if (a.type === "d" && b.type !== "d") return -1;
								if (a.type !== "d" && b.type === "d") return 1;
								return a.name.localeCompare(b.name);
							}),
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
