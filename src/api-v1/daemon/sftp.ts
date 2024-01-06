import "dotenv/config";

import { compareSync } from "bcryptjs";
import { Request, Response } from "express";
import { sql } from "kysely";

import { db } from "../../database";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;
		const { username, password } = req.body;

		if (token && token.trim().split(" ")[1]) {
			if (token.trim().split(" ")[1] !== process.env.DAEMON_SECRET) {
				return res.status(401).json({
					status: "error",
					message: "Access token is missing or invalid",
					error: "UNAUTHORIZED",
				});
			}

			if (
				!username ||
				typeof username !== "string" ||
				!password ||
				typeof password !== "string"
			) {
				return res.status(400).json({
					status: "error",
					message: "Missing parameters",
					error: "BAD_REQUEST",
				});
			}

			let serverId = username.split("_")[0];
			let nameArray = username.split("_");
			nameArray.shift();
			let name = nameArray.join("_");

			let server = await db
				.selectFrom("server")
				.select(["id", "ownerId", "containerId"])
				.where("serverId", "=", serverId.toUpperCase())
				.executeTakeFirst()
				.catch(() => null);

			if (!server)
				return res.status(400).json({
					status: "error",
					message: "Server not found",
					error: "SERVER_NOT_FOUND",
				});

			let user = await db
				.selectFrom("user")
				.select(["id", "password"])
				.where(sql`LOWER(name) = ${name.toLowerCase()}`)
				.executeTakeFirst()
				.catch(() => null);

			if (!user)
				return res.status(400).json({
					status: "error",
					message: "User not found",
					error: "USER_NOT_FOUND",
				});

			if (
				!compareSync(password, user.password) &&
				password !== process.env.SFTP_SECRET
			)
				return res.status(401).json({
					status: "error",
					message: "Invalid password",
					error: "INVALID_PASSWORD",
				});

			if (user.id === server.ownerId) {
				return res.status(200).json({
					status: "success",
					message: "Valid token",
					data: {
						containerId: server.containerId,
						owner: true,
						permissions: ["*"],
					},
				});
			} else {
				let permissions = [];

				let subuser = await db
					.selectFrom("subuser")
					.where("userId", "=", user.id)
					.where("serverId", "=", server.id)
					.select("permissions")
					.executeTakeFirst()
					.catch(() => null);

				if (subuser) {
					try {
						permissions = JSON.parse(subuser.permissions);
					} catch {
						return res.status(403).json({
							status: "error",
							message: "No permission",
							error: "NO_PERMISSION",
						});
					}
				}

				if (
					!permissions.includes("server.files.sftp") &&
					!permissions.includes("server.files.*")
				)
					return res.status(403).json({
						status: "error",
						message: "No permission",
						error: "NO_PERMISSION",
					});

				return res.status(200).json({
					status: "success",
					message: "Valid token",
					data: {
						containerId: server.containerId,
						owner: true,
						permissions,
					},
				});
			}
		} else {
			return res.status(401).json({
				status: "error",
				message: "Access token is missing or invalid",
				error: "UNAUTHORIZED",
			});
		}
	},
};
