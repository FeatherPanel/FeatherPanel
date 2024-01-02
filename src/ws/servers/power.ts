import { Server, Socket } from "socket.io";

import { db } from "../../database";
import { verifyToken } from "../../utils/jwt";

module.exports = async (
	socket: Socket,
	io: Server,
	serverId: string | null,
	action: string | null
) => {
	if (socket.handshake.auth.token) {
		let user = await verifyToken(socket, socket.handshake.auth.token);

		if (user && user.id && !user.fromApi) {
			if (user.suspended)
				return socket.emit("servers/connect", {
					status: "error",
					message: "Your account is suspended",
					error: "ACCOUNT_SUSPENDED",
				});

			if (
				!serverId ||
				typeof serverId !== "string" ||
				!action ||
				typeof action !== "string"
			)
				return socket.emit("servers/connect", {
					status: "error",
					message: "Bad request",
					error: "BAD_REQUEST",
				});

			if (
				action !== "start" &&
				action !== "stop" &&
				action !== "restart" &&
				action !== "kill"
			)
				return socket.emit("servers/connect", {
					status: "error",
					message: "Invalid action",
					error: "INVALID_ACTION",
				});

			let server = await db
				.selectFrom("server")
				.select(["ownerId", "nodeId", "containerId"])
				.where("serverId", "=", serverId)
				.executeTakeFirst();

			if (!server) {
				return socket.emit("servers/connect", {
					status: "error",
					message: "Server not found",
					error: "SERVER_NOT_FOUND",
				});
			}

			// TODO: subusers
			if (!server.ownerId || server.ownerId !== user.id) {
				return socket.emit("servers/connect", {
					status: "error",
					message:
						"You don't have the required permissions to access this resource",
					error: "FORBIDDEN",
				});
			}

			let node = await db
				.selectFrom("node")
				.select(["ssl", "address", "daemonPort"])
				.where("id", "=", server.nodeId)
				.executeTakeFirst();

			if (!node)
				return socket.emit("servers/connect", {
					status: "error",
					message: "Node not found",
					error: "NODE_NOT_FOUND",
				});

			fetch(
				`${node.ssl ? "https" : "http"}://${node.address}:${
					node.daemonPort
				}/servers/power`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: `Bearer ${process.env.DAEMON_SECRET}`,
					},
					body: JSON.stringify({
						containerId: server.containerId,
						action,
						serverId: serverId,
					}),
				}
			)
				.then((r) => r.json())
				.then((data) => {
					if (data.status === "success") {
						db.updateTable("server")
							.where("serverId", "=", serverId)
							.set({
								status:
									action === "start"
										? "starting"
										: action === "stop"
										? "stopping"
										: action === "restart"
										? "restarting"
										: "killing",
							})
							.execute();

						io.to(`servers/${serverId}`).emit("servers/status", {
							status: "success",
							message: "Server status updated",
							data:
								action === "start"
									? "starting"
									: action === "stop"
									? "stopping"
									: action === "restart"
									? "restarting"
									: "killing",
						});

						socket.to(`servers/${serverId}`).emit("servers/power", {
							status: "success",
							message: `Server ${
								action === "stop" ? "stopped" : action + "ed"
							} successfully`,
							data: action,
						});

						return;
					}

					return socket.emit("servers/connect", {
						status: data.status || "error",
						message: data.message || "Failed to start server",
						error: data.error || "FAILED_TO_START_SERVER",
					});
				})
				.catch(() => {
					return socket.emit("servers/connect", {
						status: "error",
						message: "Could not connect to node",
						error: "COULD_NOT_CONNECT_TO_NODE",
					});
				});
		} else {
			socket.emit("servers/connect", {
				status: "error",
				message: "Access token is missing or invalid",
				error: "UNAUTHORIZED",
			});
		}
	} else {
		socket.emit("servers/connect", {
			status: "error",
			message: "Access token is missing or invalid",
			error: "UNAUTHORIZED",
		});
	}
};
