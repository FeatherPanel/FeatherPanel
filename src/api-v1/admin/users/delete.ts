import { Request, Response } from "express";

import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;

		if (!req.body || typeof req.body.userId !== "number")
			return res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
			});

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && !user.fromApi) {
				if (!user.admin) {
					return res.status(403).json({
						status: "error",
						message:
							"You don't have the required permissions to access this resource",
						error: "FORBIDDEN",
					});
				}

				let dbUser = await db
					.selectFrom("user")
					.selectAll()
					.where("id", "=", req.body.userId)
					.executeTakeFirst();

				if (!dbUser)
					return res.status(400).json({
						status: "error",
						message: "User not found",
						error: "USER_NOT_FOUND",
					});

				if (dbUser.superuser)
					return res.status(403).json({
						status: "error",
						message: "Cannot delete superuser",
						error: "CANNOT_DELETE_SUPERUSER",
					});

				await db
					.deleteFrom("user")
					.where("id", "=", req.body.userId)
					.execute()
					.then(() => {
						res.status(200).json({
							status: "success",
							message: "User deleted",
						});
					})
					.catch(() => {
						res.status(500).json({
							status: "error",
							message: "Internal server error",
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
