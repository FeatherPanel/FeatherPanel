import { Request, Response } from "express";

module.exports = {
	methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
	get: ping,
	post: ping,
	put: ping,
	delete: ping,
	patch: ping,
};

/**
 * @openapi
 * /ping:
 *  get:
 *   summary: Ping the API
 *   description: Ping the API to check if it's online and get the response time.
 *   tags:
 *   - Misc
 *   parameters:
 *   - name: start
 *     in: query
 *     required: false
 *     description: The start time of the request in timestamp format (ms)
 *     schema:
 *      type: number
 *   responses:
 *    200:
 *     description: Pong!
 *     content:
 *      application/json:
 *       schema:
 *        type: object
 *        properties:
 *         status:
 *          type: string
 *          example: success
 *         message:
 *          type: string
 *          example: Pong!
 *         data:
 *          type: object
 *          properties:
 *           start:
 *            type: number
 *            example: 1612345678901
 *           end:
 *            type: number
 *            example: 1612345678902
 *           responseTime:
 *            type: number
 *            example: 1
 */
function ping(req: Request, res: Response) {
	let start = req.body.start || req.query.start || res.locals.start;
	if (typeof start === "string") start = parseInt(start);
	if (typeof start !== "number" || isNaN(start)) start = Date.now();

	res.status(200).json({
		status: "success",
		message: "Pong!",
		data: {
			start: start,
			end: Date.now(),
			responseTime: Date.now() - start,
		},
	});
}
