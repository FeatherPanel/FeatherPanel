import { hashSync } from "bcryptjs";
import { exec } from "child_process";
import colors from "colors";
import { randomBytes } from "crypto";
import { Input, NumberPrompt, Password, Select } from "enquirer";
import fs from "fs";
import path from "path";

import pkg from "../../package.json";
import { initDatabase } from "../database";
import { syncConfig } from "./syncConfig";

const FP_COMMAND = process.platform === "win32" ? "fp" : "./fp";
const IS_DEBUG =
	process.env.NODE_ENV === "development" || process.argv.includes("--debug");

export async function panelConfig() {
	let config: any = {
		version: pkg.version,
	};

	console.log(
		colors.yellow.bold(
			"\r\nBienvenue dans l'assistant de configuration de FeatherPanel."
		)
	);

	/* DATABASE */
	console.log(
		colors.yellow.bold("\r\nConfiguration de la base de données :")
	);

	const dbType = await new Select({
		name: "dbType",
		message: "Veuillez choisir le type de base de données",
		choices: ["MySQL", "SQLite", "PostgreSQL"],
	})
		.run()
		.catch(() => process.exit(0));

	let sqlitePath: string;
	let dbHost: string;
	let dbPort: number;
	let dbUsername: string;
	let dbPassword: string;
	let dbName: string;

	if (dbType === "SQLite") {
		sqlitePath = await new Input({
			name: "sqlitePath",
			message: "Veuillez entrer le chemin vers le fichier SQLite",
			initial: path.join(__dirname, "..", "..", "featherpanel.db"),
			validate: (input: any) => {
				return typeof input === "string" && input.trim().length > 0;
			},
		})
			.run()
			.catch(() => process.exit(0));
	} else {
		dbHost = await new Input({
			name: "dbHost",
			message: "Veuillez entrer l'hôte de la base de données",
			initial: "localhost",
			validate: (input: any) => {
				return typeof input === "string" && input.trim().length > 0;
			},
		})
			.run()
			.catch(() => process.exit(0));

		dbPort = await new NumberPrompt({
			name: "dbPort",
			message: "Veuillez entrer le port de la base de données",
			initial:
				dbType === "MySQL" ? 3306 : dbType === "PostgreSQL" ? 5432 : 0,
			validate: (input: any) => {
				return typeof input === "number" && input > 0 && input < 65535;
			},
		})
			.run()
			.catch(() => process.exit(0));

		dbUsername = await new Input({
			name: "dbUsername",
			message:
				"Veuillez entrer le nom d'utilisateur de la base de données",
			initial: "root",
		})
			.run()
			.catch(() => process.exit(0));

		dbPassword = await new Password({
			name: "dbPassword",
			message:
				"Veuillez entrer le mot de passe de la base de données (optionnel)",
		})
			.run()
			.then((dbPassword: any) => {
				return dbPassword;
			})
			.catch(() => process.exit(0));

		dbName = await new Input({
			name: "dbName",
			message: "Veuillez entrer le nom de la base de données",
			initial: "featherpanel",
			validate: (input: any) => {
				return typeof input === "string" && input.trim().length > 0;
			},
		})
			.run()
			.catch(() => process.exit(0));
	}

	/* PANEL */
	console.log(colors.yellow.bold("\r\nConfiguration du panel :"));

	const appTitle = await new Input({
		name: "appTitle",
		message: "Veuillez entrer le nom du panel",
		initial: "Demo",
		validate: (input: any) => {
			return (
				typeof input === "string" &&
				input.trim().length > 3 &&
				input.trim().length < 32
			);
		},
	})
		.run()
		.catch(() => process.exit(0));

	const appHttpPort = await new NumberPrompt({
		name: "appHttpPort",
		message: "Veuillez entrer le port HTTP de l'application",
		initial: 80,
		validate: (input: any) => {
			return typeof input === "number";
		},
	})
		.run()
		.catch(() => process.exit(0));

	const appHttpsPort = await new NumberPrompt({
		name: "appHttpsPort",
		message: "Veuillez entrer le port HTTPS de l'application",
		initial: 443,
		validate: (input: any) => {
			return typeof input === "number" && input !== appHttpPort;
		},
	})
		.run()
		.catch(() => process.exit(0));

	let appUrl = await new Input({
		name: "appUrl",
		message:
			"Veuillez entrer l'URL de l'application (avec http:// ou https:// et en précisant le port s'il est différent de 80 ou 443)",
		initial: "http://127.0.0.1:" + appHttpPort,
		validate: (input: any) => {
			return (
				typeof input === "string" &&
				input.match(
					/^http:\/\/\w+(\.\w+)*(:[0-9]+)?\/?(\/[.\w]*)*$/
				) !== null
			);
		},
	})
		.run()
		.catch(() => process.exit(0));

	if (appUrl.endsWith("/")) appUrl = appUrl.slice(0, -1);
	if (appUrl.split("/")[2].split("/")[0].split(":")[0] === "localhost")
		appUrl = appUrl.replace("localhost", "127.0.0.1");

	const mainLanguage = await new Select({
		name: "mainLanguage",
		message: "Veuillez choisir la langue principale de l'application",
		choices: ["fr"],
		initial: 0,
	})
		.run()
		.catch(() => process.exit(0));

	const contactEmail = await new Input({
		name: "contactEmail",
		message: "Veuillez entrer l'adresse email de contact",
		validate: (input: any) => {
			return (
				typeof input === "string" &&
				input.match(
					/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
				) !== null
			);
		},
	})
		.run()
		.catch(() => process.exit(0));

	config.app = {
		name: appTitle,
		url: appUrl,
		httpPort: appHttpPort,
		httpsPort: appHttpsPort,
		ssl: false,
		lang: mainLanguage,
		contact: contactEmail,
	};

	/* ADMIN USER */
	console.log(
		colors.yellow.bold(
			"\r\nConfiguration du super-utilisateur (administrateur) :"
		)
	);

	const adminUsername = await new Input({
		name: "adminUsername",
		message: "Veuillez entrer un nom d'utilisateur",
		initial: "Administrateur",
		validate: (input: any) => {
			return (
				typeof input === "string" &&
				input.trim().length > 3 &&
				input.trim().length < 32 &&
				input.match(
					/^[a-zA-Z0-9À-ÿ\s\(\)\[\]\{\}\.\-\_\!\?\&\+\=\*]+$/
				) !== null
			);
		},
	})
		.run()
		.catch(() => process.exit(0));

	const adminEmail = await new Input({
		name: "adminEmail",
		message: "Veuillez entrer une adresse email",
		validate: (input: any) => {
			return (
				typeof input === "string" &&
				input.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) !== null
			);
		},
	})
		.run()
		.catch(() => process.exit(0));

	async function adminPasswordInput(): Promise<string> {
		const adminPassword = await new Password({
			name: "adminPassword",
			message: "Veuillez entrer un mot de passe",
			validate: (input: any) => {
				return (
					typeof input === "string" &&
					input.trim().length > 7 &&
					input.trim().length < 33
				);
			},
		})
			.run()
			.catch(() => process.exit(0));

		const adminPasswordConfirm = await new Password({
			name: "adminPasswordConfirm",
			message: "Veuillez confirmer le mot de passe",
			validate: (input: any) => {
				return (
					typeof input === "string" &&
					input.trim().length > 7 &&
					input.trim().length < 33
				);
			},
		})
			.run()
			.catch(() => process.exit(0));

		if (adminPassword !== adminPasswordConfirm) {
			console.log(
				colors.red.bold(
					"\r\nLes mots de passe ne correspondent pas !\r\n"
				)
			);
			return await adminPasswordInput();
		} else {
			return adminPassword;
		}
	}

	const adminPassword = await adminPasswordInput();

	config.userSettings = {
		enableRegistration: true,
		enablePasswordChange: true,
		enableAccountDetailsChange: true,
	};

	/* SAVE CONFIG */
	fs.writeFileSync(
		path.join(__dirname, "..", "..", "config.json"),
		JSON.stringify(config, null, 2)
	);

	if (!syncConfig()) {
		console.log(
			colors.red.bold(
				"\r\nUne erreur est survenue lors de la sauvegarde de la configuration."
			)
		);
		process.exit(1);
	}

	let env = [
		`DATABASE_TYPE=${dbType.toLowerCase()}`,
		`DATABASE_SQLITE_PATH="${sqlitePath! || ""}"`,
		`DATABASE_HOST=${dbHost! || ""}`,
		`DATABASE_PORT=${dbPort! || ""}`,
		`DATABASE_USER="${dbUsername! || ""}"`,
		`DATABASE_PASSWORD="${dbPassword! || ""}"`,
		`DATABASE_NAME="${dbName! || ""}"`,
		`SFTP_SECRET=${randomBytes(32).toString("hex")}`,
		`JWT_SECRET=${randomBytes(32).toString("hex")}`,
		`DAEMON_SECRET=${randomBytes(32).toString("hex")}`,
		`SMTP_SETTINGS=${btoa(
			JSON.stringify({
				enabled: false,
				host: null,
				port: null,
				auth: { user: null, pass: null },
				secure: false,
			})
		)}`,
	];

	fs.writeFileSync(path.join(__dirname, "..", "..", ".env"), env.join("\n"));

	/* CREATE DATABASE */
	let dbCreate = exec("npm run db:create");

	dbCreate.on("close", async (code) => {
		if (code !== 0) {
			fs.unlinkSync(path.join(__dirname, "..", "..", "config.json"));
			fs.unlinkSync(path.join(__dirname, "..", "..", ".env"));

			console.log();
			console.log(
				colors.red.bold(
					"\r\nUne erreur est survenue lors de la connexion à la base de données."
				)
			);
			console.log(
				colors.red.bold(
					"Veuillez vérifier vos informations de connexion et réessayer.\r\n"
				)
			);
			process.exit(1);
		}

		const db = initDatabase(false, {
			type: dbType.toLowerCase(),
			sqlitePath: sqlitePath,
			host: dbHost,
			port: dbPort,
			user: dbUsername,
			password: dbPassword,
			database: dbName,
		});

		if (!db) {
			console.log();
			console.log(
				colors.red.bold(
					"\r\nUne erreur est survenue lors de la connexion à la base de données."
				)
			);
			console.log(
				colors.red.bold(
					"Veuillez vérifier vos informations de connexion et réessayer.\r\n"
				)
			);
			process.exit(1);
		}

		await db
			.insertInto("user")
			.values({
				name: adminUsername,
				password: hashSync(adminPassword, 10),
				email: adminEmail,
				emailVerified: true,
				lang: mainLanguage,
				admin: true,
				superuser: true,
			})
			.executeTakeFirst()
			.then(() => {
				console.log();
				console.log(
					colors.green.bold("\r\nConfiguration terminée !\r\n")
				);

				console.log(
					colors.cyan(
						`Vous pouvez maintenant démarer le panel avec la commande ${colors.cyan.bold(
							FP_COMMAND + " start"
						)}`
					)
				);
				console.log(
					colors.cyan(
						`Tapez ${colors.cyan.bold(
							FP_COMMAND + " help"
						)} pour plus d'informations.\r\n`
					)
				);

				process.exit(0);
			})
			.catch((err) => {
				fs.unlinkSync(path.join(__dirname, "..", "..", "config.json"));
				fs.unlinkSync(path.join(__dirname, "..", "..", ".env"));

				console.log(
					colors.red.bold(
						"Une erreur est survenue lors de la connexion à la base de données."
					)
				);
				console.log(
					colors.red.bold(
						"Veuillez vérifier vos informations de connexion et réessayer.\r\n"
					)
				);
				if (IS_DEBUG) console.debug("ERROR:", err);

				process.exit(1);
			});
	});

	dbCreate.on("error", (err) => {
		fs.unlinkSync(path.join(__dirname, "..", "..", "config.json"));
		fs.unlinkSync(path.join(__dirname, "..", "..", ".env"));

		console.log(
			colors.red.bold(
				"\r\nUne erreur est survenue lors de la connexion à la base de données."
			)
		);
		console.log(
			colors.red.bold(
				"Veuillez vérifier vos informations de connexion et réessayer.\r\n"
			)
		);
		if (IS_DEBUG) console.debug("ERROR:", err);

		process.exit(1);
	});
}
