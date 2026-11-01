const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const errorMiddleware = require("./middleware/error.middleware");

const authRouter = require("./routes/auth.routes");
const accountRouter = require("./routes/account.routes");
const transactionRouter = require("./routes/transaction.routes");

const app = express();

/* ---------------- Security ---------------- */

app.use(helmet());

app.use(cors({
    origin: true,
    credentials: true
}));

/* ---------------- Middlewares ---------------- */

app.use(compression());

app.use(morgan("dev"));

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(cookieParser());

/* ---------------- Rate Limiter ---------------- */

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
});

app.use(limiter);

/* ---------------- Health Check ---------------- */

app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Ledger Service is up and running"
    });
});

/* ---------------- API Routes ---------------- */

app.use("/api/auth", authRouter);

app.use("/api/accounts", accountRouter);

app.use("/api/transactions", transactionRouter);

/* ---------------- 404 Handler ---------------- */

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route Not Found"
    });
});

/* ---------------- Global Error Handler ---------------- */

app.use(errorMiddleware);

module.exports = app;