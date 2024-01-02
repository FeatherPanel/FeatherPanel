import fs from "fs";

export function parseJSON(json: string, fallback: any = null): any {
	try {
		return JSON.parse(json);
	} catch {
		return fallback;
	}
}

export function parseJSONFile(file: string, fallback: any = null): any {
	try {
		let content = fs.readFileSync(file).toString();
		return JSON.parse(content);
	} catch {
		return fallback;
	}
}
