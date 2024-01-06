import { compareSync, hashSync } from "bcryptjs";
import { Request, Response } from "express";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";

import { CONFIG } from "../../constants";
import { db } from "../../database";
import { resetPasswordEmailTemplate } from "../../utils/email-templates";
import { verifyToken } from "../../utils/jwt";
import logger from "../../utils/logger";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const { currentPassword, newPassword, email, code } = req.body;

		if (currentPassword && newPassword) {
			// Logged in user can reset password with current password
			const token = req.headers.authorization;

			if (token && token.split(" ")[1]) {
				let user = await verifyToken(req, token.split(" ")[1]);

				if (user && user.id && !user.fromApi) {
					if (user.suspended)
						return res.status(403).json({
							status: "error",
							message: "Your account has been suspended",
							error: "ACCOUNT_SUSPENDED",
						});

					if (newPassword.length < 8 || newPassword.length > 32)
						return res.status(400).json({
							status: "error",
							message: "Invalid password",
							error: "INVALID_PASSWORD",
						});

					let dbUser = await db
						.selectFrom("user")
						.where("id", "=", user.id)
						.select("password")
						.executeTakeFirst()
						.catch(() => null);

					if (!dbUser)
						return res.status(500).json({
							status: "error",
							message: "Internal server error",
							error: "INTERNAL_SERVER_ERROR",
						});

					if (!compareSync(currentPassword, dbUser.password))
						return res.status(401).json({
							status: "error",
							message: "Invalid credentials",
							error: "INVALID_CREDENTIALS",
						});

					let updateQuery = await db
						.updateTable("user")
						.where("id", "=", user.id)
						.set({
							password: newPassword,
						})
						.execute()
						.catch(() => null);

					if (!updateQuery)
						return res.status(500).json({
							status: "error",
							message: "Internal server error",
							error: "INTERNAL_SERVER_ERROR",
						});

					res.status(200).json({
						status: "success",
						message: "Password updated successfully",
					});
				} else {
					res.status(401).json({
						status: "error",
						message: "Invalid credentials",
						error: "INVALID_CREDENTIALS",
					});
				}
			} else {
				res.status(401).json({
					status: "error",
					message: "Invalid credentials",
					error: "INVALID_CREDENTIALS",
				});
			}
		} else if (email) {
			// Logged out user can reset password with email
			let dbUser = await db
				.selectFrom("user")
				.where("email", "=", email.toLowerCase())
				.select([
					"id",
					"name",
					"emailSentAt",
					"passwordToken",
					"suspended",
				])
				.executeTakeFirst()
				.catch(() => null);

			if (!dbUser)
				return res.status(500).json({
					status: "error",
					message: "Account not found",
					error: "ACCOUNT_NOT_FOUND",
				});

			if (dbUser.suspended)
				return res.status(403).json({
					status: "error",
					message: "Your account has been suspended",
					error: "ACCOUNT_SUSPENDED",
				});

			if (code) {
				if (dbUser.passwordToken !== code)
					return res.status(401).json({
						status: "error",
						message: "Invalid code",
						error: "INVALID_CODE",
					});

				if (!newPassword)
					return res.status(202).json({
						status: "pending",
						message: "Code verified successfully",
						data: {
							step: 2,
						},
					});

				if (newPassword.length < 8 || newPassword.length > 32)
					return res.status(400).json({
						status: "error",
						message: "Invalid password",
						error: "INVALID_PASSWORD",
					});

				let updatePasswordQuery = await db
					.updateTable("user")
					.where("id", "=", dbUser.id)
					.set({
						password: hashSync(newPassword, 10),
						passwordToken: null,
					})
					.execute()
					.catch(() => null);

				if (!updatePasswordQuery)
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});

				res.status(200).json({
					status: "success",
					message: "Password updated successfully",
				});
			} else {
				let emailSentAt = dbUser.emailSentAt;
				emailSentAt = new Date(
					emailSentAt.getTime() -
						emailSentAt.getTimezoneOffset() * 60000
				);

				if (emailSentAt.getTime() + 120000 > Date.now()) {
					return res.status(400).json({
						status: "error",
						message: "Wait 2 minutes before sending another email",
						error: "EMAIL_COOLDOWN",
					});
				}

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

				let code = Math.floor(
					100000 + Math.random() * 900000
				).toString();

				const transporter = nodemailer.createTransport({
					host: smtp.host,
					port: smtp.port,
					secure: smtp.secure,
					auth: smtp.auth,
				});

				const mailOptions: Mail.Options = {
					from: `"${CONFIG.app.name}" <${smtp.auth.user}>`,
					to: email,
					subject: `Réinitialisation de mot de passe`,
					html: resetPasswordEmailTemplate(dbUser.name, code),
					text: resetPasswordEmailTemplate(dbUser.name, code, true),
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
							`Une erreur est survenue lors de l'envoi de l'e-mail de réinitialisation de mot de passe à ${email} pour le compte ${
								dbUser!.name
							}:`
						);
						logger.error(err.toString());
						return res.status(500).json({
							status: "error",
							message: "Internal server error",
							error: "INTERNAL_SERVER_ERROR",
						});
					}

					logger.info(
						`E-mail de réinitialisation de mot de passe envoyé à ${email} pour le compte ${
							dbUser!.name
						}`
					);
				});

				let updateQuery = await db
					.updateTable("user")
					.where("id", "=", dbUser.id)
					.set({
						emailSentAt: new Date().toISOString(),
						passwordToken: code,
					})
					.execute()
					.catch(() => null);

				if (!updateQuery)
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});

				res.status(202).json({
					status: "pending",
					message: "Email sent",
					data: {
						step: 1,
					},
				});
			}
		} else {
			res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
			});
		}
	},
};
