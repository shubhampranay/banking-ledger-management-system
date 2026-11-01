const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const tokenBlackListModel = require("../models/blackList.model");

/**
 * ===============================
 * Get Token
 * ===============================
 */

function getToken(req) {
    if (req.cookies?.token) {
        return req.cookies.token;
    }

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.split(" ")[1];
    }

    return null;
}

/**
 * ===============================
 * Verify Authentication
 * ===============================
 */

async function authMiddleware(req, res, next) {
    try {
        const token = getToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Token is missing."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                success: false,
                message: "Authentication configuration error."
            });
        }

        const isBlacklisted = await tokenBlackListModel.findOne({
            token
        });

        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Token has been revoked."
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (!decoded.userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
        }

        const user = await userModel.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        req.user = user;

        next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token has expired. Please login again."
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
        }

        console.error("Authentication Error:", error.message);

        return res.status(401).json({
            success: false,
            message: "Authentication failed."
        });
    }
}

/**
 * ===============================
 * System User Authentication
 * ===============================
 */

async function authSystemUserMiddleware(req, res, next) {
    try {
        const token = getToken(req);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Token is missing."
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured.");

            return res.status(500).json({
                success: false,
                message: "Authentication configuration error."
            });
        }

        const isBlacklisted = await tokenBlackListModel.findOne({
            token
        });

        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Token has been revoked."
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        if (!decoded.userId) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
        }

        const user = await userModel
            .findById(decoded.userId)
            .select("+systemUser");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (!user.systemUser) {
            return res.status(403).json({
                success: false,
                message: "Forbidden. Only system users are allowed."
            });
        }

        req.user = user;

        next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token has expired. Please login again."
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
        }

        console.error(
            "System Authentication Error:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Authentication failed."
        });
    }
}

module.exports = {
    authMiddleware,
    authSystemUserMiddleware
};