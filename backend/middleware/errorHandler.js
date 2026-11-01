function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error('[SERVER ERROR]:', err);
  let message = err.message || 'Terjadi kesalahan internal pada server.';
  if (err.type === 'entity.parse.failed') message = 'Format data yang dikirim tidak valid.';
  if (err.type === 'entity.too.large') message = 'Data yang dikirim terlalu besar.';
  if (status >= 500 && process.env.NODE_ENV === 'production') message = 'Terjadi kesalahan internal pada server.';
  res.status(status).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;
