import "dotenv/config";

import fetch from "cross-fetch";
import { Request, Response } from "express";

import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;

		if (!req.body || !req.body.nodeId) {
			return res.status(400).json({
				status: "error",
				message: "Invalid request",
				error: "INVALID_REQUEST",
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

				let node = await db
					.selectFrom("node")
					.selectAll()
					.where("id", "=", req.body.nodeId)
					.executeTakeFirst();

				if (!node) {
					return res.status(400).json({
						status: "error",
						message: "Node not found",
						error: "NODE_NOT_FOUND",
					});
				}

				return await fetch(
					`${node.ssl ? "https" : "http"}://${node.address}:${
						node.daemonPort
					}/ping`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
						},
						body: JSON.stringify({
							start: req.body.start || Date.now(),
						}),
					}
				)
					.then((res) => res.json())
					.then((data) => {
						if (data.status !== "success") {
							return res.status(500).json({
								status: data.status || "error",
								message: data.message || "Failed to ping node",
								error: data.error || "FAILED_TO_PING_NODE",
							});
						}

						return res.status(200).json({
							status: "success",
							message: "Node pinged successfully",
							data: {
								start: data.data.start,
								end: Date.now(),
								responseTime: Date.now() - data.data.start,
							},
						});
					})
					.catch(() => {
						return res.status(500).json({
							status: "error",
							message: "Failed to ping node",
							error: "FAILED_TO_PING_NODE",
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
