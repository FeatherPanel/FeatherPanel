import "dotenv/config";

import { Request, Response } from "express";

import { db } from "../../../database";
import { io } from "../../../socket";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;
		const { containerId, status } = req.body;

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
				!status ||
				typeof containerId !== "string" ||
				(status !== "online" &&
					status !== "offline" &&
					status !== "unknown" &&
					status !== "starting" &&
					status !== "stopping" &&
					status !== "restarting" &&
					status !== "killing")
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

			await db
				.updateTable("server")
				.set({
					status,
				})
				.where("serverId", "=", server.serverId)
				.executeTakeFirst()
				.then((value) => {
					res.status(200).json({
						status: "success",
						message: "Server status updated successfully",
					});
				})
				.catch(() => {
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});
				});

			io.to(`servers/${server.serverId}`).emit("servers/status", {
				status: "success",
				message: "Server status updated successfully",
				data: status,
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
