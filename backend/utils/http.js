class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

const bad = (msg) => new HttpError(400, msg);
const forbidden = (msg = 'Anda tidak memiliki akses ke data ini.') => new HttpError(403, msg);
const notFound = (msg = 'Data tidak ditemukan.') => new HttpError(404, msg);
const conflict = (msg) => new HttpError(409, msg);

// Kirim error ke klien: pesan HttpError ditampilkan apa adanya, error lain disamarkan menjadi 500.
function fail(res, err, fallbackMessage = 'Terjadi kesalahan pada server.') {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  console.error('[API ERROR]', err);
  return res.status(500).json({ success: false, message: fallbackMessage });
}

module.exports = { HttpError, bad, forbidden, notFound, conflict, fail };
