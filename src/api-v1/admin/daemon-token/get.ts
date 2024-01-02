import "dotenv/config";

import { Request, Response } from "express";

import { verifyToken } from "../../../utils/jwt";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;

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

				return res.status(200).json({
					status: "success",
					message: "Daemon token fetched successfully",
					data: {
						token: process.env.DAEMON_SECRET,
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
