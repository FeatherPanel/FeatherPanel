import { Server, Socket } from "socket.io";
import io from "socket.io-client";

import { db } from "../../database";
import { verifyToken } from "../../utils/jwt";

module.exports = async (socket: Socket, _: Server, serverId: string) => {
	if (socket.handshake.auth.token) {
		let user = await verifyToken(socket, socket.handshake.auth.token);

		if (user && user.id && !user.fromApi) {
			if (user.suspended)
				return socket.emit("servers/logs", {
					status: "error",
					message: "Your account is suspended",
					error: "ACCOUNT_SUSPENDED",
				});

			if (typeof serverId !== "string")
				return socket.emit("servers/logs", {
					status: "error",
					message: "Invalid server ID",
					error: "INVALID_SERVER_ID",
				});

			let server = await db
				.selectFrom("server")
				.selectAll()
				.where("serverId", "=", serverId)
				.executeTakeFirst();

			if (!server)
				return socket.emit("servers/logs", {
					status: "error",
					message: "Server not found",
					error: "SERVER_NOT_FOUND",
				});

			// TODO: subusers
			if (server.ownerId !== user.id)
				return socket.emit("servers/logs", {
					status: "error",
					message: "You do not own this server",
					error: "NOT_SERVER_OWNER",
				});

			let node = await db
				.selectFrom("node")
				.selectAll()
				.where("id", "=", server.nodeId)
				.executeTakeFirst();

			if (!node)
				return socket.emit("servers/logs", {
					status: "error",
					message: "Node not found",
					error: "NODE_NOT_FOUND",
				});

			const client = io(
				`${node.ssl ? "https" : "http"}://${node.address}:${
					node.daemonPort
				}`,
				{
					auth: {
						token: process.env.DAEMON_SECRET,
					},
				}
			);

			client.on("connect", () => {
				client.emit("servers/logs", server?.containerId);
			});

			client.on("servers/logs", (data: any) => {
				socket.emit("servers/logs", data);
			});

			client.on("disconnect", () => {
				socket.emit("servers/logs", {
					status: "error",
					message: "Daemon disconnected",
					error: "DAEMON_DISCONNECTED",
				});
			});
		} else {
			socket.emit("servers/logs", {
				status: "error",
				message: "Access token is missing or invalid",
				error: "UNAUTHORIZED",
			});
		}
	} else {
		socket.emit("servers/logs", {
			status: "error",
			message: "Access token is missing or invalid",
			error: "UNAUTHORIZED",
		});
	}
};
