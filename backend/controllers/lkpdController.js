const db = require('../database/db');
const { fail } = require('../utils/http');

class LkpdController {
  getLkpdList(req, res) {
    try {
      return res.status(200).json({ success: true, data: db.getLkpdList(req.user) });
    } catch (err) { return fail(res, err, 'Gagal mengambil daftar LKPD.'); }
  }

  getLkpdById(req, res) {
    try {
      return res.status(200).json({ success: true, data: db.assertLkpdAccess(req.user, req.params.id) });
    } catch (err) { return fail(res, err, 'Gagal memuat LKPD.'); }
  }

  createLkpd(req, res) {
    try {
      const created = db.createLkpd(req.user, req.body || {});
      return res.status(201).json({ success: true, message: 'LKPD berhasil disimpan sebagai draft.', data: created });
    } catch (err) { return fail(res, err, 'Gagal membuat LKPD.'); }
  }

  updateLkpd(req, res) {
    try {
      db.assertLkpdAccess(req.user, req.params.id);
      const updated = db.updateLkpd(req.params.id, req.body || {});
      return res.status(200).json({ success: true, message: 'LKPD berhasil diperbarui.', data: updated });
    } catch (err) { return fail(res, err, 'Gagal memperbarui LKPD.'); }
  }

  duplicateLkpd(req, res) {
    try {
      db.assertLkpdAccess(req.user, req.params.id);
      const copy = db.duplicateLkpd(req.params.id, req.user);
      return res.status(201).json({ success: true, message: 'LKPD berhasil diduplikasi.', data: copy });
    } catch (err) { return fail(res, err, 'Gagal menduplikasi LKPD.'); }
  }

  deleteLkpd(req, res) {
    try {
      db.assertLkpdAccess(req.user, req.params.id);
      db.deleteLkpd(req.params.id, { force: req.query.force === 'true' });
      return res.status(200).json({ success: true, message: 'LKPD berhasil dihapus.' });
    } catch (err) { return fail(res, err, 'Gagal menghapus LKPD.'); }
  }
}

module.exports = new LkpdController();
