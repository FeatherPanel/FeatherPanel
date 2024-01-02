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
				(status !== "success" && status !== "error")
			) {
				return res.status(400).json({
					status: "error",
					message: "Bad request",
					error: "BAD_REQUEST",
				});
			}

			let server = await db
				.selectFrom("server")
				.select(["id", "serverId"])
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

			if (status === "success") {
				let query = await db
					.updateTable("backup")
					.set({
						status,
					})
					.where("serverId", "=", server!.id)
					.where("status", "=", "in_progress")
					.returning("id")
					.executeTakeFirst()
					.catch(() => null);

				if (!query) {
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});
				}

				io.to(`servers/${server.serverId}`).emit("servers/backups", {
					status: "success",
					message: "Backup status updated successfully",
					data: {
						backup: query.id,
						status,
					},
				});

				return res.status(200).json({
					status: "success",
					message: "Backup status updated successfully",
					data: status,
				});
			} else {
				let query = await db
					.updateTable("backup")
					.set({
						status: "error",
					})
					.where("serverId", "=", server!.id)
					.returning("id")
					.executeTakeFirst()
					.catch(() => null);

				if (!query) {
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});
				}

				io.to(`servers/${server.serverId}`).emit("servers/backups", {
					status: "success",
					message: "Backup status updated successfully",
					data: {
						backup: query.id,
						status: "error",
					},
				});

				return res.status(200).json({
					status: "success",
					message: "Backup status updated successfully",
					data: status,
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
