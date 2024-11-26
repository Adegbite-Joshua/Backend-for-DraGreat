const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const { authenticateAdmin } = require('../middlewares/authMiddleware'); // Assuming you have an admin authentication middleware
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });


router.get('/', pdfController.getAllPdfs);

router.get('/search', pdfController.searchPdfs);

router.post('/upload', authenticateAdmin, upload.single('file'), pdfController.uploadPdf);

router.put('/update/:id', authenticateAdmin, pdfController.updatePdf);

router.delete('/delete/:id', authenticateAdmin, pdfController.deletePdf);

module.exports = router;
