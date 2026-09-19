/**
 * Multi-Institution Multi-Tenancy Middleware
 * Extracts institution context from request headers or user session
 */
const institutionMiddleware = (req, res, next) => {
  const institutionId = req.headers['x-institution-id'] || req.query.institutionId;

  if (institutionId) {
    req.institutionId = institutionId;
  } else {
    req.institutionId = 'global';
  }

  next();
};

module.exports = institutionMiddleware;
