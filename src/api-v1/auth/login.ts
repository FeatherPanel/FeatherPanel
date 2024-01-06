import { compareSync } from "bcryptjs";
import { Request, Response } from "express";
import OTPAuth from "otpauth";

import { CONFIG } from "../../constants";
import { db } from "../../database";
import { generateUserToken } from "../../utils/user";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const email = req.body.email;
		const password = req.body.password;

		if (
			!email ||
			typeof email !== "string" ||
			!password ||
			typeof password !== "string"
		)
			return res.status(400).json({
				status: "error",
				message: "Invalid request body",
				error: "BAD_REQUEST",
			});

		let user = await db
			.selectFrom("user")
			.selectAll()
			.where("email", "=", email.toLowerCase())
			.executeTakeFirst();

		if (user) {
			if (compareSync(password, user.password)) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				if (!user.emailVerified) {
					return res.status(403).json({
						status: "pending",
						message: "Your email address has not been verified",
						error: "EMAIL_NOT_VERIFIED",
					});
				}

				if (user.otpEnabled) {
					if (!req.body.otp && !req.body.otpRecovery)
						return res.status(202).json({
							status: "pending",
							message: "Two-factor authentication is enabled",
							error: "OTP_REQUESTED",
						});

					if (req.body.otpRecovery) {
						if (
							!compareSync(
								req.body.otpRecovery,
								user.otpRecovery || ""
							)
						)
							return res.status(401).json({
								status: "error",
								message: "Invalid OTP recovery code",
								error: "INVALID_OTP_RECOVERY_CODE",
							});
					} else {
						let totp = new OTPAuth.TOTP({
							issuer: CONFIG.app.name,
							label: user.name,
							algorithm: "SHA1",
							digits: 6,
							secret: user.otpSecret || "",
						});

						let isValid = totp.validate({
							token: req.body.otp,
						});

						if (isValid === null)
							return res.status(401).json({
								status: "error",
								message: "Invalid OTP code",
								error: "INVALID_OTP_CODE",
							});
					}
				}

				res.status(200).json({
					status: "success",
					message: "Logged in successfully",
					data: {
						token: generateUserToken(user),
					},
				});
			} else {
				res.status(401).json({
					status: "error",
					message: "Invalid credentials",
					error: "UNAUTHORIZED",
				});
			}
		} else {
			res.status(401).json({
				status: "error",
				message: "Invalid credentials",
				error: "UNAUTHORIZED",
			});
		}
	},
};
