const express = require("express");
const router = express.Router();
const { upload, uploadMedia } = require("../controllers/uploadController");
const { middleware: authMiddleware } = require("../middlewares/authMiddleware");

// POST /api/media/upload - Upload file (ảnh/video)
router.post('/upload', authMiddleware, upload.single("file"), uploadMedia);

module.exports = router;
