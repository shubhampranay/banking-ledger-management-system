function errorMiddleware(err, req, res, next) {
    console.error("ERROR:", err);

    if (err.name === "ValidationError") {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    if (err.code === 11000) {
        return res.status(409).json({
            success: false,
            message: "Duplicate data found."
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error"
    });
}

module.exports = errorMiddleware;