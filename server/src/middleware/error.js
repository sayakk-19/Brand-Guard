import { ApiError } from '../utils/ApiError.js';

export function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Keep operational errors readable while avoiding stack traces and secrets in production.
export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  const status = error.statusCode || (error.name === 'ValidationError' || error.name === 'ZodError' || error.name === 'CastError' || error.type === 'entity.parse.failed' ? 400 : error.code === 11000 ? 409 : 500);
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${status}] ${req.method} ${req.originalUrl}: ${error.message}`);
  }
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Something went wrong. Please try again.'
    : error.message;
  res.status(status).json({ success: false, message, ...(error.details ? { details: error.details } : error.name === 'ZodError' ? { details: error.issues?.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) } : {}) });
}
