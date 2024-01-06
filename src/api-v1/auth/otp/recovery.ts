import { compareSync, hashSync } from "bcryptjs";
import { randomBytes } from "crypto";
import { Request, Response } from "express";
import { encode } from "hi-base32";

import { db } from "../../../database";
import { verifyToken } from "../../../utils/jwt";
import { generateUserToken } from "../../../utils/user";

module.exports = {
	methods: ["GET", "POST"],
	get: async (req: Request, res: Response) => {
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
					message: "OTP recovery code regenerated successfully",
					data: {
						recoveryCode,
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
	post: async (req: Request, res: Response) => {
		let { email, password, recoveryCode } = req.body;

		if (!recoveryCode)
			return res.status(400).json({
				status: "error",
				message: "Invalid code",
				error: "INVALID_RECOVERY_CODE",
			});

		recoveryCode = recoveryCode.trim();

		if (recoveryCode.length !== 24)
			return res.status(400).json({
				status: "error",
				message: "Invalid code",
				error: "INVALID_RECOVERY_CODE",
			});

		let dbUser = await db
			.selectFrom("user")
			.selectAll()
			.where("email", "=", email.toLowerCase())
			.executeTakeFirst()
			.catch(() => null);

		if (!dbUser)
			return res.status(400).json({
				status: "error",
				message: "Invalid code",
				error: "INVALID_RECOVERY_CODE",
			});

		if (!compareSync(password, dbUser.password))
			return res.status(401).json({
				status: "error",
				message: "Invalid credentials",
				error: "INVALID_CREDENTIALS",
			});

		if (!compareSync(recoveryCode, dbUser.otpRecovery || ""))
			return res.status(400).json({
				status: "error",
				message: "Invalid code",
				error: "INVALID_RECOVERY_CODE",
			});

		let updateQuery = await db
			.updateTable("user")
			.where("email", "=", email.toLowerCase())
			.set({
				otpEnabled: false,
				otpRecovery: null,
			})
			.executeTakeFirst()
			.catch(() => null);

		if (!updateQuery)
			return res.status(500).json({
				status: "error",
				message: "Internal server error",
				error: "INTERNAL_SERVER_ERROR",
			});

		res.status(200).json({
			status: "success",
			message: "OTP recovery code verified successfully",
			data: {
				token: generateUserToken(dbUser),
			},
		});
	},
};
