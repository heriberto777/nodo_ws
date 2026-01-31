const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const routes = require("./routes");
const errorMiddleware = require("./middlewares/error.middleware");
const env = require("./config/env");
const logger = require("./config/logger");

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
	const start = Date.now();
	res.on("finish", () => {
		const durationMs = Date.now() - start;
		logger.info("HTTP", {
			method: req.method,
			path: req.originalUrl,
			status: res.statusCode,
			durationMs,
			ip: req.ip
		});
	});
	next();
});

app.use("/api", routes);

app.use(errorMiddleware);

module.exports = app;
