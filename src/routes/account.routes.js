const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const accountController = require("../controllers/account.controller");

const router = express.Router();

/**
 * ==========================================
 * Account Routes
 * Base URL: /api/accounts
 * ==========================================
 */

/**
 * Create New Account
 * POST /api/accounts
 * Protected Route
 */
router.post(
    "/",
    authMiddleware.authMiddleware,
    accountController.createAccountController
);

/**
 * Get All Accounts
 * GET /api/accounts
 * Protected Route
 */
router.get(
    "/",
    authMiddleware.authMiddleware,
    accountController.getUserAccountsController
);

/**
 * Get Account Balance
 * GET /api/accounts/balance/:accountId
 * Protected Route
 */
router.get(
    "/balance/:accountId",
    authMiddleware.authMiddleware,
    accountController.getAccountBalanceController
);

/**
 * Update Account Status
 * PATCH /api/accounts/:accountId/status
 * Protected Route
 */
router.patch(
    "/:accountId/status",
    authMiddleware.authMiddleware,
    accountController.updateAccountStatusController
);

module.exports = router;