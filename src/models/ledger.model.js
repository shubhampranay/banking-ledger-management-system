const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema(
    {
        account: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "account",
            required: [true, "Ledger entry must belong to an account"],
            index: true,
            immutable: true
        },

        amount: {
            type: Number,
            required: [true, "Amount is required"],
            min: [0.01, "Amount must be greater than zero"],
            immutable: true
        },

        transaction: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "transaction",
            required: [true, "Transaction reference is required"],
            index: true,
            immutable: true
        },

        type: {
            type: String,
            enum: {
                values: ["CREDIT", "DEBIT"],
                message: "Type must be CREDIT or DEBIT"
            },
            required: [true, "Ledger type is required"],
            immutable: true
        }
    },
    {
        timestamps: true
    }
);

/**
 * ===============================
 * Ledger Immutability
 * ===============================
 *
 * Ledger entries represent financial history.
 * They must never be updated or deleted.
 */

function preventLedgerModification() {
    throw new Error(
        "Ledger entries are immutable and cannot be modified or deleted."
    );
}

ledgerSchema.pre(
    "findOneAndUpdate",
    preventLedgerModification
);

ledgerSchema.pre(
    "updateOne",
    preventLedgerModification
);

ledgerSchema.pre(
    "updateMany",
    preventLedgerModification
);

ledgerSchema.pre(
    "replaceOne",
    preventLedgerModification
);

ledgerSchema.pre(
    "findOneAndReplace",
    preventLedgerModification
);

ledgerSchema.pre(
    "deleteOne",
    preventLedgerModification
);

ledgerSchema.pre(
    "deleteMany",
    preventLedgerModification
);

ledgerSchema.pre(
    "findOneAndDelete",
    preventLedgerModification
);

ledgerSchema.pre(
    "findOneAndRemove",
    preventLedgerModification
);

/**
 * ===============================
 * Indexes
 * ===============================
 *
 * Useful for fetching account history.
 */

ledgerSchema.index({
    account: 1,
    createdAt: -1
});

ledgerSchema.index({
    account: 1,
    type: 1,
    createdAt: -1
});

/**
 * ===============================
 * Model
 * ===============================
 */

const ledgerModel = mongoose.model(
    "ledger",
    ledgerSchema
);

module.exports = ledgerModel;