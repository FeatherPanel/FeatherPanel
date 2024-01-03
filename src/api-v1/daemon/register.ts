import "dotenv/config";

import { Request, Response } from "express";

import { db } from "../../database";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;

		if (token && token.trim().split(" ")[1]) {
			if (token.trim().split(" ")[1] !== process.env.DAEMON_SECRET) {
				return res.status(401).json({
					status: "error",
					message: "Access token is missing or invalid",
					error: "UNAUTHORIZED",
				});
			}

			const { name, address, daemonPort, sftpPort, location, ssl } =
				req.body;

			if (
				!name ||
				typeof name !== "string" ||
				!address ||
				typeof address !== "string" ||
				!daemonPort ||
				typeof daemonPort !== "number" ||
				!sftpPort ||
				typeof sftpPort !== "number" ||
				!location ||
				typeof location !== "string" ||
				typeof ssl !== "boolean"
			) {
				return res.status(400).json({
					status: "error",
					message: "Missing parameters",
					error: "BAD_REQUEST",
				});
			}

			let nodeExists = await db
				.selectFrom("node")
				.where("name", "=", name)
				.execute()
				.then((nodes) => nodes.length > 0)
				.catch(() => false);

			if (nodeExists) {
				return res.status(409).json({
					status: "error",
					message: "Node already exists",
					error: "NODE_ALREADY_EXISTS",
				});
			}

			await db
				.insertInto("node")
				.values({
					name,
					address,
					daemonPort,
					sftpPort,
					location,
					ssl,
				})
				.returning("id")
				.executeTakeFirst()
				.then((node) => {
					if (!node)
						return res.status(500).json({
							status: "error",
							message: "Internal server error",
							error: "INTERNAL_SERVER_ERROR",
						});

					res.status(200).json({
						status: "success",
						message: "Node created successfully",
						data: {
							id: node.id,
						},
					});
				})
				.catch((err) => {
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});
				});
		} else {
			return res.status(401).json({
				status: "error",
				message: "Access token is missing or invalid",
				error: "UNAUTHORIZED",
			});
		}
	},
};
