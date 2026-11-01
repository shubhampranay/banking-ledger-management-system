const mongoose = require("mongoose");
const ledgerModel = require("./ledger.model");

const accountSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            required: [true, "Account must be associated with a user"],
            index: true
        },

        status: {
            type: String,
            enum: {
                values: ["ACTIVE", "FROZEN", "CLOSED"],
                message: "Status must be ACTIVE, FROZEN, or CLOSED"
            },
            default: "ACTIVE",
            index: true
        },

        currency: {
            type: String,
            required: [true, "Currency is required"],
            default: "INR",
            uppercase: true,
            trim: true,
            minlength: [3, "Currency must be a 3-letter code"],
            maxlength: [3, "Currency must be a 3-letter code"],
            match: [
                /^[A-Z]{3}$/,
                "Currency must be a valid 3-letter currency code"
            ]
        }
    },
    {
        timestamps: true
    }
);

/**
 * ===============================
 * Compound Index
 * ===============================
 */

accountSchema.index({
    user: 1,
    status: 1
});

/**
 * ===============================
 * Get Current Account Balance
 * ===============================
 *
 * Balance = Total Credit - Total Debit
 */

accountSchema.methods.getBalance = async function () {
    const balanceData = await ledgerModel.aggregate([
        {
            $match: {
                account: this._id
            }
        },

        {
            $group: {
                _id: null,

                totalDebit: {
                    $sum: {
                        $cond: [
                            {
                                $eq: ["$type", "DEBIT"]
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
                                $eq: ["$type", "CREDIT"]
                            },
                            "$amount",
                            0
                        ]
                    }
                }
            }
        },

        {
            $project: {
                _id: 0,

                balance: {
                    $subtract: [
                        "$totalCredit",
                        "$totalDebit"
                    ]
                }
            }
        }
    ]);

    if (!balanceData.length) {
        return 0;
    }

    return balanceData[0].balance || 0;
};

/**
 * ===============================
 * Model
 * ===============================
 */

const accountModel = mongoose.model(
    "account",
    accountSchema
);

module.exports = accountModel;