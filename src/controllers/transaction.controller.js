
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");

/**
 * =====================================================
 * Create Transaction
 * POST /api/transactions
 * =====================================================
 */

async function createTransaction(req, res) {
    const session = await mongoose.startSession();

    try {
        const {
            fromAccount,
            toAccount,
            amount,
            idempotencyKey
        } = req.body;

        if (
            !fromAccount ||
            !toAccount ||
            amount === undefined ||
            !idempotencyKey
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "fromAccount, toAccount, amount and idempotencyKey are required."
            });
        }

        if (
            !mongoose.Types.ObjectId.isValid(fromAccount) ||
            !mongoose.Types.ObjectId.isValid(toAccount)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid sender or receiver account ID."
            });
        }

        if (fromAccount === toAccount) {
            return res.status(400).json({
                success: false,
                message:
                    "Sender and receiver accounts must be different."
            });
        }

        const numericAmount = Number(amount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than zero."
            });
        }

        const cleanIdempotencyKey =
            String(idempotencyKey).trim();

        if (cleanIdempotencyKey.length < 8) {
            return res.status(400).json({
                success: false,
                message:
                    "Idempotency key must be at least 8 characters long."
            });
        }

        const existingTransaction =
            await transactionModel.findOne({
                idempotencyKey: cleanIdempotencyKey
            });

        if (existingTransaction) {
            switch (existingTransaction.status) {
                case "COMPLETED":
                    return res.status(200).json({
                        success: true,
                        message:
                            "Transaction already processed.",
                        transaction: existingTransaction
                    });

                case "PENDING":
                    return res.status(202).json({
                        success: false,
                        message:
                            "Transaction is already processing.",
                        transaction: existingTransaction
                    });

                case "FAILED":
                    return res.status(400).json({
                        success: false,
                        message:
                            "Previous transaction failed. Retry with a new idempotency key."
                    });

                case "REVERSED":
                    return res.status(400).json({
                        success: false,
                        message:
                            "Transaction was reversed.",
                        transaction: existingTransaction
                    });
            }
        }

        session.startTransaction();

        const senderAccount =
            await accountModel.findOne(
                {
                    _id: fromAccount,
                    user: req.user._id
                }
            ).session(session);

        const receiverAccount =
            await accountModel.findById(
                toAccount
            ).session(session);

        if (!senderAccount) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message:
                    "Sender account not found or does not belong to you."
            });
        }

        if (!receiverAccount) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message: "Receiver account not found."
            });
        }

        if (
            senderAccount.status !== "ACTIVE" ||
            receiverAccount.status !== "ACTIVE"
        ) {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message:
                    "Both accounts must be ACTIVE."
            });
        }

        if (
            senderAccount.currency !==
            receiverAccount.currency
        ) {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message:
                    "Sender and receiver accounts must use the same currency."
            });
        }

        const ledgerData =
            await ledgerModel.aggregate([
                {
                    $match: {
                        account: senderAccount._id
                    }
                },
                {
                    $group: {
                        _id: null,

                        totalDebit: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            "$type",
                                            "DEBIT"
                                        ]
                                    },
                                    "$amount",
                                    0
                                ]
                            }
                        },

                        totalCredit: {
                            $sum: {
                                $cond: [
                                    {
                                        $eq: [
                                            "$type",
                                            "CREDIT"
                                        ]
                                    },
                                    "$amount",
                                    0
                                ]
                            }
                        }
                    }
                }
            ]).session(session);

        const totalCredit =
            ledgerData.length
                ? ledgerData[0].totalCredit
                : 0;

        const totalDebit =
            ledgerData.length
                ? ledgerData[0].totalDebit
                : 0;

        const balance =
            totalCredit - totalDebit;

        if (balance < numericAmount) {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message:
                    `Insufficient balance. Current Balance: ${balance}`
            });
        }

        const transaction =
            (
                await transactionModel.create(
                    [
                        {
                            fromAccount:
                                senderAccount._id,

                            toAccount:
                                receiverAccount._id,

                            amount:
                                numericAmount,

                            idempotencyKey:
                                cleanIdempotencyKey,

                            status: "PENDING"
                        }
                    ],
                    { session }
                )
            )[0];

        await ledgerModel.create(
            [
                {
                    account:
                        senderAccount._id,

                    amount:
                        numericAmount,

                    transaction:
                        transaction._id,

                    type: "DEBIT"
                }
            ],
            { session }
        );

        await ledgerModel.create(
            [
                {
                    account:
                        receiverAccount._id,

                    amount:
                        numericAmount,

                    transaction:
                        transaction._id,

                    type: "CREDIT"
                }
            ],
            { session }
        );

        transaction.status = "COMPLETED";

        await transaction.save({
            session
        });

        await session.commitTransaction();

        try {
            await emailService.sendTransactionEmail(
                req.user.email,
                req.user.name,
                numericAmount,
                receiverAccount._id
            );
        } catch (emailError) {
            console.error(
                "Transaction email error:",
                emailError.message
            );
        }

        return res.status(201).json({
            success: true,
            message:
                "Transaction completed successfully.",
            transaction
        });

    } catch (error) {
        console.error(
            "Transaction Error:",
            error.message
        );

        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        if (error.code === 11000) {
            const existingTransaction =
                await transactionModel.findOne({
                    idempotencyKey:
                        req.body.idempotencyKey
                });

            if (existingTransaction) {
                return res.status(200).json({
                    success: true,
                    message:
                        "Transaction already processed.",
                    transaction:
                        existingTransaction
                });
            }
        }

        return res.status(500).json({
            success: false,
            message: "Transaction failed."
        });

    } finally {
        await session.endSession();
    }
}

/**
 * =====================================================
 * Create Initial Funds Transaction
 * POST /api/transactions/system/initial-funds
 * =====================================================
 */

async function createInitialFundsTransaction(req, res) {
    const session = await mongoose.startSession();

    try {
        const {
            toAccount,
            amount,
            idempotencyKey
        } = req.body;

        if (
            !toAccount ||
            amount === undefined ||
            !idempotencyKey
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "toAccount, amount and idempotencyKey are required."
            });
        }

        if (!mongoose.Types.ObjectId.isValid(toAccount)) {
            return res.status(400).json({
                success: false,
                message: "Invalid receiver account ID."
            });
        }

        const numericAmount = Number(amount);

        if (
            !Number.isFinite(numericAmount) ||
            numericAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than zero."
            });
        }

        const cleanIdempotencyKey =
            String(idempotencyKey).trim();

        if (cleanIdempotencyKey.length < 8) {
            return res.status(400).json({
                success: false,
                message:
                    "Idempotency key must be at least 8 characters long."
            });
        }

        const existingTransaction =
            await transactionModel.findOne({
                idempotencyKey:
                    cleanIdempotencyKey
            });

        if (existingTransaction) {
            return res.status(200).json({
                success: true,
                message:
                    "Transaction already processed.",
                transaction:
                    existingTransaction
            });
        }

        session.startTransaction();

        const receiverAccount =
            await accountModel.findById(
                toAccount
            ).session(session);

        if (!receiverAccount) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message:
                    "Receiver account not found."
            });
        }

        if (receiverAccount.status !== "ACTIVE") {
            await session.abortTransaction();

            return res.status(400).json({
                success: false,
                message:
                    "Receiver account must be ACTIVE."
            });
        }

        const systemAccount =
            await accountModel.findOne({
                user: req.user._id,
                status: "ACTIVE"
            }).session(session);

        if (!systemAccount) {
            await session.abortTransaction();

            return res.status(404).json({
                success: false,
                message:
                    "System account not found."
            });
        }

        const transaction =
            (
                await transactionModel.create(
                    [
                        {
                            fromAccount:
                                systemAccount._id,

                            toAccount:
                                receiverAccount._id,

                            amount:
                                numericAmount,

                            idempotencyKey:
                                cleanIdempotencyKey,

                            status: "PENDING"
                        }
                    ],
                    { session }
                )
            )[0];

        await ledgerModel.create(
            [
                {
                    account:
                        systemAccount._id,

                    amount:
                        numericAmount,

                    transaction:
                        transaction._id,

                    type: "DEBIT"
                }
            ],
            { session }
        );

        await ledgerModel.create(
            [
                {
                    account:
                        receiverAccount._id,

                    amount:
                        numericAmount,

                    transaction:
                        transaction._id,

                    type: "CREDIT"
                }
            ],
            { session }
        );

        transaction.status = "COMPLETED";

        await transaction.save({
            session
        });

        await session.commitTransaction();

        return res.status(201).json({
            success: true,
            message:
                "Initial funds transferred successfully.",
            transaction
        });

    } catch (error) {
        console.error(
            "Initial Funds Error:",
            error.message
        );

        if (session.inTransaction()) {
            await session.abortTransaction();
        }

        if (error.code === 11000) {
            const existingTransaction =
                await transactionModel.findOne({
                    idempotencyKey:
                        req.body.idempotencyKey
                });

            if (existingTransaction) {
                return res.status(200).json({
                    success: true,
                    message:
                        "Transaction already processed.",
                    transaction:
                        existingTransaction
                });
            }
        }

        return res.status(500).json({
            success: false,
            message:
                "Initial fund transfer failed."
        });

    } finally {
        await session.endSession();
    }
}

/**
 * =====================================================
 * Get Transaction History
 * GET /api/transactions
 * =====================================================
 */

async function getTransactionHistory(req, res) {
    try {
        const accounts = await accountModel.find({
            user: req.user._id
        }).select("_id");

        const accountIds = accounts.map(
            (account) => account._id
        );

        if (!accountIds.length) {
            return res.status(200).json({
                success: true,
                totalTransactions: 0,
                transactions: []
            });
        }

        const transactions =
            await transactionModel
                .find({
                    $or: [
                        {
                            fromAccount: {
                                $in: accountIds
                            }
                        },
                        {
                            toAccount: {
                                $in: accountIds
                            }
                        }
                    ]
                })
                .sort({
                    createdAt: -1
                });

        return res.status(200).json({
            success: true,
            totalTransactions:
                transactions.length,
            transactions
        });

    } catch (error) {
        console.error(
            "Get Transaction History Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch transaction history."
        });
    }
}

/**
 * =====================================================
 * Get Single Transaction
 * GET /api/transactions/:transactionId
 * =====================================================
 */

async function getTransactionById(req, res) {
    try {
        const { transactionId } = req.params;

        /**
         * Validate transaction ID.
         */
        if (!mongoose.Types.ObjectId.isValid(transactionId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction ID."
            });
        }

        /**
         * Find all accounts belonging to
         * the currently authenticated user.
         */
        const accounts = await accountModel.find({
            user: req.user._id
        }).select("_id");

        const accountIds = accounts.map(
            (account) => account._id
        );

        /**
         * Find transaction only if the logged-in
         * user owns either the sender or receiver account.
         */
        const transaction =
            await transactionModel.findOne({
                _id: transactionId,
                $or: [
                    {
                        fromAccount: {
                            $in: accountIds
                        }
                    },
                    {
                        toAccount: {
                            $in: accountIds
                        }
                    }
                ]
            });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found."
            });
        }

        return res.status(200).json({
            success: true,
            transaction
        });

    } catch (error) {
        console.error(
            "Get Transaction By ID Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch transaction."
        });
    }
}

module.exports = {
    createTransaction,
    createInitialFundsTransaction,
    getTransactionHistory,
    getTransactionById
};

