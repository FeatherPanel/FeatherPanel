import { Request, Response } from "express";

import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;

		if (!req.body || typeof req.body.userId !== "number") {
			return res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
			});
		}

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

				let serverCount = await db
					.selectFrom("server")
					.where("ownerId", "=", dbUser.id)
					.execute()
					.then((servers) => servers.length)
					.catch(() => 0);

				res.status(200).json({
					status: "success",
					message: "User fetched successfully",
					data: {
						...dbUser,
						serverCount,
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
};
