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
					typeof req.body.enableRegistration !== "boolean" ||
					typeof req.body.enableAccountDetailsChange !== "boolean" ||
					typeof req.body.enablePasswordChange !== "boolean"
				) {
					return res.status(400).json({
						status: "error",
						message: "Missing parameters",
						error: "BAD_REQUEST",
					});
				}

				let enableRegistration = req.body.enableRegistration;
				let enableAccountDetailsChange =
					req.body.enableAccountDetailsChange;
				let enablePasswordChange = req.body.enablePasswordChange;

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

				settings.userSettings = {
					enableRegistration: enableRegistration,
					enableAccountDetailsChange: enableAccountDetailsChange,
					enablePasswordChange: enablePasswordChange,
				};

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
									enableRegistration: enableRegistration,
									enableAccountDetailsChange:
										enableAccountDetailsChange,
									enablePasswordChange: enablePasswordChange,
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
