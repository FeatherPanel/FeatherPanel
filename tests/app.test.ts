import "dotenv/config";
import "jest";

import request from "supertest";

import { app } from "../src/app";

beforeAll(() => {
	process.env.NODE_ENV = "test";
});

describe("GET /api/v1", () => {
	it("should response with 200 OK and Swagger JSON", async () => {
		const response = await request(app).get("/api/v1");

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty("openapi");
	});
});

describe("GET /api/v1/docs/", () => {
	it("should response with 200 OK and Swagger UI", async () => {
		const response = await request(app).get("/api/v1/docs/");

		expect(response.statusCode).toBe(200);
		expect(response.text).toContain("Swagger UI");
	});
});

describe("GET /api/v1/servers", () => {
	it("should response with 200 OK", async () => {
		const response = await request(app)
			.get("/api/v1/servers")
			.set("Authorization", `Bearer ${process.env.TEST_API_KEY}`);

		expect(response.statusCode).toBe(200);
		expect(response.body).toHaveProperty("data");
		expect(response.body.data).toBeInstanceOf(Array);
	});

	it("should response with 401 Unauthorized", async () => {
		const response = await request(app).get("/api/v1/servers");

		expect(response.statusCode).toBe(401);
		expect(response.body).toHaveProperty("error");
		expect(response.body.error).toBe("UNAUTHORIZED");
	});
});
