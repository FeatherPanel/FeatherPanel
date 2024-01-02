import "dotenv/config";

import { Request } from "express";
import * as jwt from "jsonwebtoken";
import { Socket } from "socket.io";

import { db } from "../database";

export const generateToken = (
	payload: any,
	expiresIn: string | number = 15778463
): string => {
	return jwt.sign(payload, process.env.JWT_SECRET as string, {
		expiresIn: expiresIn,
	}); // 6 months by default
};

export const verifyToken = async (
	req: Request | Socket,
	token: string
): Promise<jwt.JwtPayload | null> => {
	// CHECK IF TOKEN IS A JWT
	// @ts-ignore
	let verifiedJwt = jwt.verify(
		token,
		process.env.JWT_SECRET as string,
		{},
		(err: jwt.VerifyErrors | null, decoded: jwt.JwtPayload | string) => {
			if (err) return null;
			else return decoded as jwt.JwtPayload;
		}
	);

	if (verifiedJwt) return verifiedJwt;

	// CHECK IF TOKEN IS AN API KEY
	let apiCredential = await db
		.selectFrom("apiCredentials")
		.where("key", "=", token)
		.select(["userId", "permissions", "ipWhitelist"])
		.executeTakeFirst()
		.catch(() => null);

	if (!apiCredential) return null;

	let user = await db
		.selectFrom("user")
		.where("id", "=", apiCredential.userId)
		.selectAll()
		.executeTakeFirst()
		.catch(() => null);

	if (!user) return null;

	let permissions: string[] = [];
	try {
		permissions = JSON.parse(apiCredential.permissions);
	} catch {}

	// IP Whitelist
	let ipWhitelist: string[] = [];
	try {
		ipWhitelist = JSON.parse(apiCredential.ipWhitelist);
	} catch {
		return null;
	}

	if (ipWhitelist.length > 0) {
		let ip = "";

		if (req instanceof Socket) ip = req.handshake.address;
		else ip = req.socket.remoteAddress as string;

		if (ip.startsWith("::ffff:")) ip = ip.slice(7);

		if (!ipWhitelist.includes(ip)) return null;
	}

	return {
		...user,
		fromApi: true,
		permissions,
	};
};

export const decodeToken = (token: string): null | jwt.JwtPayload | string => {
	return jwt.decode(token);
};
