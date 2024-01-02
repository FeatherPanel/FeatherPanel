export function isSmtpEnabled(smtp: any = null) {
	if (!smtp) {
		try {
			smtp = JSON.parse(atob(process.env.SMTP_SETTINGS!));
		} catch {
			return false;
		}
	}

	if (
		!smtp?.enabled ||
		typeof smtp.host !== "string" ||
		typeof smtp.port !== "number" ||
		typeof smtp.secure !== "boolean" ||
		typeof smtp.auth !== "object" ||
		typeof smtp.auth.user !== "string" ||
		typeof smtp.auth.pass !== "string"
	) {
		return false;
	}

	return true;
}
