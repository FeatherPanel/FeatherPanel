import "dotenv/config";

import fetch from "cross-fetch";
import { Request, Response } from "express";

import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;

		if (
			!req.body ||
			!req.body.nodeId ||
			typeof req.body.nodeId !== "number"
		) {
			return res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
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

				let serverCount = await db
					.selectFrom("server")
					.where("nodeId", "=", node.id)
					.execute()
					.then((servers) => servers.length)
					.catch(() => 0);

				return await fetch(
					`${node.ssl ? "https" : "http"}://${node.address}:${
						node.daemonPort
					}/system-info`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
						},
					}
				)
					.then((res: any) => res.json())
					.then((data: any) => {
						if (data.status === "success") {
							return res.status(200).json({
								status: "success",
								message: "Node fetched successfully",
								data: {
									...node,
									...data.data,
									serverCount,
									online: true,
								},
							});
						} else {
							return res.status(200).json({
								status: "success",
								message: "Node fetched successfully",
								data: {
									...node,
									serverCount,
									online: false,
								},
							});
						}
					})
					.catch(() => {
						return res.status(200).json({
							status: "success",
							message: "Node fetched successfully",
							data: {
								...node,
								serverCount,
								online: false,
							},
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
