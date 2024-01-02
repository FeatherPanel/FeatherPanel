import "colors";
import "dotenv/config";

import { promises as fs } from "fs";
import { FileMigrationProvider, Migrator } from "kysely";
import * as path from "path";

import { db } from "../database";

async function migrateToLatest() {
	const migrator = new Migrator({
		db,
		provider: new FileMigrationProvider({
			fs,
			path,
			migrationFolder: path.join(
				__dirname,
				"..",
				"migrations",
				process.env.DATABASE_TYPE!
			),
		}),
	});

	const { error, results } = await migrator.migrateToLatest();

	results?.forEach((it) => {
		if (it.status === "Success") {
			console.log(`${it.migrationName}: exécution réussie`.green);
		} else if (it.status === "Error") {
			console.error(
				`${it.migrationName}: erreur lors de l'exécution`.red
			);
		}
	});

	if (error) {
		console.error(
			"Une erreur est survenue lors de l'exécution des migrations".red
				.bold
		);
		console.error(error.toString().split("\n")[0].red.italic);
		console.error();
		process.exit(1);
	}

	await db.destroy();
}

console.log("Création de la base de données...".yellow);

migrateToLatest();
