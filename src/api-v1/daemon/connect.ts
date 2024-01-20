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

			let { id, ssl, sftpPort } = req.body;

			if (
				typeof req.body.id !== "number" ||
				typeof req.body.ssl !== "boolean" ||
				typeof req.body.sftpPort !== "number"
			) {
				return res.status(400).json({
					status: "error",
					message: "Missing parameters",
					error: "BAD_REQUEST",
				});
			}

			let ip = req.socket.remoteAddress;

			if (!ip)
				return res.status(500).json({
					status: "error",
					message: "Internal server error",
					error: "INTERNAL_SERVER_ERROR",
				});

			if (ip.startsWith("::ffff:")) ip = ip.slice(7);

			let nodeExists = await db
				.selectFrom("node")
				.where("id", "=", id)
				.execute()
				.then((value) => value.length > 0)
				.catch(() => false);

			if (!nodeExists) {
				return res.status(400).json({
					status: "error",
					message: "Node not found",
					error: "NODE_NOT_FOUND",
				});
			}

			await db
				.updateTable("node")
				.set({
					address: ip,
					ssl,
					sftpPort,
				})
				.where("id", "=", id)
				.executeTakeFirst()
				.then(() => {
					return res.status(200).json({
						status: "success",
						message: "Node updated successfully",
					});
				})
				.catch(() => {
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
