import { Request, Response } from "express";

import { db } from "../database";
import { verifyToken } from "../utils/jwt";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		let token = req.headers.authorization;

		if (!token || !token.split(" ")[1])
			return res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
			});

		let decoded = await verifyToken(req, token.split(" ")[1]);

		if (!decoded || !decoded.i || !decoded.e || !decoded.t)
			return res.status(400).json({
				status: "error",
				message: "Access token is missing or invalid",
				error: "UNAUTHORIZED",
			});

		if (decoded?.exp! < Date.now() / 1000)
			return res.status(400).json({
				status: "error",
				message: "Token expired",
				error: "TOKEN_EXPIRED",
			});

		let user = await db
			.selectFrom("user")
			.selectAll()
			.where("id", "=", decoded.i)
			.executeTakeFirst();

		if (!user)
			return res.status(400).json({
				status: "error",
				message: "User not found",
				error: "USER_NOT_FOUND",
			});

		if (user.emailToken !== decoded.t)
			return res.status(400).json({
				status: "error",
				message: "Access token is missing or invalid",
				error: "UNAUTHORIZED",
			});

		await db
			.updateTable("user")
			.set({
				email: decoded.e,
				emailVerified: true,
			})
			.where("id", "=", user.id)
			.execute()
			.then(() => {
				res.status(200).json({
					status: "success",
					message: "Email verified",
				});
			})
			.catch(() => {
				res.status(500).json({
					status: "error",
					message: "Internal server error",
					error: "INTERNAL_SERVER_ERROR",
				});
			});
	},
};
