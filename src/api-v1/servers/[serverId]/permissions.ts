import { Request, Response } from "express";

import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";

module.exports = {
	methods: ["GET"],
	get: async (req: Request, res: Response) => {
		const serverId = req.params.serverId;
		const token = req.headers.authorization;

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
					.select(["id", "ownerId"])
					.where("serverId", "=", serverId)
					.executeTakeFirst()
					.catch(() => null);

				if (!server)
					return res.status(400).json({
						status: "error",
						message: "Server not found",
						error: "SERVER_NOT_FOUND",
					});

				if (server.ownerId === user.id || user.admin)
					return res.status(200).json({
						status: "success",
						message: "Permissions fetched successfully",
						data: ["*"],
					});

				let subuser = await db
					.selectFrom("subuser")
					.select(["permissions"])
					.where("serverId", "=", server.id)
					.where("userId", "=", user.id)
					.executeTakeFirst()
					.catch(() => null);

				if (!subuser)
					return res.status(403).json({
						status: "error",
						message:
							"You don't have the required permissions to access this resource",
						error: "FORBIDDEN",
					});

				res.status(200).json({
					status: "success",
					message: "Permissions fetched successfully",
					data: subuser.permissions,
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
