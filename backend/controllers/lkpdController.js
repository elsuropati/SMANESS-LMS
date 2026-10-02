const db = require('../database/db');

class LkpdController {
  getLkpdList(req, res) {
    try {
      const list = db.getLkpdList(req.user.id);
      return res.status(200).json({ success: true, data: list });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal mengambil daftar LKPD.' });
    }
  }

  getLkpdById(req, res) {
    try {
      const { id } = req.params;
      const lkpd = db.getLkpdById(id);
      if (!lkpd) {
        return res.status(404).json({ success: false, message: 'LKPD tidak ditemukan.' });
      }
      return res.status(200).json({ success: true, data: lkpd });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memuat LKPD.' });
    }
  }

  createLkpd(req, res) {
    try {
      const lkpdData = {
        teacher_id: req.user.id,
        ...req.body
      };
      const created = db.createLkpd(lkpdData);
      return res.status(201).json({ success: true, message: 'LKPD berhasil disimpan sebagai draft.', data: created });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal membuat LKPD.' });
    }
  }

  updateLkpd(req, res) {
    try {
      const { id } = req.params;
      const updated = db.updateLkpd(id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'LKPD tidak ditemukan.' });
      }
      return res.status(200).json({ success: true, message: 'LKPD berhasil diperbarui.', data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal memperbarui LKPD.' });
    }
  }

  duplicateLkpd(req, res) {
    try {
      const { id } = req.params;
      const duplicated = db.duplicateLkpd(id);
      if (!duplicated) {
        return res.status(404).json({ success: false, message: 'LKPD tidak ditemukan.' });
      }
      return res.status(201).json({ success: true, message: 'LKPD berhasil diduplikasi.', data: duplicated });
    } catch (err) {
      return res.status(500).json({ success: false, message: 'Gagal menduplikasi LKPD.' });
    }
  }
}

module.exports = new LkpdController();
