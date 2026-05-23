const globalErrorHandler = function (err, req, res, next) {
  res.status(err.statusCode || 500).json({
    status: err.status || "error",
    message: err.message || "Something went wrong",
  });
};

module.exports = globalErrorHandler;
