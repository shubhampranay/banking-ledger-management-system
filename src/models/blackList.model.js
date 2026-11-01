const mongoose = require("mongoose");

const tokenBlacklistSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: [true, "Token is required."],
            unique: true,
            trim: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

/**
 * ===============================
 * Automatically Delete Expired Tokens
 * ===============================
 *
 * JWT expires after 3 days.
 * Blacklisted tokens don't need to remain
 * in the database after that.
 */

tokenBlacklistSchema.index(
    { createdAt: 1 },
    {
        expireAfterSeconds: 3 * 24 * 60 * 60
    }
);

const TokenBlacklist = mongoose.model(
    "TokenBlacklist",
    tokenBlacklistSchema
);

module.exports = TokenBlacklist;