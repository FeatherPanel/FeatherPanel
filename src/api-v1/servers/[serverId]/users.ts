import { Request, Response } from "express";

import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";
import { hasPermission } from "../../../utils/user";

module.exports = {
	methods: ["GET", "POST", "PATCH", "DELETE"],
	/**
	 * @openapi
	 * /servers/{serverId}/users:
	 *  get:
	 *   summary: Get server subusers
	 *   description: Get server subusers.
	 *   tags:
	 *   - Subusers
	 *   parameters:
	 *   - name: serverId
	 *     in: path
	 *     required: true
	 *     description: Server ID
	 *     schema:
	 *      type: string
	 *   responses:
	 *    200:
	 *     description: Server users fetched successfully
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
	 *          example: Server users fetched successfully
	 *         data:
	 *          type: array
	 *          items:
	 *           type: object
	 *           properties:
	 *            id:
	 *             type: number
	 *             description: Subuser ID (≠ User ID)
	 *             example: 1
	 *            name:
	 *             type: string
	 *             description: User name
	 *             example: John Doe
	 *            email:
	 *             type: string
	 *             description: User email
	 *             example: john.doe@example.com
	 *            permissions:
	 *             type: array
	 *             description: Subuser permissions
	 *             items:
	 *              type: string
	 *              description: Permission name
	 *             example:
	 *             - server.power.on
	 *             - server.power.off
	 *             - server.power.restart
	 *             - server.power.kill
	 *             - server.console.send
	 *             - server.console.read
	 *             - server.console.history
	 *             - server.files.list
	 *             - server.files.read
	 *             - server.files.write
	 *             - server.files.copy
	 *             - server.files.rename
	 *             - server.files.delete
	 *             - server.files.sftp
	 *             - server.files.backups
	 *             - server.settings.view
	 *             - server.settings.edit
	 *             - server.subusers.view
	 *             - server.subusers.manage
	 *            createdAt:
	 *             type: string
	 *             description: Subuser creation date
	 *             example: 2021-01-01T00:00:00.000Z
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
		const token = req.headers.authorization;
		const serverId = req.params.serverId;

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id && !user.fromApi) {
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
					.where("serverId", "=", serverId)
					.select(["id", "ownerId"])
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
					!hasPermission(user.id, server.id, "server.subusers.view")
				)
					return res.status(403).json({
						status: "error",
						message:
							"You don't have the required permissions to access this resource",
						error: "FORBIDDEN",
					});

				let users = [];
				users = await db
					.selectFrom("subuser")
					.where("serverId", "=", server.id)
					.innerJoin("user", "subuser.userId", "user.id")
					.select([
						"subuser.id",
						"subuser.permissions",
						"subuser.createdAt",
						"user.name",
						"user.email",
					])
					.execute()
					.catch(() => []);

				users = users.sort((a, b) => {
					if (a.id < b.id) return -1;
					if (a.id > b.id) return 1;
					return 0;
				});

				res.status(200).json({
					status: "success",
					message: "Server users fetched successfully",
					data: users,
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
	 * /servers/{serverId}/users:
	 *  post:
	 *   summary: Add server subuser
	 *   description: Add server subuser.
	 *   tags:
	 *   - Subusers
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
	 *        email:
	 *         type: string
	 *         description: User email
	 *         example: john.doe@example.com
	 *        permissions:
	 *         type: array
	 *         description: Subuser permissions
	 *         items:
	 *          type: string
	 *          example: server.power.on
	 *          enum:
	 *          - server.power.on
	 *          - server.power.off
	 *          - server.power.restart
	 *          - server.power.kill
	 *          - server.console.send
	 *          - server.console.read
	 *          - server.console.history
	 *          - server.files.list
	 *          - server.files.read
	 *          - server.files.write
	 *          - server.files.copy
	 *          - server.files.rename
	 *          - server.files.delete
	 *          - server.files.sftp
	 *          - server.files.backups
	 *          - server.settings.view
	 *          - server.settings.edit
	 *          - server.subusers.view
	 *          - server.subusers.manage
	 *         example:
	 *         - server.power.on
	 *         - server.power.off
	 *         - server.power.restart
	 *         - server.power.kill
	 *         - server.console.send
	 *         - server.console.read
	 *         - server.console.history
	 *         - server.files.list
	 *         - server.files.read
	 *         - server.files.write
	 *         - server.files.copy
	 *         - server.files.rename
	 *         - server.files.delete
	 *         - server.files.sftp
	 *         - server.files.backups
	 *         - server.settings.view
	 *         - server.settings.edit
	 *         - server.subusers.view
	 *         - server.subusers.manage
	 *   responses:
	 *    200:
	 *     description: Subuser added successfully
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
	 *          example: Subuser added successfully
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
		const { email, permissions } = req.body;
		const serverId = req.params.serverId;
		const token = req.headers.authorization;

		if (
			!email ||
			typeof email !== "string" ||
			!serverId ||
			typeof serverId !== "string" ||
			!permissions ||
			!Array.isArray(permissions)
		)
			return res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
			});

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id && !user.fromApi) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
					return res.status(400).json({
						status: "error",
						message: "Invalid email",
						error: "USER_NOT_FOUND",
					});

				let server = await db
					.selectFrom("server")
					.leftJoin("user", "server.ownerId", "user.id")
					.where("serverId", "=", serverId)
					.select(["server.id", "server.ownerId", "user.email"])
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
					!hasPermission(user.id, server.id, "server.subusers.manage")
				)
					return res.status(403).json({
						status: "error",
						message:
							"You don't have the required permissions to access this resource",
						error: "FORBIDDEN",
					});

				if (email === server.email)
					return res.status(400).json({
						status: "error",
						message: "You cannot add yourself as a subuser",
						error: "ALREADY_EXISTS",
					});

				let dbUser = await db
					.selectFrom("user")
					.where("email", "=", email)
					.select(["id"])
					.executeTakeFirst()
					.catch(() => null);

				if (!dbUser)
					return res.status(400).json({
						status: "error",
						message: "User not found",
						error: "USER_NOT_FOUND",
					});

				let subuserExists = await db
					.selectFrom("subuser")
					.where("userId", "=", user.id)
					.where("subuser.userId", "=", dbUser.id)
					.execute()
					.then((users) => users.length > 0)
					.catch(() => null);

				if (subuserExists)
					return res.status(400).json({
						status: "error",
						message: "Subuser already exists",
						error: "ALREADY_EXISTS",
					});

				let query = await db
					.insertInto("subuser")
					.values({
						serverId: server.id,
						userId: dbUser.id,
						permissions: JSON.stringify(permissions),
					})
					.execute()
					.catch((err) => null);

				if (!query)
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});

				res.status(200).json({
					status: "success",
					message: "Subuser added successfully",
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
	 * /servers/{serverId}/users:
	 *  patch:
	 *   summary: Update server subuser
	 *   description: Update server subuser.
	 *   tags:
	 *   - Subusers
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
	 *        userId:
	 *         type: number
	 *         description: Subuser ID
	 *         example: 1
	 *        permissions:
	 *         type: array
	 *         description: Subuser permissions
	 *         items:
	 *          type: string
	 *          example: server.power.on
	 *          enum:
	 *          - server.power.on
	 *          - server.power.off
	 *          - server.power.restart
	 *          - server.power.kill
	 *          - server.console.send
	 *          - server.console.read
	 *          - server.console.history
	 *          - server.files.list
	 *          - server.files.read
	 *          - server.files.write
	 *          - server.files.copy
	 *          - server.files.rename
	 *          - server.files.delete
	 *          - server.files.sftp
	 *          - server.files.backups
	 *          - server.settings.view
	 *          - server.settings.edit
	 *          - server.subusers.view
	 *          - server.subusers.manage
	 *         example:
	 *         - server.power.on
	 *         - server.power.off
	 *         - server.power.restart
	 *         - server.power.kill
	 *         - server.console.send
	 *         - server.console.read
	 *         - server.console.history
	 *         - server.files.list
	 *         - server.files.read
	 *         - server.files.write
	 *         - server.files.copy
	 *         - server.files.rename
	 *         - server.files.delete
	 *         - server.files.sftp
	 *         - server.files.backups
	 *         - server.settings.view
	 *         - server.settings.edit
	 *         - server.subusers.view
	 *         - server.subusers.manage
	 *   responses:
	 *    200:
	 *     description: Subuser updated successfully
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
	 *          example: Subuser updated successfully
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
	patch: async (req: Request, res: Response) => {
		const token = req.headers.authorization;
		const { permissions, userId } = req.body;

		if (
			!userId ||
			typeof userId !== "number" ||
			!permissions ||
			!Array.isArray(permissions)
		)
			return res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
			});

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id && !user.fromApi) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				let server = await db
					.selectFrom("subuser")
					.where("subuser.id", "=", userId)
					.innerJoin("server", "subuser.serverId", "server.id")
					.select(["server.id", "server.ownerId"])
					.executeTakeFirst()
					.catch(() => null);

				if (!server)
					return res.status(400).json({
						status: "error",
						message: "User not found",
						error: "USER_NOT_FOUND",
					});

				if (
					server.ownerId !== user.id &&
					!user.admin &&
					!hasPermission(user.id, server.id, "server.subusers.manage")
				)
					return res.status(403).json({
						status: "error",
						message:
							"You don't have the required permissions to access this resource",
						error: "FORBIDDEN",
					});

				let query = await db
					.updateTable("subuser")
					.set({
						permissions: JSON.stringify(permissions),
					})
					.where("id", "=", userId)
					.execute()
					.catch(() => null);

				if (!query)
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});

				res.status(200).json({
					status: "success",
					message: "Subuser updated successfully",
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
	 * /servers/{serverId}/users:
	 *  delete:
	 *   summary: Delete server subuser
	 *   description: Delete server subuser.
	 *   tags:
	 *   - Subusers
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
	 *         description: Subuser ID
	 *         example: 1
	 *   responses:
	 *    200:
	 *     description: Subuser deleted successfully
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
	 *          example: Subuser deleted successfully
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
	delete: async (req: Request, res: Response) => {
		const token = req.headers.authorization;
		const id = req.body.id;

		if (!id || typeof id !== "number")
			return res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
			});

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id && !user.fromApi) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				let server = await db
					.selectFrom("subuser")
					.where("subuser.id", "=", id)
					.innerJoin("server", "subuser.serverId", "server.id")
					.select(["server.id", "server.ownerId"])
					.executeTakeFirst()
					.catch(() => null);

				if (!server)
					return res.status(400).json({
						status: "error",
						message: "User not found",
						error: "USER_NOT_FOUND",
					});

				if (
					server.ownerId !== user.id &&
					!user.admin &&
					!hasPermission(user.id, server.id, "server.subusers.manage")
				)
					return res.status(403).json({
						status: "error",
						message:
							"You don't have the required permissions to access this resource",
						error: "FORBIDDEN",
					});

				let query = await db
					.deleteFrom("subuser")
					.where("id", "=", id)
					.execute()
					.catch(() => null);

				if (!query)
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});

				res.status(200).json({
					status: "success",
					message: "Subuser deleted successfully",
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
