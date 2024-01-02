import { hashSync } from "bcryptjs";
import { Request, Response } from "express";

import { CONFIG } from "../../../constants";
import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;

		if (
			!req.body ||
			typeof req.body.name !== "string" ||
			typeof req.body.email !== "string" ||
			typeof req.body.password !== "string" ||
			typeof req.body.admin !== "boolean"
		) {
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

				let name = req.body.name;
				let email = req.body.email;
				let password = req.body.password;
				let admin = req.body.admin;

				if (name.length < 3 || name.length > 32)
					return res.status(400).json({
						status: "error",
						message: "Invalid name",
						error: "INVALID_NAME",
					});

				if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
					return res.status(400).json({
						status: "error",
						message: "Invalid email",
						error: "INVALID_EMAIL",
					});

				if (password.length < 8 || password.length > 32)
					return res.status(400).json({
						status: "error",
						message: "Invalid password",
						error: "INVALID_PASSWORD",
					});

				let userNameExists = await db
					.selectFrom("user")
					.where("name", "=", req.body.name)
					.execute()
					.then((users) => users.length > 0)
					.catch(() => false);

				if (userNameExists)
					return res.status(400).json({
						status: "error",
						message: "User name already exists",
						error: "USER_NAME_ALREADY_EXISTS",
					});

				let userEmailExists = await db
					.selectFrom("user")
					.where("email", "ilike", req.body.email)
					.execute()
					.then((users) => users.length > 0)
					.catch(() => false);

				if (userEmailExists)
					return res.status(400).json({
						status: "error",
						message: "User email already exists",
						error: "USER_EMAIL_ALREADY_EXISTS",
					});

				await db
					.insertInto("user")
					.values({
						name,
						email,
						password: hashSync(password, 10),
						lang: CONFIG.app.lang,
						admin,
					})
					.execute()
					.then(() => {
						res.status(200).json({
							status: "success",
							message: "User created successfully",
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
