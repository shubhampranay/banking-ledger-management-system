
const { Router } = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const transactionController = require("../controllers/transaction.controller");

const transactionRoutes = Router();

/**
 * =====================================================
 * GET /api/transactions
 * Get Logged-in User Transaction History
 * Protected Route
 * =====================================================
 */

transactionRoutes.get(
    "/",
    authMiddleware.authMiddleware,
    transactionController.getTransactionHistory
);

/**
 * =====================================================
 * POST /api/transactions
 * Create a New Transaction
 * Protected Route
 * =====================================================
 */

transactionRoutes.post(
    "/",
    authMiddleware.authMiddleware,
    transactionController.createTransaction
);

/**
 * =====================================================
 * POST /api/transactions/system/initial-funds
 * Create Initial Funds
 * System User Only
 * =====================================================
 */

transactionRoutes.post(
    "/system/initial-funds",
    authMiddleware.authSystemUserMiddleware,
    transactionController.createInitialFundsTransaction
);

module.exports = transactionRoutes;

