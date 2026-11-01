const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, "Email is required for creating a user"],
            trim: true,
            lowercase: true,
            unique: true,
            match: [
                /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                "Please enter a valid email address"
            ]
        },

        name: {
            type: String,
            required: [true, "Name is required for creating an account"],
            trim: true
        },

        password: {
            type: String,
            required: [true, "Password is required for creating an account"],
            minlength: [8, "Password must be at least 8 characters long"],
            select: false
        },

        systemUser: {
            type: Boolean,
            default: false,
            immutable: true,
            select: false
        }
    },
    {
        timestamps: true
    }
);

/**
 * =========================================
 * Hash password before saving user
 * =========================================
 */

userSchema.pre("save", async function () {

    if (!this.isModified("password")) {
        return;
    }

    this.password = await bcrypt.hash(this.password, 10);
});

/**
 * =========================================
 * Compare password during login
 * =========================================
 */

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

const userModel = mongoose.model("user", userSchema);

module.exports = userModel;