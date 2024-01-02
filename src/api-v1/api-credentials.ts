import { randomBytes } from "crypto";
import { Request, Response } from "express";

import { db } from "../database";
import { verifyToken } from "../utils/jwt";

module.exports = {
	methods: ["GET", "POST", "DELETE"],
	get: async (req: Request, res: Response) => {
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

				let credentials = await db
					.selectFrom("apiCredentials")
					.where("userId", "=", user.id)
					.selectAll()
					.execute()
					.catch(() => []);

				res.status(200).json({
					status: "success",
					message: "Credentials fetched successfully",
					data: credentials,
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
	post: async (req: Request, res: Response) => {
		const token = req.headers.authorization;
		const { name, ipWhitelist, permissions } = req.body;

		if (
			!name ||
			!permissions ||
			typeof name !== "string" ||
			(ipWhitelist && typeof ipWhitelist !== "string") ||
			!Array.isArray(permissions)
		)
			return res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
			});

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id && !user.fromApi) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				if (name.length < 3 || name.length > 32) {
					return res.status(400).json({
						status: "error",
						message: "Invalid key name",
						error: "INVALID_KEY_NAME",
					});
				}

				let nameExists = await db
					.selectFrom("apiCredentials")
					.where("name", "=", name)
					.execute()
					.then((credentials) => credentials.length > 0)
					.catch(() => false);

				if (nameExists)
					return res.status(400).json({
						status: "error",
						message: "A key with this name already exists",
						error: "KEY_NAME_EXISTS",
					});

				let ipWhitelistArray = ipWhitelist
					.split(",")
					.map((ip: string) => {
						return ip.trim().match(/^([0-9]{1,3}\.){3}[0-9]{1,3}$/)
							? ip.trim()
							: null;
					})
					.filter((ip: string | null) => ip !== null);

				async function genKey() {
					let key = randomBytes(16).toString("hex");

					let keyExists = await db
						.selectFrom("apiCredentials")
						.where("key", "=", key)
						.execute()
						.then((credentials) => credentials.length > 0)
						.catch(() => false);

					if (keyExists) return genKey();
					return key;
				}

				let key = await genKey();

				let query = await db
					.insertInto("apiCredentials")
					.values({
						userId: user.id,
						name,
						ipWhitelist: JSON.stringify(ipWhitelistArray),
						key,
						permissions: JSON.stringify(permissions),
					})
					.execute()
					.catch((err) => {
						console.error(err);
						return false;
					});

				if (!query)
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});

				res.status(200).json({
					status: "success",
					message: "Key created successfully",
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
	delete: async (req: Request, res: Response) => {
		const token = req.headers.authorization;
		const { key } = req.body;

		if (!key || typeof key !== "string")
			return res.status(400).json({
				status: "error",
				message: "Bad request",
				error: "BAD_REQUEST",
			});

		if (token && token.split(" ")[1]) {
			let user = await verifyToken(req, token.split(" ")[1]);

			if (user && user.id && !user.fromApi) {
				if (user.suspended)
					return res.status(403).json({
						status: "error",
						message: "Your account has been suspended",
						error: "ACCOUNT_SUSPENDED",
					});

				let query = await db
					.deleteFrom("apiCredentials")
					.where("key", "=", key)
					.execute()
					.catch(() => false);

				if (!query)
					return res.status(500).json({
						status: "error",
						message: "Internal server error",
						error: "INTERNAL_SERVER_ERROR",
					});

				res.status(200).json({
					status: "success",
					message: "Key deleted successfully",
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
