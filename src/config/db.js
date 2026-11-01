const mongoose = require("mongoose");

/**
 * =========================================
 * Connect to MongoDB
 * =========================================
 */

async function connectDB() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error(
                "MONGO_URI is not defined in .env"
            );
        }

        console.log("Connecting to MongoDB...");

        await mongoose.connect(
            process.env.MONGO_URI
        );

        console.log(
            "✅ Connected to MongoDB"
        );

    } catch (error) {
        console.error(
            "❌ Error connecting to DB:",
            error.message
        );

        throw error;
    }
}

module.exports = connectDB;