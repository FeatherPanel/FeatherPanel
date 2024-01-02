import fetch from "cross-fetch";
import { Request, Response } from "express";

import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;

		if (!req.body || typeof req.body.serverId !== "string")
			return res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
			});

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

				let server = await db
					.selectFrom("server")
					.select(["nodeId", "containerId"])
					.where("serverId", "=", req.body.serverId)
					.executeTakeFirst();

				if (!server) {
					return res.status(400).json({
						status: "error",
						message: "Server not found",
						error: "SERVER_NOT_FOUND",
					});
				}

				let node = await db
					.selectFrom("node")
					.select(["id", "address", "daemonPort", "ssl"])
					.where("id", "=", server.nodeId)
					.executeTakeFirst();

				if (!node)
					return res.status(400).json({
						status: "error",
						message: "Node not found",
						error: "NODE_NOT_FOUND",
					});

				await fetch(
					`${node.ssl ? "https" : "http"}://${node.address}:${
						node.daemonPort
					}/servers/delete`,
					{
						method: "POST",
						headers: {
							Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							containerId: server.containerId,
						}),
					}
				)
					.then(async (r) => {
						let data = await r.json();

						if (data.status === "success") {
							await db
								.deleteFrom("server")
								.where("serverId", "=", req.body.serverId)
								.executeTakeFirst();

							return res.status(200).json({
								status: "success",
								message: "Server deleted",
							});
						} else {
							return res.status(r.status || 500).json({
								status: data.status || "error",
								message:
									data.message || "Internal server error",
								error: data.error || "INTERNAL_SERVER_ERROR",
								debug: data.debug || null,
							});
						}
					})
					.catch((error) => {
						return res.status(500).json({
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
