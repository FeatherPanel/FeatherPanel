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
			typeof req.body.name !== "string" ||
			typeof req.body.owner !== "string" ||
			typeof req.body.node !== "string" ||
			typeof req.body.game !== "object" ||
			typeof req.body.game.name !== "string" ||
			typeof req.body.game.data !== "object" ||
			typeof req.body.extraPorts !== "number" ||
			typeof req.body.cpu !== "number" ||
			typeof req.body.ram !== "number" ||
			typeof req.body.disk !== "number" ||
			typeof req.body.backupsLimit !== "number"
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

				let {
					name,
					owner,
					node,
					game,
					port,
					extraPorts,
					cpu,
					ram,
					disk,
					backupsLimit,
				} = req.body;

				let serverNameExists = await db
					.selectFrom("server")
					.where("name", "=", name)
					.execute()
					.then((servers) => servers.length > 0)
					.catch(() => false);

				if (name.length < 3 || name.length > 32) {
					return res.status(400).json({
						status: "error",
						message: "Invalid server name",
						error: "INVALID_SERVER_NAME",
					});
				}

				if (serverNameExists) {
					return res.status(400).json({
						status: "error",
						message: "Server name already exists",
						error: "SERVER_NAME_ALREADY_EXISTS",
					});
				}

				let serverOwner = await db
					.selectFrom("user")
					.selectAll()
					.where("name", "=", owner)
					.executeTakeFirst();

				if (!serverOwner) {
					return res.status(400).json({
						status: "error",
						message: "User not found",
						error: "USER_NOT_FOUND",
					});
				}

				let serverNode = await db
					.selectFrom("node")
					.selectAll()
					.where("name", "=", node)
					.executeTakeFirst();

				if (!serverNode) {
					return res.status(400).json({
						status: "error",
						message: "Node not found",
						error: "NODE_NOT_FOUND",
					});
				}

				if ((typeof port == "number" && port < 3000) || port > 65535) {
					return res.status(400).json({
						status: "error",
						message: "Invalid port",
						error: "INVALID_PORT",
					});
				}

				if (extraPorts < 0 || extraPorts > 20) {
					return res.status(400).json({
						status: "error",
						message: "Invalid extra ports",
						error: "INVALID_EXTRA_PORTS",
					});
				}

				let existingPorts = await db
					.selectFrom("server")
					.select(["port", "extraPorts"])
					.where("nodeId", "=", serverNode.id)
					.execute();

				async function genPort(): Promise<number> {
					let i = 0;

					while (i < 65535 - 3000) {
						let port = 3000 + i;
						let portExists =
							existingPorts.some((p: any) => p.port === port) ||
							existingPorts.some((p: any) =>
								p.extraPorts
									.split(",")
									.includes(port.toString())
							);

						if (portExists) {
							i++;
						} else {
							existingPorts.push({
								port: port,
								extraPorts: "",
							});
							return port;
						}
					}

					return 0;
				}

				async function genExtraPorts(n: number) {
					let ports = [];
					for (let i = 0; i < n; i++) {
						ports.push(await genPort());
					}
					return ports.join(",");
				}

				if (
					typeof port == "number" &&
					(existingPorts.some((p: any) => p.port === port) ||
						existingPorts.some((p: any) =>
							p.extraPorts.split(",").includes(port.toString())
						))
				) {
					return res.status(400).json({
						status: "error",
						message: "Port already in use",
						error: "PORT_ALREADY_USED",
					});
				}

				if (typeof port !== "number" || port < 3000 || port > 65535) {
					port = await genPort();
				}

				if (
					typeof extraPorts !== "number" ||
					extraPorts < 0 ||
					extraPorts > 20
				) {
					extraPorts = 0;
				}

				let extraPortsList = await genExtraPorts(extraPorts);

				if (port === 0 || extraPortsList.split(",").includes("0")) {
					return res.status(500).json({
						status: "error",
						message: "Could not generate port",
						error: "NOT_ENOUGH_PORTS_ON_NODE",
					});
				}

				async function genServerId(): Promise<string> {
					let id = "";
					let i = 0;
					const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

					while (i < 6) {
						id += chars.charAt(
							Math.floor(Math.random() * chars.length)
						);
						i++;
					}

					let server = await db
						.selectFrom("server")
						.selectAll()
						.where("serverId", "=", id)
						.executeTakeFirst();

					if (server) {
						return await genServerId();
					} else {
						return id;
					}
				}

				let serverId = await genServerId();

				fetch(
					`${serverNode.ssl ? "https" : "http"}://${
						serverNode.address
					}:${serverNode.daemonPort}/servers/create`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
						},
						body: JSON.stringify({
							name: name,
							owner: owner,
							game: game,
							serverId: serverId,
							port: port,
							extraPorts: extraPortsList,
							cpu: cpu,
							ram: ram,
							disk: disk,
							javaVersion: game.name === "minecraft" ? "21" : "",
						}),
						signal: AbortSignal.timeout(5000),
					}
				)
					.then(async (r) => {
						let data = await r.json();

						if (data.status === "success") {
							if (
								typeof data.data !== "object" ||
								typeof data.data.id !== "string" ||
								typeof data.data.startCommand !== "string"
							) {
								return res.status(500).json({
									status: "error",
									message: "Invalid response from node",
									error: "INVALID_RESPONSE_FROM_NODE",
								});
							}

							let server = await db
								.insertInto("server")
								.values({
									name,
									serverId,
									containerId: data.data.id,
									ownerId: serverOwner!.id,
									ownerName: serverOwner!.name,
									nodeId: serverNode!.id,
									nodeName: serverNode!.name,
									port,
									extraPorts: extraPortsList,
									cpuShares: cpu,
									ramLimit: BigInt(ram * 1024 * 1024),
									diskLimit: BigInt(
										disk * 1024 * 1024 * 1024
									),
									game: game.name,
									backupsLimit,
									startCommand: data.data.startCommand,
									status: "starting",
									suspended: false,
								})
								.returningAll()
								.executeTakeFirst();

							if (!server) {
								return res.status(500).json({
									status: "error",
									message: "Internal server error",
									error: "INTERNAL_SERVER_ERROR",
								});
							}

							return res.status(200).json({
								status: "success",
								message: "Server created",
								server: server,
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
					.catch(() => {
						return res.status(500).json({
							status: "error",
							message: "Could not connect to node",
							error: "COULD_NOT_CONNECT_TO_NODE",
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
