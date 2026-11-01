const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN
    }
});

transporter.verify((error) => {
    if (error) {
        console.error("Email configuration error:", error.message);
    } else {
        console.log("Email server is ready to send messages");
    }
});

async function sendRegistrationEmail(email, name) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Welcome to Ledger Service",
            text:
                "Welcome " +
                name +
                "! Your Ledger Service account has been created successfully."
        });

        console.log("Registration email sent to " + email);
    } catch (error) {
        console.error(
            "Registration email error:",
            error.message
        );

        throw error;
    }
}

async function sendTransactionEmail(
    email,
    name,
    amount,
    receiverAccount
) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Transaction Successful",
            text:
                "Hello " +
                name +
                ",\n\n" +
                "Your transaction has been completed successfully.\n\n" +
                "Amount: ₹" +
                amount +
                "\n" +
                "Receiver Account: " +
                receiverAccount +
                "\n" +
                "Status: COMPLETED\n\n" +
                "Regards,\n" +
                "Ledger Service"
        });

        console.log("Transaction email sent to " + email);
    } catch (error) {
        console.error(
            "Transaction email error:",
            error.message
        );

        throw error;
    }
}

module.exports = {
    sendRegistrationEmail,
    sendTransactionEmail
};