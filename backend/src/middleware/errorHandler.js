/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  const reqPath = `[${req.method} ${req.path}]`;
  
  console.error(`${reqPath} [ERROR] ${err.name}: ${err.message}`);
  
  // Log multer-specific errors
  if (err.name === 'MulterError') {
    console.error(`${reqPath} [MULTER-ERROR] Code: ${err.code}`);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: 'File size exceeds maximum limit (500MB)',
        code: 'LIMIT_FILE_SIZE'
      });
    }
    if (err.code === 'LIMIT_FIELD_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many fields',
        code: 'LIMIT_FIELD_COUNT'
      });
    }
  }
  
  // Log the full error in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`${reqPath} [STACK]`, err.stack);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;
