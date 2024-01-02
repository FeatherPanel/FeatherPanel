import "./utils/power";

import fs from "fs";
import http from "http";
import https from "https";
import path from "path";
import { Server } from "socket.io";

import { app } from "./app";
import { VERSION } from "./constants";
import { startSocket } from "./socket";
import { panelConfig } from "./utils/config";
import { parseJSONFile } from "./utils/json";
import logger from "./utils/logger";
import { syncConfig } from "./utils/syncConfig";

let io: Server;

const configFilePath = path.join(__dirname, "..", "config.json");
const envFilePath = path.join(__dirname, "..", ".env");
let config = parseJSONFile(configFilePath, {});

function startDaemonConfiguration() {
	logger.debug("config.json or .env not found.");
	logger.debug("Running daemon configuration...");
	panelConfig();
}

async function startServer() {
	const httpPort = config.app.httpPort || 8080;
	const httpsPort = config.app.httpsPort || 8443;

	let httpServer = http.createServer(app);
	let httpsServer: https.Server | null = null;

	// Socket.io
	startSocket(httpServer);

	if (
		config.app.ssl &&
		fs.existsSync(path.join(__dirname, "..", "ssl", "key.pem")) &&
		fs.existsSync(path.join(__dirname, "..", "ssl", "cert.pem"))
	) {
		httpsServer = https.createServer(
			{
				key: fs.readFileSync(
					path.join(__dirname, "..", "ssl", "key.pem")
				),
				cert: fs.readFileSync(
					path.join(__dirname, "..", "ssl", "cert.pem")
				),
			},
			app
		);
	}

	httpServer.listen(httpPort, () => {
		console.log(
			"\
______         _   _                 _____                 _ \r\n\
|  ____|       | | | |               |  __ \\               | |\r\n\
| |__ ___  __ _| |_| |__   ___ _ __  | |__) |_ _ _ __   ___| |\r\n\
|  __/ _ \\/ _` | __| '_ \\ / _ \\ '__| |  ___/ _` | '_ \\ / _ \\ |\r\n\
| | |  __/ (_| | |_| | | |  __/ |    | |  | (_| | | | |  __/ |\r\n\
|_|  \\___|\\__,_|\\__|_| |_|\\___|_|    |_|   \\__,_|_| |_|\\___|_|\r\n\
			".america
		);
		console.log(
			`\tv${VERSION}\t\t`.yellow +
				"https://featherpanel.natoune.fr".cyan +
				"\r\n\n"
		);
		logger.info(
			`FeatherPanel est lancé sur le port ${httpPort.toString().yellow}`
		);
	});

	if (httpsServer) {
		httpsServer.listen(httpsPort, () => {
			logger.info(
				`FeatherPanel est lancé sur le port ${
					httpsPort.toString().yellow
				} avec SSL`
			);
		});
	}
}

if (!fs.existsSync(configFilePath) || !fs.existsSync(envFilePath)) {
	startDaemonConfiguration();
} else {
	logger.debug("Starting FeatherPanel server...");
	syncConfig();
	startServer();
}

export { io };
