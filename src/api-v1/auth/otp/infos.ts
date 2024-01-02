import { Request, Response } from "express";

import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";

module.exports = {
	methods: ["GET"],
	get: async (req: Request, res: Response) => {
		const token = req.headers.authorization;

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id && !user.fromApi) {
				if (user.suspended) {
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});
				}

				const dbUser = await db
					.selectFrom("user")
					.select(["otpAuthUrl", "otpSecret"])
					.where("id", "=", user.id)
					.executeTakeFirst()
					.catch(() => null);

				if (!dbUser || !dbUser.otpSecret || !dbUser.otpAuthUrl)
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});

				res.status(200).json({
					status: "success",
					message: "OTP information retrieved successfully",
					data: {
						otpAuthUrl: dbUser.otpAuthUrl,
						otpSecret: dbUser.otpSecret,
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
