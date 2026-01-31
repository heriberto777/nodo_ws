const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const routes = require("./routes");
const errorMiddleware = require("./middlewares/error.middleware");
const env = require("./config/env");

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "2mb" }));

app.use("/api", routes);

app.use(errorMiddleware);

module.exports = app;
