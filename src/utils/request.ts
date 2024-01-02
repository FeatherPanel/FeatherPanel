import { Response } from "express";

export function isBodyEmpty(body: any) {
	return Object.keys(body).length === 0;
}

export function isBodyValid(body: any, res: Response): boolean {
	if (!body) {
		res.status(400).json({
			status: "error",
			message: "Body is undefined",
		});
		return false;
	}

	if (isBodyEmpty(body)) {
		res.status(400).json({
			status: "error",
			message: "Body is empty",
		});
		return false;
	}

	return true;
}

export function isPermissionsValid(
	res: Response | null,
	permissions: string[],
	permissionNeeded: string | string[]
): boolean {
	if (!permissions || !Array.isArray(permissions)) {
		if (res)
			res.status(403).json({
				status: "error",
				message:
					"You don't have the required permissions to access this resource",
				error: "FORBIDDEN",
			});
		return false;
	}

	if (typeof permissionNeeded === "string") {
		if (!permissions.includes(permissionNeeded)) {
			if (res)
				res.status(403).json({
					status: "error",
					message:
						"You don't have the required permissions to access this resource",
					error: "FORBIDDEN",
				});
			return false;
		}
	} else {
		let hasPermission = true;

		permissionNeeded.forEach((permission) => {
			if (!permissions.includes(permission)) hasPermission = false;
		});

		if (!hasPermission) {
			if (res)
				res.status(403).json({
					status: "error",
					message: "You don't have the required permissions to access this resource",
					error: "FORBIDDEN",
				});
			return false;
		}
	}

	return true;
}
