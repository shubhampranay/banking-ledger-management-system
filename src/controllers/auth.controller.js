const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");
const tokenBlackListModel = require("../models/blackList.model");

/**
 * ===============================
 * Generate JWT Token
 * ===============================
 */

const generateToken = (userId) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured.");
    }

    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        {
            expiresIn: "3d"
        }
    );
};

/**
 * ===============================
 * Cookie Options
 * ===============================
 */

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 3 * 24 * 60 * 60 * 1000
};

/**
 * ===============================
 * User Register Controller
 * POST /api/auth/register
 * ===============================
 */

async function userRegisterController(req, res) {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const trimmedName = name.trim();

        if (!trimmedName) {
            return res.status(400).json({
                success: false,
                message: "Name cannot be empty."
            });
        }

        const isExists = await userModel.findOne({
            email: normalizedEmail
        });

        if (isExists) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email."
            });
        }

        const user = await userModel.create({
            email: normalizedEmail,
            password,
            name: trimmedName
        });

        const token = generateToken(user._id);

        res.cookie("token", token, cookieOptions);

        /*
         * Email failure should not make a successfully
         * registered user look like registration failed.
         */
        try {
            await emailService.sendRegistrationEmail(
                user.email,
                user.name
            );
        } catch (emailError) {
            console.error(
                "Registration email error:",
                emailError.message
            );
        }

        return res.status(201).json({
            success: true,
            message: "User registered successfully.",
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
        });

    } catch (error) {
        console.error("Register Error:", error.message);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "User already exists with this email."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

/**
 * ===============================
 * User Login Controller
 * POST /api/auth/login
 * ===============================
 */

async function userLoginController(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await userModel
            .findOne({ email: normalizedEmail })
            .select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Email or password is invalid."
            });
        }

        const isValidPassword =
            await user.comparePassword(password);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: "Email or password is invalid."
            });
        }

        const token = generateToken(user._id);

        res.cookie("token", token, cookieOptions);

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            user: {
                _id: user._id,
                email: user.email,
                name: user.name
            },
            token
        });

    } catch (error) {
        console.error("Login Error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

/**
 * ===============================
 * User Logout Controller
 * POST /api/auth/logout
 * ===============================
 */

async function userLogoutController(req, res) {
    try {
        const token =
            req.cookies?.token ||
            (
                req.headers.authorization &&
                req.headers.authorization.startsWith("Bearer ")
                    ? req.headers.authorization.split(" ")[1]
                    : null
            );

        if (token) {
            const alreadyBlacklisted =
                await tokenBlackListModel.findOne({ token });

            if (!alreadyBlacklisted) {
                await tokenBlackListModel.create({
                    token
                });
            }
        }

        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite:
                process.env.NODE_ENV === "production"
                    ? "none"
                    : "lax"
        });

        return res.status(200).json({
            success: true,
            message: "User logged out successfully."
        });

    } catch (error) {
        console.error("Logout Error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController
};