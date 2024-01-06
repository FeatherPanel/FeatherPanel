import "dotenv/config";

import { compareSync } from "bcryptjs";
import { Request, Response } from "express";
import nodemailer from "nodemailer";
import Mail from "nodemailer/lib/mailer";

import { CONFIG } from "../../constants";
import { db } from "../../database";
import { welcomeEmailTemplate } from "../../utils/email-templates";
import { generateToken } from "../../utils/jwt";
import logger from "../../utils/logger";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const { email, password } = req.body;

		if (
			!email ||
			!password ||
			typeof email !== "string" ||
			typeof password !== "string"
		) {
			return res.status(400).json({
				status: "error",
				message: "Missing parameters",
				error: "BAD_REQUEST",
			});
		}

		let user = await db
			.selectFrom("user")
			.where("email", "=", email.toLowerCase())
			.select([
				"id",
				"name",
				"password",
				"emailVerified",
				"emailToken",
				"emailSentAt",
			])
			.executeTakeFirst()
			.catch(() => null);

		if (!user) {
			return res.status(400).json({
				status: "error",
				message: "Invalid email",
				error: "INVALID_EMAIL",
			});
		}

		if (!compareSync(password, user.password)) {
			return res.status(400).json({
				status: "error",
				message: "Invalid password",
				error: "INVALID_PASSWORD",
			});
		}

		if (user.emailVerified) {
			return res.status(400).json({
				status: "error",
				message: "Email already verified",
				error: "EMAIL_ALREADY_VERIFIED",
			});
		}

		let emailSentAt = user.emailSentAt;
		emailSentAt = new Date(
			emailSentAt.getTime() - emailSentAt.getTimezoneOffset() * 60000
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

		let token = user.emailToken || Math.random().toString(36).substr(2);
		let jwt = generateToken(
			{
				i: user.id,
				e: email,
				t: token,
			},
			"12h"
		);
		let url = `${CONFIG.app.url}/verify-email?token=${jwt}`;

		const transporter = nodemailer.createTransport({
			host: smtp.host,
			port: smtp.port,
			secure: smtp.secure,
			auth: smtp.auth,
		});

		const mailOptions: Mail.Options = {
			from: `"${CONFIG.app.name}" <${smtp.auth.user}>`,
			to: email,
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
					`Une erreur est survenue lors du renvoi de l'e-mail de création de compte à ${email} pour le compte ${
						user!.name
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
				`E-mail de création de compte renvoyé à ${email} pour le compte ${
					user!.name
				}`
			);
		});

		await db
			.updateTable("user")
			.set({
				emailToken: token,
				emailSentAt: new Date().toISOString(),
			})
			.where("id", "=", user.id)
			.execute()
			.catch(() => null);

		return res.status(200).json({
			status: "success",
			message: "Email sent",
		});
	},
};
