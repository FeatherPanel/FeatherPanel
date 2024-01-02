import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { router } from "express-file-routing";
import path from "path";
import serveStatic from "serve-static";

import logger from "./utils/logger";
import swaggerDocs from "./utils/swagger";

const app = express();

(async () => {
	// Middlewares
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(
		cors({
			origin: "*",
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		})
	);

	app.use((req, res, next) => {
		res.locals.start = Date.now();
		next();
	});

	app.use((req, res, next) => {
		res.setHeader("X-Powered-By", "FeatherPanel");
		next();
	});

	// Disable cache for config.js
	app.use((req, res, next) => {
		if (req.url.startsWith("/assets/config.js")) {
			res.setHeader(
				"Cache-Control",
				"no-store, no-cache, must-revalidate, proxy-revalidate"
			);
			res.setHeader("Pragma", "no-cache");
			res.setHeader("Expires", "0");
			res.setHeader("Surrogate-Control", "no-store");
			res.removeHeader("ETag");
		}
		next();
	});

	// Static files
	app.use(
		serveStatic(path.join(__dirname, "..", "public"), {
			maxAge: "1y",
			dotfiles: "ignore",
		})
	);

	// Swagger
	swaggerDocs(app);

	// Logging
	app.all("*", async (req, res, next) => {
		console.log();
		logger.info(`Request: ${req.method.green} ${req.originalUrl.cyan}`);
		logger.info(
			`Body: ${
				JSON.stringify(req.body).replace(
					/"password":"(.*)"/g,
					'"password":"********"'
				).gray
			}`
		);
		logger.info(`Headers: ${JSON.stringify(req.headers).gray}`);
		logger.info(`User: ${(req.ip || "unknown").magenta}`);
		console.log();

		next();
	});

	// API v1 routes
	app.use(
		"/api/v1",
		await router({
			directory: path.join(__dirname, "api-v1"),
			routerOptions: {
				caseSensitive: true,
				mergeParams: false,
			},
		})
	);

	app.all("/api/*", (req: any, res: any) => {
		if (req.originalUrl.startsWith("/api/docs")) return;
		res.status(404).json({
			status: "error",
			message: "Resource not found",
			error: "NOT_FOUND",
		});
	});

	app.get("*", (req, res) => {
		res.sendFile(path.join(__dirname, "..", "public", "index.html"));
	});
})();

export { app };
