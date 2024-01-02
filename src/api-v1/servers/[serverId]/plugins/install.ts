import { Request, Response } from "express";

import { db } from "../../../../database";
import { verifyToken } from "../../../../utils/jwt";
import { hasPermission } from "../../../../utils/user";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const serverId = req.params.serverId;
		const token = req.headers.authorization;

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				if (!serverId || typeof serverId !== "string")
					return res.status(400).json({
						status: "error",
						message: "Bad request",
						error: "BAD_REQUEST",
					});

				let server = await db
					.selectFrom("server")
					.select(["id", "ownerId", "nodeId", "containerId", "game"])
					.where("serverId", "=", serverId)
					.executeTakeFirst();

				if (!server) {
					return res.status(400).json({
						status: "error",
						message: "Server not found",
						error: "SERVER_NOT_FOUND",
					});
				}

				if (
					(!server.ownerId || server.ownerId !== user.id) &&
					!user.admin &&
					!(await hasPermission(
						user.id,
						server.id,
						"server.plugins.install"
					))
				) {
					return res.status(403).json({
						status: "error",
						message:
							"You don't have the required permissions to access this resource",
						error: "FORBIDDEN",
					});
				}

				if (server.game === "minecraft") {
					const { id, type, version } = req.body;

					if (
						!id ||
						!type ||
						!version ||
						typeof id !== "string" ||
						typeof type !== "string" ||
						typeof version !== "string"
					) {
						return res.status(400).json({
							status: "error",
							message: "Bad request",
							error: "BAD_REQUEST",
						});
					}

					let node = await db
						.selectFrom("node")
						.select(["ssl", "address", "daemonPort"])
						.where("id", "=", server.nodeId)
						.executeTakeFirst();

					if (!node)
						return res.status(400).json({
							status: "error",
							message: "Node not found",
							error: "NODE_NOT_FOUND",
						});

					fetch(
						`${node.ssl ? "https" : "http"}://${node.address}:${
							node.daemonPort
						}/servers/plugins/install`,
						{
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
							},
							body: JSON.stringify({
								containerId: server.containerId,
								id,
								type,
								version,
							}),
						}
					)
						.then((r) => r.json())
						.then((data) => {
							if (data.status === "success") {
								return res.status(200).json({
									status: "success",
									message: "Plugin installed successfully",
								});
							}

							return res.status(500).json({
								status: data.status || "error",
								message:
									data.message || "Failed to send command",
								error: data.error || "INTERNAL_SERVER_ERROR",
							});
						})
						.catch(() => {
							return res.status(500).json({
								status: "error",
								message: "Could not connect to node",
								error: "COULD_NOT_CONNECT_TO_NODE",
							});
						});
				} else {
					return res.status(400).json({
						status: "error",
						message: "You can't install plugins on this server",
						error: "PLUGIN_INSTALL_NOT_SUPPORTED",
					});
				}
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
