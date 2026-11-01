require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 3000;

/**
 * =========================================
 * Environment Variables Check
 * =========================================
 *
 * We only check whether the values exist.
 * We NEVER print the actual secrets.
 */

console.log("========== ENV CHECK ==========");
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log(
    "CLIENT_ID exists:",
    !!process.env.CLIENT_ID
);
console.log(
    "CLIENT_SECRET exists:",
    !!process.env.CLIENT_SECRET
);
console.log(
    "REFRESH_TOKEN exists:",
    !!process.env.REFRESH_TOKEN
);
console.log("===============================");

/**
 * =========================================
 * Start Server
 * =========================================
 */

async function startServer() {
    try {
        /**
         * Connect to MongoDB first.
         */
        console.log("Connecting to MongoDB...");

        await connectDB();

        console.log("✅ Connected to MongoDB");

        /**
         * Start Express server
         * only after database connection succeeds.
         */
        const server = app.listen(PORT, () => {
            console.log(
                `🚀 Server is running on port ${PORT}`
            );

            console.log(
                `🌐 http://localhost:${PORT}`
            );
        });

        /**
         * =========================================
         * Handle Uncaught Exceptions
         * =========================================
         */

        process.on(
            "uncaughtException",
            (error) => {
                console.error(
                    "❌ UNCAUGHT EXCEPTION:",
                    error
                );

                server.close(() => {
                    process.exit(1);
                });
            }
        );

        /**
         * =========================================
         * Handle Unhandled Promise Rejections
         * =========================================
         */

        process.on(
            "unhandledRejection",
            (error) => {
                console.error(
                    "❌ UNHANDLED REJECTION:",
                    error
                );

                server.close(() => {
                    process.exit(1);
                });
            }
        );

        /**
         * =========================================
         * Graceful Shutdown - SIGTERM
         * =========================================
         */

        process.on("SIGTERM", () => {
            console.log(
                "SIGTERM received. Shutting down..."
            );

            server.close(() => {
                console.log(
                    "Server closed."
                );

                process.exit(0);
            });
        });

        /**
         * =========================================
         * Graceful Shutdown - SIGINT
         * =========================================
         */

        process.on("SIGINT", () => {
            console.log(
                "\nSIGINT received. Shutting down..."
            );

            server.close(() => {
                console.log(
                    "Server closed."
                );

                process.exit(0);
            });
        });

    } catch (error) {
        console.error(
            "❌ Failed to start server:",
            error
        );

        process.exit(1);
    }
}

startServer();