import { ComparisonOperatorExpression, ReferenceExpression } from "kysely";

import { db } from "../database";
import { Database, User } from "../types";
import { generateToken } from "./jwt";

export const generateUserToken = (user: User) => {
	return generateToken({
		admin: user.admin,
		email: user.email,
		id: user.id,
		name: user.name,
		suspended: user.suspended,
	});
};

export const findUserToken = async (
	expression: ReferenceExpression<Database, "user">,
	operator: ComparisonOperatorExpression,
	value: any
): Promise<string | null> => {
	let user = await db
		.selectFrom("user")
		.selectAll()
		.where(expression, operator, value)
		.executeTakeFirst();

	if (user) return generateUserToken(user);

	return null;
};

export const hasPermission = async (
	user: number | any,
	serverId?: number | null,
	permission: string = ""
) => {
	// SUBUSER PERMISSIONS
	if (serverId) {
		let subuser;
		if (typeof user === "number") {
			subuser = await db
				.selectFrom("subuser")
				.where("userId", "=", user)
				.where("serverId", "=", serverId)
				.select("permissions")
				.executeTakeFirst()
				.catch(() => null);
		} else {
			if (!user.id) return false;

			subuser = await db
				.selectFrom("subuser")
				.where("userId", "=", user.id)
				.where("serverId", "=", serverId)
				.select("permissions")
				.executeTakeFirst()
				.catch(() => null);
		}

		if (subuser) {
			if (permission === "") return true;

			try {
				let permissions = JSON.parse(subuser.permissions);
				if (permissions.includes(permission)) return true;

				// category.*
				let categoryArray = permission.split(".");
				categoryArray.pop();
				if (permissions.includes(categoryArray.join(".") + ".*"))
					return true;
			} catch {}
		}

		return false;
	}
	// API TOKEN PERMISSIONS
	else if (user?.fromApi) {
		if (user.permissions.includes(permission)) return true;

		// category.*
		let categoryArray = permission.split(".");
		categoryArray.pop();
		if (user.permissions.includes(categoryArray.join(".") + ".*"))
			return true;
	} else {
		return true;
	}

	return false;
};
