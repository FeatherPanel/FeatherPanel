import { Request, Response } from "express";
import fs from "fs";
import nodemailer from "nodemailer";
import path from "path";

import { verifyToken } from "../../../utils/jwt";

module.exports = {
	methods: ["GET", "POST"],
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
					typeof req.body.enabled !== "boolean" ||
					(req.body.enabled &&
						(typeof req.body.host !== "string" ||
							typeof req.body.port !== "number" ||
							typeof req.body.user !== "string" ||
							typeof req.body.pass !== "string" ||
							typeof req.body.secure !== "boolean"))
				) {
					return res.status(400).json({
						status: "error",
						message: "Missing parameters",
						error: "BAD_REQUEST",
					});
				}

				let enabled = req.body.enabled;
				let host = req.body.host;
				let port = req.body.port;
				let username = req.body.user;
				let pass = req.body.pass;
				let secure = req.body.secure;
				let dkim = req.body.dkim || null;

				if (enabled) {
					const transporter = nodemailer.createTransport({
						host: host,
						port: port,
						secure: secure,
						auth: {
							user: username,
							pass: pass,
						},
					});

					try {
						transporter.verify((error, success) => {
							if (error) {
								return res.status(400).json({
									status: "error",
									message: "Invalid SMTP settings",
									error: "INVALID_SMTP_SETTINGS",
								});
							}

							let env = fs.readFileSync(
								path.join(
									__dirname,
									"..",
									"..",
									"..",
									"..",
									".env"
								),
								"utf-8"
							);

							let smtpEnv = btoa(
								JSON.stringify({
									enabled: true,
									host: host,
									port: port,
									auth: {
										user: username,
										pass: pass,
									},
									secure: secure,
									dkim: dkim,
								})
							);

							env = env.replace(
								/SMTP_SETTINGS=.*/g,
								`SMTP_SETTINGS=${smtpEnv}`
							);

							fs.writeFileSync(
								path.join(
									__dirname,
									"..",
									"..",
									"..",
									"..",
									".env"
								),
								env
							);

							return res.status(200).json({
								status: "success",
								message: "SMTP settings updated successfully",
							});
						});
					} catch {
						return res.status(400).json({
							status: "error",
							message: "Invalid SMTP settings",
							error: "INVALID_SMTP_SETTINGS",
						});
					}
				} else {
					let env = fs.readFileSync(
						path.join(__dirname, "..", "..", "..", "..", ".env"),
						"utf-8"
					);

					let smtpEnv = btoa(
						JSON.stringify({
							enabled: false,
							host: null,
							port: null,
							auth: {
								user: null,
								pass: null,
							},
							secure: false,
							dkim: null,
						})
					);

					env = env.replace(
						/SMTP_SETTINGS=.*/g,
						`SMTP_SETTINGS=${smtpEnv}`
					);

					fs.writeFileSync(
						path.join(__dirname, "..", "..", "..", "..", ".env"),
						env
					);

					return res.status(200).json({
						status: "success",
						message: "SMTP settings updated successfully",
					});
				}
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
	get: async (req: Request, res: Response) => {
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

				let env = fs.readFileSync(
					path.join(__dirname, "..", "..", "..", "..", ".env"),
					"utf-8"
				);

				let match = env.match(/SMTP_SETTINGS=.*/g);

				if (!match)
					return res.status(200).json({
						status: "success",
						message: "SMTP settings fetched successfully",
						data: {
							enabled: false,
							host: null,
							port: null,
							user: null,
							pass: null,
							secure: false,
							dkim: null,
						},
					});

				let smtpEnv = match[0].split("=")[1];

				let smtpSettings = JSON.parse(atob(smtpEnv));

				return res.status(200).json({
					status: "success",
					message: "SMTP settings fetched successfully",
					data: smtpSettings,
				});
			} else {
				res.status(401).json({
					status: "error",
					message: "Access token is missing or invalid",
					error: "UNAUTHORIZED",
				});
			}
		}
	},
};
