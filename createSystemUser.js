require("dotenv").config();

const mongoose = require("mongoose");
const userModel = require("./src/models/user.model");

async function createSystemUser() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("Connected to MongoDB");

        const existingUser = await userModel
            .findOne({ email: "system@ledger.local" })
            .select("+systemUser");

        if (existingUser) {
            console.log("System user already exists.");
            console.log("User ID:", existingUser._id);
            console.log("systemUser:", existingUser.systemUser);

            await mongoose.disconnect();
            return;
        }

        const systemUser = await userModel.create({
            email: "system@ledger.local",
            name: "Ledger System",
            password: "SystemPassword123!",
            systemUser: true
        });

        console.log("System user created successfully.");
        console.log("User ID:", systemUser._id);
        console.log("Email:", systemUser.email);
        console.log("systemUser:", systemUser.systemUser);

        await mongoose.disconnect();

    } catch (error) {
        console.error(
            "Error creating system user:",
            error.message
        );

        await mongoose.disconnect();
        process.exit(1);
    }
}

createSystemUser();