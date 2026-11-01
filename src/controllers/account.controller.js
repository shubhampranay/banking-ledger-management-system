const mongoose = require("mongoose");
const accountModel = require("../models/account.model");

/**
 * =========================================
 * Create New Account
 * POST /api/accounts
 * =========================================
 */

async function createAccountController(req, res) {
    try {
        const account = await accountModel.create({
            user: req.user._id,
            currency: "INR"
        });

        return res.status(201).json({
            success: true,
            message: "Account created successfully.",
            account
        });

    } catch (error) {
        console.error(
            "Create Account Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

/**
 * =========================================
 * Get All Accounts of Logged-in User
 * GET /api/accounts
 * =========================================
 */

async function getUserAccountsController(req, res) {
    try {
        const accounts = await accountModel
            .find({
                user: req.user._id
            })
            .sort({
                createdAt: -1
            });

        return res.status(200).json({
            success: true,
            totalAccounts: accounts.length,
            accounts
        });

    } catch (error) {
        console.error(
            "Get Accounts Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

/**
 * =========================================
 * Get Account Balance
 * GET /api/accounts/balance/:accountId
 * =========================================
 */

async function getAccountBalanceController(req, res) {
    try {
        const { accountId } = req.params;

        /**
         * Validate MongoDB ObjectId.
         */
        if (!mongoose.Types.ObjectId.isValid(accountId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid account ID."
            });
        }

        /**
         * Make sure account belongs
         * to the logged-in user.
         */
        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Account not found."
            });
        }

        const balance = await account.getBalance();

        return res.status(200).json({
            success: true,
            accountId: account._id,
            currency: account.currency,
            status: account.status,
            balance
        });

    } catch (error) {
        console.error(
            "Balance Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

/**
 * =========================================
 * Update Account Status
 * PATCH /api/accounts/:accountId/status
 * =========================================
 */

async function updateAccountStatusController(req, res) {
    try {
        const { accountId } = req.params;
        const { status } = req.body;

        /**
         * Validate MongoDB ObjectId.
         */
        if (!mongoose.Types.ObjectId.isValid(accountId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid account ID."
            });
        }

        /**
         * Validate status.
         */
        const allowedStatuses = [
            "ACTIVE",
            "FROZEN",
            "CLOSED"
        ];

        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message:
                    "Status must be ACTIVE, FROZEN, or CLOSED."
            });
        }

        /**
         * Find account belonging to
         * currently logged-in user.
         */
        const account = await accountModel.findOne({
            _id: accountId,
            user: req.user._id
        });

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Account not found."
            });
        }

        /**
         * Prevent changing a CLOSED account.
         */
        if (account.status === "CLOSED") {
            return res.status(400).json({
                success: false,
                message:
                    "A CLOSED account cannot be modified."
            });
        }

        /**
         * Prevent unnecessary update.
         */
        if (account.status === status) {
            return res.status(200).json({
                success: true,
                message:
                    `Account is already ${status}.`,
                account
            });
        }

        account.status = status;

        await account.save();

        return res.status(200).json({
            success: true,
            message:
                `Account status updated to ${status}.`,
            account
        });

    } catch (error) {
        console.error(
            "Update Account Status Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}

module.exports = {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController,
    updateAccountStatusController
};