/**
 * Standardized API Response Helper
 */
const sendSuccess = (res, statusCode, message, data = null) => {
  const responsePayload = {
    success: true,
    message
  };

  if (data !== null) {
    responsePayload.data = data;
  }

  return res.status(statusCode).json(responsePayload);
};

const sendError = (res, statusCode, message, errorDetails = null) => {
  const responsePayload = {
    success: false,
    message
  };

  if (errorDetails && process.env.NODE_ENV === 'development') {
    responsePayload.error = errorDetails;
  }

  return res.status(statusCode).json(responsePayload);
};

module.exports = { sendSuccess, sendError };
