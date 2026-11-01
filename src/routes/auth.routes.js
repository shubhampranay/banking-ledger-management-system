const express = require("express");
const authController = require("../controllers/auth.controller");

const router = express.Router();

/**
 * ============================
 * Authentication Routes
 * Base URL: /api/auth
 * ============================
 */

// Register User
// POST /api/auth/register
router.post("/register", authController.userRegisterController);

// Login User
// POST /api/auth/login
router.post("/login", authController.userLoginController);

// Logout User
// POST /api/auth/logout
router.post("/logout", authController.userLogoutController);

module.exports = router;