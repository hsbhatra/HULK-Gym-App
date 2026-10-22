import ApiError from "../../utils/apiError.js";

const handleMongooseErrors = (err) => {
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return ApiError.badRequest(errors[0] || "Validation failed", errors);
  }

  if (err.name === "CastError") {
    return ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    return ApiError.conflict(
      `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' is already registered.`
    );
  }

  return null;
};

const errorHandler = (err, req, res, next) => {
  // Malformed JSON / oversized body from express.json() — the client's fault
  if (err.type === "entity.parse.failed" || err.type === "entity.too.large") {
    const tooLarge = err.type === "entity.too.large";
    return res.status(tooLarge ? 413 : 400).json({
      success: false,
      statusCode: tooLarge ? 413 : 400,
      message: tooLarge ? "Request is too large." : "Invalid request body.",
      errors: [],
    });
  }

  const mongooseError = handleMongooseErrors(err);
  if (mongooseError) {
    return res.status(mongooseError.statusCode).json({
      success: false,
      statusCode: mongooseError.statusCode,
      message: mongooseError.message,
      errors: mongooseError.errors,
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: "Invalid or expired token. Please log in again.",
      errors: [],
    });
  }

  console.error("UNHANDLED ERROR:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    statusCode: 500,
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong. Please try again later.",
    errors: [],
  });
};

export default errorHandler;
