import "colors";

import winston from "winston";

import { IS_DEBUG } from "../constants";

const LOCALE = "fr-FR";

class Logger {
	logger: winston.Logger;

	constructor() {
		this.logger = winston.createLogger({
			level: IS_DEBUG ? "debug" : "info",
			format: winston.format.printf((info) => {
				let date = new Date().toISOString();
				let level = info.level.toUpperCase();
				let message = info.message.replace(/\u001b\[\d{1,2}m/g, "");

				return `[${date}] [${level}]: ${message}`;
			}),
			transports: [
				new winston.transports.File({
					dirname: "logs",
					filename: "featherpanel.log",
				}),
				new winston.transports.Console({
					format: winston.format.printf((info) => {
						let level = info.level.toUpperCase();
						switch (level) {
							case "DEBUG":
								level = level.gray;
							case "INFO":
								level = level.green;
								break;
							case "WARN":
								level = level.yellow;
								break;
							case "ERROR":
								level = level.red;
								break;
							default:
								break;
						}

						let date = (
							new Date().toLocaleDateString(LOCALE) +
							" " +
							new Date().toLocaleTimeString(LOCALE)
						).grey;
						return `[${date}] [${level}]: ${info.message}`;
					}),
				}),
			],
		});
	}
	debug(message: string, ...meta: any[]) {
		this.logger.debug(message, ...meta);
	}
	info(message: string, ...meta: any[]) {
		this.logger.info(message, ...meta);
	}
	warn(message: string, ...meta: any[]) {
		this.logger.warn(message, ...meta);
	}
	error(message: string, ...meta: any[]) {
		this.logger.error(message, ...meta);
	}
}

export default new Logger();
