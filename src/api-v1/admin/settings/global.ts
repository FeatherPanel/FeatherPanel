import { Request, Response } from "express";
import fs from "fs";
import path from "path";

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
					typeof req.body.name !== "string" ||
					typeof req.body.lang !== "string" ||
					typeof req.body.contact !== "string"
				) {
					return res.status(400).json({
						status: "error",
						message: "Missing parameters",
						error: "BAD_REQUEST",
					});
				}

				let name = req.body.name;
				let lang = req.body.lang;
				let contact = req.body.contact;

				if (
					name.length < 3 ||
					name.length > 32 ||
					!name.match(
						/^[a-zA-Z0-9À-ÿ\s\(\)\[\]\{\}\.\-\_\!\?\&\+\=\*]+$/
					)
				) {
					return res.status(400).json({
						status: "error",
						message: "Invalid name",
						error: "INVALID_NAME",
					});
				}

				if (lang !== "fr") {
					return res.status(400).json({
						status: "error",
						message: "Invalid language",
						error: "INVALID_LANGUAGE",
					});
				}

				if (
					!contact.match(
						/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
					)
				) {
					return res.status(400).json({
						status: "error",
						message: "Invalid contact email",
						error: "INVALID_CONTACT",
					});
				}

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
				settings.app.name = name;
				settings.app.lang = lang;
				settings.app.contact = contact;

				return fs.writeFile(
					path.join(__dirname, "..", "..", "..", "..", "config.json"),
					JSON.stringify(settings, null, 2),
					(err) => {
						if (err) {
							return res.status(500).json({
								status: "error",
								message: "An error occured",
								error: "INTERNAL_ERROR",
							});
						} else {
							syncConfig();

							return res.status(200).json({
								status: "success",
								message: "Global settings updated successfully",
								data: {
									name: name,
									lang: lang,
									contact: contact,
								},
							});
						}
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
