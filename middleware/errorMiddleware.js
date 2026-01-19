const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    // Log error stack to console for debugging in non-production
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    } else {
        console.error(err.message); 
    }

    res.status(statusCode).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = { errorHandler };
