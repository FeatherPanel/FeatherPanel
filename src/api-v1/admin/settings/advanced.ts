import "dotenv/config";

import fetch from "cross-fetch";
import { Request, Response } from "express";
import fs from "fs";
import { sql } from "kysely";
import path from "path";

import { initDatabase } from "../../../database";
import { verifyToken } from "../../../utils/jwt";
import { syncConfig } from "../../../utils/syncConfig";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;

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

				if (
					!req.body ||
					typeof req.body.db_config !== "object" ||
					typeof req.body.app_url !== "string" ||
					typeof req.body.ssl !== "boolean"
				) {
					return res.status(400).json({
						status: "error",
						message: "Missing parameters",
						error: "BAD_REQUEST",
					});
				}

				let db_config = req.body.db_config;
				let app_url = req.body.app_url;
				let ssl = req.body.ssl;

				if (
					app_url.length > 0 &&
					!app_url.match(/^(http|https):\/\/(.*)/)
				)
					return res.status(400).json({
						status: "error",
						message: "Invalid application URL",
						error: "INVALID_APPLICATION_URL",
					});

				let testConnection = false;
				try {
					await fetch(`${app_url}/api/ping`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							start: Date.now(),
						}),
					})
						.then((resp) => resp.json())
						.then((resp: any) => {
							if (resp.data.responseTime) testConnection = true;
						})
						.catch();
				} catch (error) {
					console.log(error);
					return res.status(400).json({
						status: "error",
						message: "Invalid application URL",
						error: "INVALID_APPLICATION_URL",
					});
				}

				if (!testConnection)
					return res.status(400).json({
						status: "error",
						message: "Invalid application URL",
						error: "INVALID_APPLICATION_URL",
					});

				let settings = JSON.parse(
					fs.readFileSync(
						path.join(
							__dirname,
							"..",
							"..",
							"..",
							"..",
							"config.json"
						),
						"utf8"
					)
				);
				settings.app.url = app_url;
				settings.app.ssl = ssl;

				return fs.writeFile(
					path.join(__dirname, "..", "..", "..", "..", "config.json"),
					JSON.stringify(settings, null, 2),
					async (err) => {
						if (err)
							return res.status(500).json({
								status: "error",
								message: "An error occured",
								error: "INTERNAL_ERROR",
							});

						syncConfig();

						if (!db_config)
							return res.status(200).json({
								status: "success",
								message: "Settings updated successfully",
								data: {
									db_config,
									app_url,
									ssl,
								},
							});

						let dbTest = initDatabase(
							{ ...db_config, connectionLimit: 10 },
							false
						);
						let dbOnline = false;

						if (!dbTest)
							return res.status(400).json({
								status: "error",
								message: "Invalid database configuration",
								error: "INVALID_DATABASE_CONFIGURATION",
							});

						await sql`SELECT 1`
							.execute(dbTest)
							.then(() => (dbOnline = true))
							.catch(() => (dbOnline = false));

						if (!dbOnline) {
							return res.status(400).json({
								status: "error",
								message: "Invalid database configuration",
								error: "INVALID_DATABASE_CONFIGURATION",
							});
						}

						let envFile;
						try {
							envFile = fs.readFileSync(
								path.join(__dirname, "../../../../.env"),
								"utf8"
							);
						} catch {
							return res.status(500).json({
								status: "error",
								message: "An error occured",
								error: "INTERNAL_ERROR",
							});
						}

						return fs.writeFile(
							path.join(__dirname, "../../../../.env"),
							envFile
								.replace(
									/DATABASE_TYPE=(.*)/g,
									`DATABASE_TYPE=${db_config.type || ""}`
								)
								.replace(
									/DATABASE_SQLITE_PATH=(.*)/g,
									`DATABASE_SQLITE_PATH=${
										db_config.path || ""
									}`
								)
								.replace(
									/DATABASE_HOST=(.*)/g,
									`DATABASE_HOST=${db_config.host || ""}`
								)
								.replace(
									/DATABASE_PORT=(.*)/g,
									`DATABASE_PORT=${db_config.port || ""}`
								)
								.replace(
									/DATABASE_NAME=(.*)/g,
									`DATABASE_NAME=${db_config.database || ""}`
								)
								.replace(
									/DATABASE_USER=(.*)/g,
									`DATABASE_USER=${db_config.user || ""}`
								)
								.replace(
									/DATABASE_PASSWORD=(.*)/g,
									`DATABASE_PASSWORD=${
										db_config.password || ""
									}`
								),
							(err) => {
								if (err)
									return res.status(500).json({
										status: "error",
										message: "An error occured",
										error: "INTERNAL_ERROR",
									});

								return res.status(200).json({
									status: "success",
									message: "Settings updated successfully",
									data: {
										db_config,
										app_url,
										ssl,
									},
								});
							}
						);
					}
				);
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
