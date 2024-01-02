import { hashSync } from "bcryptjs";
import { randomBytes } from "crypto";
import { Request, Response } from "express";
import { encode } from "hi-base32";
import OTPAuth from "otpauth";

import { CONFIG } from "../../../constants";
import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";
import { isBodyValid } from "../../../utils/request";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		if (!isBodyValid(req.body, res)) return;

		const token = req.headers.authorization;
		const otpCode = req.body.otpCode;

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id && !user.fromApi) {
				if (user.suspended) {
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});
				}

				let dbUser = await db
					.selectFrom("user")
					.selectAll()
					.where("id", "=", user.id)
					.executeTakeFirst();

				if (!dbUser || !dbUser.otpSecret)
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});

				let totp = new OTPAuth.TOTP({
					issuer: CONFIG.app.name,
					label: dbUser.name,
					algorithm: "SHA1",
					digits: 6,
					secret: dbUser.otpSecret,
				});

				let isValid = totp.validate({
					token: otpCode,
				});

				if (isValid === null) {
					res.status(401).json({
						status: "error",
						message: "Invalid OTP code",
						error: "INVALID_OTP_CODE",
					});
				} else {
					let recoveryCode = encode(randomBytes(15))
						.replace(/=/g, "")
						.substring(0, 24);

					await db
						.updateTable("user")
						.where("id", "=", user.id)
						.set({
							otpEnabled: true,
							otpRecovery: hashSync(recoveryCode, 10),
						})
						.execute();

					res.status(200).json({
						status: "success",
						message: "OTP enabled successfully",
						data: {
							recoveryCode,
						},
					});
				}
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
	},
};
