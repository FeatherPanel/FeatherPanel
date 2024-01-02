import "dotenv/config";

import { Request, Response } from "express";

import { db } from "../../../database";
import { io } from "../../../socket";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;
		const { containerId, logs } = req.body;

		if (token && token.trim().split(" ")[1]) {
			if (token.trim().split(" ")[1] !== process.env.DAEMON_SECRET) {
				return res.status(401).json({
					status: "error",
					message: "Access token is missing or invalid",
					error: "UNAUTHORIZED",
				});
			}

			if (
				!containerId ||
				!logs ||
				typeof containerId !== "string" ||
				typeof logs !== "string"
			) {
				return res.status(400).json({
					status: "error",
					message: "Bad request",
					error: "BAD_REQUEST",
				});
			}

			let server = await db
				.selectFrom("server")
				.select("serverId")
				.where("containerId", "=", containerId)
				.executeTakeFirst()
				.catch(() => null);

			if (!server) {
				return res.status(400).json({
					status: "error",
					message: "Server not found",
					error: "SERVER_NOT_FOUND",
				});
			}

			io.to(`servers/${server.serverId}`).emit("servers/logs", {
				status: "success",
				message: "Server logs fetched successfully",
				data: logs,
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
