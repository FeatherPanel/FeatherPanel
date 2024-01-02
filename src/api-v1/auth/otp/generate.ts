import { randomBytes } from "crypto";
import { Request, Response } from "express";
import { encode } from "hi-base32";
import OTPAuth from "otpauth";

import { CONFIG } from "../../../constants";
import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";

module.exports = {
	methods: ["POST"],
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;

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

				const base32Secret = encode(randomBytes(15))
					.replace(/=/g, "")
					.substring(0, 24);

				let totp = new OTPAuth.TOTP({
					issuer: CONFIG.app.name,
					label: user.name,
					algorithm: "SHA1",
					digits: 6,
					secret: base32Secret,
				});

				let otpauthUrl = totp.toString();

				await db
					.updateTable("user")
					.where("id", "=", user.id)
					.set({
						otpAuthUrl: otpauthUrl,
						otpSecret: base32Secret,
					})
					.executeTakeFirst();

				res.status(200).json({
					status: "success",
					message: "OTP generated successfully",
					data: {
						otpAuthUrl: otpauthUrl,
						otpSecret: base32Secret,
					},
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
	},
};
