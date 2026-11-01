const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
    {
        fromAccount: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "account",
            required: [
                true,
                "Transaction must be associated with a sender account"
            ],
            index: true
        },

        toAccount: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "account",
            required: [
                true,
                "Transaction must be associated with a receiver account"
            ],
            index: true
        },

        status: {
            type: String,
            enum: {
                values: [
                    "PENDING",
                    "COMPLETED",
                    "FAILED",
                    "REVERSED"
                ],
                message:
                    "Status must be PENDING, COMPLETED, FAILED or REVERSED"
            },
            default: "PENDING",
            index: true
        },

        amount: {
            type: Number,
            required: [true, "Amount is required"],
            min: [
                0.01,
                "Transaction amount must be greater than zero"
            ]
        },

        idempotencyKey: {
            type: String,
            required: [
                true,
                "Idempotency Key is required"
            ],
            unique: true,
            index: true,
            trim: true,
            minlength: [
                8,
                "Idempotency key must be at least 8 characters long"
            ],
            maxlength: [
                200,
                "Idempotency key cannot exceed 200 characters"
            ]
        }
    },
    {
        timestamps: true
    }
);

/**
 * ===============================
 * Transaction Indexes
 * ===============================
 *
 * Useful for transaction history
 * and account-based queries.
 */

transactionSchema.index({
    fromAccount: 1,
    createdAt: -1
});

transactionSchema.index({
    toAccount: 1,
    createdAt: -1
});

transactionSchema.index({
    status: 1,
    createdAt: -1
});

/**
 * ===============================
 * Model
 * ===============================
 */

const transactionModel = mongoose.model(
    "transaction",
    transactionSchema
);

module.exports = transactionModel;