import fs from "fs";
import path from "path";

export function syncConfig() {
	try {
		let conf = JSON.parse(
			fs.readFileSync(
				path.join(__dirname, "..", "..", "config.json"),
				"utf-8"
			)
		);
		let confJs = `export default atob("${btoa(JSON.stringify(conf))}");`;
		let confPath = path.join(
			__dirname,
			"..",
			"..",
			"public",
			"assets",
			"config.js"
		);

		fs.writeFileSync(confPath, confJs);

		return true;
	} catch {
		return false;
	}
}
