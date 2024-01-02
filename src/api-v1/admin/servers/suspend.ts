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
					.updateTable("server")
					.set({
						suspended: true,
					})
					.where("serverId", "=", req.body.serverId)
					.returningAll()
					.executeTakeFirst();

				if (!server) {
					res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});
				}

				let node = await db
					.selectFrom("node")
					.selectAll()
					.where("id", "=", server!.nodeId)
					.executeTakeFirst();

				if (node) {
					await fetch(
						`${node.ssl ? "https" : "http"}://${node.address}:${
							node.daemonPort
						}/api/servers/suspend`,
						{
							method: "POST",
							headers: {
								Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
								"Content-Type": "application/json",
							},
							body: JSON.stringify({
								serverId: req.body.serverId,
							}),
						}
					).catch();
				}

				res.status(200).json({
					status: "success",
					message: "Server suspended",
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
