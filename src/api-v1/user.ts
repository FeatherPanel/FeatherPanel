import { Request, Response } from "express";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";

import { CONFIG } from "../constants";
import { db } from "../database";
import { changeEmailTemplate } from "../utils/email-templates";
import { generateToken, verifyToken } from "../utils/jwt";
import logger from "../utils/logger";
import { isBodyValid } from "../utils/request";
import { isSmtpEnabled } from "../utils/smtp";
import { hasPermission } from "../utils/user";

module.exports = {
	methods: ["GET", "POST"],
	/**
	 * @openapi
	 * /user:
	 *  get:
	 *   tags:
	 *   - User
	 *   summary: Get user information
	 *   description: Get your own profile information.
	 *   responses:
	 *    200:
	 *     description: Get user information successfully
	 *     content:
	 *      application/json:
	 *       schema:
	 *        type: object
	 *        properties:
	 *         status:
	 *          type: string
	 *          example: success
	 *         message:
	 *          type: string
	 *          example: Get user information successfully
	 *         data:
	 *          type: object
	 *          properties:
	 *           email:
	 *            type: string
	 *            example: john.doe@example.com
	 *           name:
	 *            type: string
	 *            example: John Doe
	 *           admin:
	 *            type: boolean
	 *            example: false
	 *           otpEnabled:
	 *            type: boolean
	 *            example: false
	 *           createdAt:
	 *            type: string
	 *            example: 2021-01-01T00:00:00.000Z
	 *           serverCount:
	 *            type: number
	 *            example: 1
	 *    401:
	 *     $ref: '#/components/responses/Unauthorized'
	 *    403:
	 *     $ref: '#/components/responses/Forbidden'
	 *    500:
	 *     $ref: '#/components/responses/InternalServerError'
	 *   security:
	 *    - BearerAuth: []
	 */
	get: async (req: Request, res: Response) => {
		const token = req.headers.authorization;

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				if (!(await hasPermission(user, null, "user.view")))
					return res.status(403).json({
						status: "error",
						message:
							"You don't have the required permissions to access this resource",
						error: "FORBIDDEN",
					});

				let dbUser = await db
					.selectFrom("user")
					.where("id", "=", user.id)
					.select([
						"email",
						"name",
						"admin",
						"otpEnabled",
						"createdAt",
					])
					.executeTakeFirst();

				if (!dbUser)
					return res.status(403).json({
						status: "error",
						message: "Access token is missing or invalid",
						error: "UNAUTHORIZED",
					});

				let serverCount = await db
					.selectFrom("server")
					.where("ownerId", "=", user.id)
					.execute()
					.then((servers) => servers.length)
					.catch(() => 0);

				serverCount += await db
					.selectFrom("subuser")
					.where("userId", "=", user.id)
					.execute()
					.then((subusers) => subusers.length)
					.catch(() => 0);

				res.status(200).json({
					status: "success",
					message: "Get user information successfully",
					data: {
						...dbUser,
						serverCount,
					},
				});
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
	/**
	 * @openapi
	 * /user:
	 *  post:
	 *   tags:
	 *   - User
	 *   summary: Update user information
	 *   description: Update your own profile information.
	 *   requestBody:
	 *    description: Request body
	 *    required: true
	 *    content:
	 *     application/json:
	 *      schema:
	 *       type: object
	 *       properties:
	 *        name:
	 *         type: string
	 *         example: John Doe
	 *        email:
	 *         type: string
	 *         example: john.doe@example.com
	 *   responses:
	 *    200:
	 *     description: Updated user information successfully
	 *     content:
	 *      application/json:
	 *       schema:
	 *        type: object
	 *        properties:
	 *         status:
	 *          type: string
	 *          example: success
	 *         message:
	 *          type: string
	 *          example: Updated user information successfully
	 *    202:
	 *     description: Email verification sent
	 *     content:
	 *      application/json:
	 *       schema:
	 *        type: object
	 *        properties:
	 *         status:
	 *          type: string
	 *          example: pending
	 *         message:
	 *          type: string
	 *          example: Email verification sent
	 *    206:
	 *     description: Partially updated user information
	 *     content:
	 *      application/json:
	 *       schema:
	 *        type: object
	 *        properties:
	 *         status:
	 *          type: string
	 *          example: partial
	 *         message:
	 *          type: string
	 *          example: User email updated successfully but name update failed
	 *    400:
	 *     $ref: '#/components/responses/BadRequest'
	 *    401:
	 *     $ref: '#/components/responses/Unauthorized'
	 *    403:
	 *     $ref: '#/components/responses/Forbidden'
	 *    500:
	 *     $ref: '#/components/responses/InternalServerError'
	 *   security:
	 *    - BearerAuth: []
	 */
	post: async (req: Request, res: Response) => {
		if (!isBodyValid(req.body, res)) return;

		const token = req.headers.authorization;

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				if (!(await hasPermission(user, null, "user.edit")))
					return res.status(403).json({
						status: "error",
						message:
							"You don't have the required permissions to access this resource",
						error: "FORBIDDEN",
					});

				let emailStatus = "";

				if (typeof req.body.email === "string") {
					if (!req.body.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
						return res.status(400).json({
							status: "error",
							message: "Invalid email",
							error: "INVALID_EMAIL",
						});

					let emailExists = await db
						.selectFrom("user")
						.where("email", "=", req.body.email)
						.executeTakeFirst()
						.catch(() => false);

					if (emailExists)
						return res.status(400).json({
							status: "error",
							message: "A user with this email already exists",
							error: "EMAIL_ALREADY_EXISTS",
						});

					let smtp: any;
					try {
						smtp = JSON.parse(atob(process.env.SMTP_SETTINGS!));
					} catch {
						return res.status(500).json({
							status: "error",
							message: "Internal server error",
							error: "INTERNAL_SERVER_ERROR",
						});
					}

					if (!isSmtpEnabled(smtp)) {
						let updateQuery = await db
							.updateTable("user")
							.set({
								email: req.body.email,
							})
							.where("id", "=", user.id)
							.execute()
							.catch(() => null);

						if (!updateQuery)
							return res.status(500).json({
								status: "error",
								message: "Internal server error",
								error: "INTERNAL_SERVER_ERROR",
							});

						emailStatus = "changed";

						changeName();
					} else {
						let token = Math.random().toString(36).substr(2);
						let jwt = generateToken(
							{
								i: user.id,
								e: req.body.email,
								t: token,
							},
							"12h"
						);
						let url = `${CONFIG.app.url}/verify-email?token=${jwt}`;

						let updateQuery = await db
							.updateTable("user")
							.set({
								emailToken: token,
							})
							.where("id", "=", user.id)
							.execute()
							.catch(() => null);

						if (!updateQuery)
							return res.status(500).json({
								status: "error",
								message: "Internal server error",
								error: "INTERNAL_SERVER_ERROR",
							});

						const transporter = nodemailer.createTransport({
							host: smtp.host,
							port: smtp.port,
							secure: smtp.secure,
							auth: smtp.auth,
						});

						const mailOptions: Mail.Options = {
							from: `"${CONFIG.app.name}" <${smtp.auth.user}>`,
							to: req.body.email,
							subject: "Vérification de l'adresse e-mail",
							html: changeEmailTemplate(user.name, url),
							text: changeEmailTemplate(user.name, url, true),
							list: {
								unsubscribe: {
									url: `${CONFIG.app.url}/unsubscribe`,
									comment: "Se désinscrire",
								},
							},
						};

						if (typeof smtp.dkim === "string") {
							mailOptions.dkim = {
								domainName: smtp.auth.user.split("@")[1],
								keySelector: "default",
								privateKey: smtp.dkim,
							};
						}

						transporter.sendMail(mailOptions, (err, info) => {
							if (err) {
								logger.error(
									`Une erreur est survenue lors de l'envoi de l'e-mail de vérification à ${
										req.body.email
									} sur le compte ${user!.name}:`
								);
								logger.error(err.toString());
								return res.status(500).json({
									status: "error",
									message: "Internal server error",
									error: "INTERNAL_SERVER_ERROR",
								});
							}

							logger.info(
								`E-mail de vérification envoyé à ${
									req.body.email
								} sur le compte ${user!.name}`
							);

							emailStatus = "pending";

							changeName();
						});
					}
				} else {
					changeName();
				}

				async function changeName() {
					if (typeof req.body.name === "string") {
						if (
							req.body.name.length < 3 ||
							req.body.name.length > 32
						)
							return res.status(400).json({
								status: "error",
								message: "Invalid name",
								error: "INVALID_NAME",
							});

						let nameExists = await db
							.selectFrom("user")
							.where("name", "=", req.body.name)
							.executeTakeFirst()
							.catch(() => false);

						if (nameExists) {
							if (emailStatus === "changed") {
								return res.status(206).json({
									status: "partial",
									message:
										"User email updated successfully but name update failed",
								});
							} else if (emailStatus === "pending") {
								return res.status(206).json({
									status: "partial",
									message:
										"A verification email has been sent to the new email address but name update failed",
								});
							} else {
								return res.status(400).json({
									status: "error",
									message:
										"A user with this name already exists",
									error: "NAME_ALREADY_EXISTS",
								});
							}
						}

						let updateQuery = await db
							.updateTable("user")
							.set({
								name: req.body.name,
							})
							.where("id", "=", user?.id)
							.execute();

						if (!updateQuery) {
							if (emailStatus === "changed") {
								return res.status(206).json({
									status: "partial",
									message:
										"User email updated successfully but name update failed",
								});
							} else if (emailStatus === "pending") {
								return res.status(206).json({
									status: "partial",
									message:
										"A verification email has been sent to the new email address but name update failed",
								});
							} else {
								return res.status(500).json({
									status: "error",
									message: "Internal server error",
									error: "INTERNAL_SERVER_ERROR",
								});
							}
						}

						if (emailStatus === "pending") {
							return res.status(202).json({
								status: "pending",
								message: "Email verification sent",
							});
						} else if (emailStatus === "changed") {
							return res.status(200).json({
								status: "success",
								message:
									"Updated user information successfully",
							});
						} else {
							return res.status(200).json({
								status: "success",
								message: "Updated user name successfully",
							});
						}
					}

					if (emailStatus === "pending") {
						return res.status(206).json({
							status: "pending",
							message: "Email verification sent",
						});
					} else if (emailStatus === "changed") {
						return res.status(200).json({
							status: "success",
							message: "Updated user email successfully",
						});
					} else {
						return res.status(400).json({
							status: "error",
							message: "Bad request",
							error: "BAD_REQUEST",
						});
					}
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
};
