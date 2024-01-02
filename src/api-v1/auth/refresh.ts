import { Request, Response } from "express";

import { verifyToken } from "../../utils/jwt";
import { findUserToken } from "../../utils/user";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
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

				res.status(200).json({
					status: "success",
					message: "Logged in successfully",
					data: {
						token: await findUserToken("id", "=", user.id),
					},
				});
			} else {
				res.status(401).json({
					status: "error",
					message: "Invalid credentials",
					error: "INVALID_CREDENTIALS",
				});
			}
		} else {
			res.status(401).json({
				status: "error",
				message: "Invalid credentials",
				error: "INVALID_CREDENTIALS",
			});
		}
	},
};
