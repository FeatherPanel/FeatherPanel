import { Express } from "express";
import path from "path";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import { version } from "../../package.json";
import { CONFIG, FP_TERMS_URL } from "../constants";

const options: swaggerJsdoc.Options = {
	definition: {
		openapi: "3.1.0",
		info: {
			title: CONFIG.app.name + " API",
			description:
				CONFIG.app.name +
				" official API documentation powered by FeatherPanel.",
			termsOfService: FP_TERMS_URL,
			version,
			contact: {
				name: CONFIG.app.name,
				url: CONFIG.app.url,
				email: CONFIG.app.contact,
			},
		},
		servers: [
			{
				url: "/api/v1",
				description: "API v1",
			},
		],
		components: {
			responses: {
				BadRequest: {
					description: "Bad request",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									status: {
										type: "string",
										example: "error",
									},
									message: {
										type: "string",
										example: "Bad request",
									},
									error: {
										type: "string",
										example: "BAD_REQUEST",
									},
								},
							},
						},
					},
				},
				Unauthorized: {
					description: "Access token is missing or invalid",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									status: {
										type: "string",
										example: "error",
									},
									message: {
										type: "string",
										example:
											"Access token is missing or invalid",
									},
									error: {
										type: "string",
										example: "UNAUTHORIZED",
									},
								},
							},
						},
					},
				},
				Forbidden: {
					description:
						"You don't have the required permissions to access this resource",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									status: {
										type: "string",
										example: "error",
									},
									message: {
										type: "string",
										example:
											"You don't have the required permissions to access this resource",
									},
									error: {
										type: "string",
										example: "FORBIDDEN",
									},
								},
							},
						},
					},
				},
				NotFound: {
					description: "Resource not found",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									status: {
										type: "string",
										example: "error",
									},
									message: {
										type: "string",
										example: "Resource not found",
									},
									error: {
										type: "string",
										example: "NOT_FOUND",
									},
								},
							},
						},
					},
				},
				InternalServerError: {
					description: "Internal server error",
					content: {
						"application/json": {
							schema: {
								type: "object",
								properties: {
									status: {
										type: "string",
										example: "error",
									},
									message: {
										type: "string",
										example: "Internal server error",
									},
									error: {
										type: "string",
										example: "INTERNAL_SERVER_ERROR",
									},
								},
							},
						},
					},
				},
			},
			securitySchemes: {
				BearerAuth: {
					type: "http",
					scheme: "bearer",
				},
			},
		},
		security: [
			{
				BearerAuth: [],
			},
		],
		tags: [
			{
				name: "Servers",
				description: "Servers management",
			},
			{
				name: "Power",
				description: "Server power management",
			},
			{
				name: "Console",
				description: "Server console management",
			},
			{
				name: "Files",
				description: "Server files management",
			},
			{
				name: "Subusers",
				description: "Server subusers management",
			},
			{
				name: "Backups",
				description: "Server backups management",
			},
			{
				name: "User",
				description: "User management",
			},
			{
				name: "Misc",
				description: "Miscellaneous endpoints",
			},
		],
	},
	apis: [path.join(__dirname, "../api-v1/**/*.ts")],
};

const swaggerSpec = swaggerJsdoc(options);

function swaggerDocs(app: Express) {
	// Swagger UI
	app.use("/api/v1/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

	// Swagger JSON
	app.get("/api/v1", (req, res) => {
		res.setHeader("Content-Type", "application/json");
		res.send(swaggerSpec);
	});
}

export default swaggerDocs;
