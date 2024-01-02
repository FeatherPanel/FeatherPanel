import { Server, Socket } from "socket.io";

import { db } from "../../database";
import { verifyToken } from "../../utils/jwt";

module.exports = async (socket: Socket, _: Server, serverId: string) => {
	if (socket.handshake.auth.token) {
		let user = await verifyToken(socket, socket.handshake.auth.token);

		if (user && user.id && !user.fromApi) {
			if (user.suspended)
				return socket.emit("servers/connect", {
					status: "error",
					message: "Your account is suspended",
					error: "ACCOUNT_SUSPENDED",
				});

			if (typeof serverId !== "string")
				return socket.emit("servers/connect", {
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
				return socket.emit("servers/connect", {
					status: "error",
					message: "Server not found",
					error: "SERVER_NOT_FOUND",
				});

			// TODO: subusers
			if (server.ownerId !== user.id)
				return socket.emit("servers/connect", {
					status: "error",
					message: "You do not own this server",
					error: "NOT_SERVER_OWNER",
				});

			socket.join(`servers/${serverId}`);

			socket.emit("servers/connect", {
				status: "success",
				message: "Successfully connected to server",
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
