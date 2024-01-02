import { Server as HTTPServer } from "http";
import path from "path";
import requireAll from "require-all";
import { Server as SocketServer } from "socket.io";

import logger from "./utils/logger";

let io: SocketServer;

export function startSocket(httpServer: HTTPServer) {
	io = new SocketServer(httpServer, {
		cors: {
			origin: "*",
		},
	});

	io.on("connection", (socket) => {
		socket.onAny((event, ...args) => {
			console.log();
			logger.info(
				`[WS] ${socket.handshake.address.magenta} - ${event.cyan} - ${
					JSON.stringify(args).gray
				}`
			);
			console.log();

			const events = requireAll({
				dirname: path.join(__dirname, "ws"),
				filter: /(.+)\.ts$/,
				recursive: true,
			});

			let lastEvent = events;

			for (let urlPart of event.split("/")) {
				if (typeof lastEvent === "undefined") {
					socket.emit("error", {
						status: "error",
						message: "Resource not found",
						error: "NOT_FOUND",
					});
					return;
				}

				if (lastEvent[urlPart]) {
					const event = lastEvent[urlPart];

					if (typeof event === "function") {
						try {
							event(socket, io, ...args);
						} catch {
							socket.emit("error", {
								status: "error",
								message: "Resource not found",
								error: "NOT_FOUND",
							});
						}
						return;
					}
				}

				lastEvent = lastEvent[urlPart];
			}

			socket.emit("error", {
				status: "error",
				message: "Resource not found",
				error: "NOT_FOUND",
			});

			return;
		});
	});
}

export { io };
