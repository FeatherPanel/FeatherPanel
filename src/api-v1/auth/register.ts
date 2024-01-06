import { hashSync } from "bcryptjs";
import { Request, Response } from "express";
import { sql } from "kysely";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";

import { CONFIG } from "../../constants";
import { db } from "../../database";
import { EMAIL_BLACKLIST } from "../../utils/email-blacklist";
import { welcomeEmailTemplate } from "../../utils/email-templates";
import { generateToken } from "../../utils/jwt";
import logger from "../../utils/logger";
import { isBodyValid } from "../../utils/request";
import { isSmtpEnabled } from "../../utils/smtp";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		if (!isBodyValid(req.body, res)) return;

		const username = req.body.username;
		const email = req.body.email;
		const password = req.body.password;

		if (
			!username ||
			!email ||
			!password ||
			typeof username !== "string" ||
			typeof email !== "string" ||
			typeof password !== "string"
		) {
			return res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
			});
		}

		if (username.length < 3 || username.length > 32)
			return res.status(400).json({
				status: "error",
				message: "Invalid username",
				error: "INVALID_USERNAME",
			});

		if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
			return res.status(400).json({
				status: "error",
				message: "Invalid email",
				error: "INVALID_EMAIL",
			});

		if (EMAIL_BLACKLIST.includes(email.split("@")[1].toLowerCase()))
			return res.status(400).json({
				status: "error",
				message: "Forbidden email",
				error: "FORBIDDEN_EMAIL",
			});

		if (password.length < 8 || password.length > 32)
			return res.status(400).json({
				status: "error",
				message: "Invalid password",
				error: "INVALID_PASSWORD",
			});

		let userNameExists = await db
			.selectFrom("user")
			.where(sql`LOWER(name) = ${username.toLowerCase()}`)
			.execute()
			.then((users) => users.length > 0)
			.catch(() => false);

		if (userNameExists) {
			return res.status(400).json({
				status: "error",
				message: "Username already exists",
				error: "USERNAME_ALREADY_EXISTS",
			});
		}

		let userEmailExists = await db
			.selectFrom("user")
			.where("email", "=", email.toLowerCase())
			.execute()
			.then((users) => users.length > 0)
			.catch(() => false);

		if (userEmailExists) {
			return res.status(400).json({
				status: "error",
				message: "Email already exists",
				error: "EMAIL_ALREADY_EXISTS",
			});
		}

		let user = await db
			.insertInto("user")
			.values({
				name: username,
				email: email.toLowerCase(),
				password: hashSync(password, 10),
				lang: CONFIG.app.lang,
				emailSentAt: new Date().toISOString(),
				createdAt: new Date().toISOString(),
			})
			.returning(["id", "name"])
			.executeTakeFirst()
			.then((user) => user)
			.catch((err) => null);

		if (!user || !user.id || !user.name) {
			return res.status(500).json({
				status: "error",
				message: "Internal server error",
				error: "INTERNAL_SERVER_ERROR",
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

		if (isSmtpEnabled(smtp)) {
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
				.execute();

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
				subject: `Bienvenue sur ${CONFIG.app.name}`,
				html: welcomeEmailTemplate(user.name, url),
				text: welcomeEmailTemplate(user.name, url, true),
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
						`Une erreur est survenue lors de l'envoi de l'e-mail de création de compte à ${
							req.body.email
						} pour le compte ${user!.name}:`
					);
					logger.error(err.toString());
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});
				}

				logger.info(
					`E-mail de création de compte envoyé à ${
						req.body.email
					} pour le compte ${user!.name}`
				);
			});
		}

		res.status(200).json({
			status: "success",
			message: "User created successfully",
		});
	},
};
