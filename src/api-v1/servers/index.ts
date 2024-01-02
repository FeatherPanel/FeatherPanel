import { Request, Response } from "express";

import { db } from "../../database";
import { verifyToken } from "../../utils/jwt";

module.exports = {
	methods: ["GET"],
	/**
	 * @openapi
	 * /servers:
	 *  get:
	 *   summary: Get servers
	 *   description: Get all servers the user has access to.
	 *   tags:
	 *   - Servers
	 *   responses:
	 *    200:
	 *     description: Servers fetched successfully
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
	 *          example: Servers fetched successfully
	 *         data:
	 *          type: array
	 *          items:
	 *           type: object
	 *           properties:
	 *            id:
	 *             type: number
	 *             example: 1
	 *            serverId:
	 *             type: string
	 *             example: ABCDEF
	 *            name:
	 *             type: string
	 *             example: My server
	 *            ownerId:
	 *             type: number
	 *             example: 1
	 *            ownerName:
	 *             type: string
	 *             example: John Doe
	 *            port:
	 *             type: number
	 *             example: 25565
	 *            extraPorts:
	 *             type: string
	 *             example: 25566,25567
	 *            cpuUsage:
	 *             type: number
	 *             example: 15.376941176470588
	 *            cpuShares:
	 *             type: number
	 *             example: 10
	 *            ramUsage:
	 *             type: number
	 *             example: 1073741824
	 *            ramLimit:
	 *             type: number
	 *             example: 2147483648
	 *            diskUsage:
	 *             type: number
	 *             example: 1073741824
	 *            diskLimit:
	 *             type: number
	 *             example: 2147483648
	 *            networkRx:
	 *             type: number
	 *             example: 52428800
	 *            networkTx:
	 *             type: number
	 *             example: 1048576
	 *            game:
	 *             type: string
	 *             example: minecraft
	 *            backupsLimit:
	 *             type: number
	 *             example: 5
	 *            startCommand:
	 *             type: string
	 *             example: java -jar server.jar
	 *            status:
	 *             type: string
	 *             example: offline
	 *    401:
	 *     $ref: '#/components/responses/Unauthorized'
	 *    403:
	 *     $ref: '#/components/responses/AccountSuspended'
	 *   security:
	 *   - BearerAuth: []
	 */
	get: async (req: Request, res: Response) => {
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

				let dbUser = await db
					.selectFrom("user")
					.selectAll()
					.where("id", "=", user.id)
					.executeTakeFirst();

				if (!dbUser) {
					return res.status(401).json({
						status: "error",
						message: "Access token is missing or invalid",
						error: "UNAUTHORIZED",
					});
				}

				let servers: any[] = [];
				let ownedServers = await db
					.selectFrom("server")
					.select([
						"id",
						"serverId",
						"name",
						"ownerId",
						"ownerName",
						"port",
						"extraPorts",
						"cpuUsage",
						"cpuShares",
						"ramUsage",
						"ramLimit",
						"diskUsage",
						"diskLimit",
						"networkRx",
						"networkTx",
						"game",
						"backupsLimit",
						"startCommand",
						"status",
					])
					.where("ownerId", "=", dbUser.id)
					.execute()
					.catch(() => []);

				let subuserServers = await db
					.selectFrom("subuser")
					.innerJoin("server", "server.id", "subuser.serverId")
					.where("userId", "=", dbUser.id)
					.select([
						"server.id as id",
						"server.serverId as serverId",
						"server.name as name",
						"server.ownerId as ownerId",
						"server.ownerName as ownerName",
						"server.port as port",
						"server.extraPorts as extraPorts",
						"server.cpuUsage as cpuUsage",
						"server.cpuShares as cpuShares",
						"server.ramUsage as ramUsage",
						"server.ramLimit as ramLimit",
						"server.diskUsage as diskUsage",
						"server.diskLimit as diskLimit",
						"server.networkRx as networkRx",
						"server.networkTx as networkTx",
						"server.game as game",
						"server.backupsLimit as backupsLimit",
						"server.startCommand as startCommand",
						"server.javaVersion as javaVersion",
						"server.status as status",
					])
					.execute()
					.catch(() => []);

				servers = servers.concat(ownedServers);
				servers = servers.concat(subuserServers);
				servers = servers.sort((a, b) => {
					if (a.id < b.id) return -1;
					if (a.id > b.id) return 1;
					return 0;
				});

				res.status(200).json({
					status: "success",
					message: "Servers fetched successfully",
					data: servers,
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
