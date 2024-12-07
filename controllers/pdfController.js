const Pdf = require('../models/Pdf');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const multer = require('multer');
const streamifier = require('streamifier');

// Configure Multer for memory storage
const storage = multer.memoryStorage(); // Store file in memory for direct upload to Cloudinary
const upload = multer({ storage });

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Fetch all PDFs sorted by upload date
exports.getAllPdfs = async (req, res) => {
  try {
    const pdfs = await Pdf.find().sort({ dateOfUpload: -1 }); // Latest first
    res.status(200).json(pdfs);
  } catch (err) {
    console.error('Error fetching PDFs:', err);
    res.status(500).json({ msg: 'Error fetching PDFs' });
  }
};

// Search PDFs by keyword in title
exports.searchPdfs = async (req, res) => {
  const { keyword } = req.query;

  try {
    const pdfs = await Pdf.find({
      title: { $regex: keyword, $options: 'i' }, // Case-insensitive regex
    }).sort({ dateOfUpload: -1 });

    res.status(200).json(pdfs);
  } catch (err) {
    console.error('Error searching PDFs:', err);
    res.status(500).json({ msg: 'Error searching PDFs' });
  }
};

// Upload a new PDF
exports.uploadPdf = [
  upload.single('file'), // Middleware to handle file upload
  async (req, res) => {
    const { title, pages } = req.body;

    if (!req.file) {
      return res.status(400).json({ msg: 'No file provided' });
    }

    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto', // Automatically detect resource type
          folder: 'documents', // Cloudinary folder
        },
        async (error, result) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            return res.status(500).json({ msg: 'Error uploading file' });
          }

          // Save file metadata in the database
          const pdf = new Pdf({
            title,
            pages: pages ? parseInt(pages, 10) : null,
            url: result.secure_url,
            cloudinaryId: result.public_id,
            uploadedBy: req.admin?.id || 'unknown', // Fallback if admin ID is missing
          });

          await pdf.save();
          res.status(201).json(pdf);
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    } catch (err) {
      console.error('Upload Error:', err);
      res.status(500).json({ msg: 'Error uploading file' });
    }
  },
];

// Update an existing PDF's metadata
exports.updatePdf = async (req, res) => {
  const { id } = req.params;
  const { title, pages } = req.body;

  try {
    const pdf = await Pdf.findByIdAndUpdate(
      id,
      { title, pages },
      { new: true } // Return updated document
    );
    if (!pdf) {
      return res.status(404).json({ msg: 'PDF not found' });
    }
    res.status(200).json(pdf);
  } catch (err) {
    console.error('Error updating PDF:', err);
    res.status(500).json({ msg: 'Error updating PDF' });
  }
};

// Delete a PDF
exports.deletePdf = async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) {
      return res.status(404).json({ msg: 'PDF not found' });
    }

    // Delete the file from Cloudinary
    await cloudinary.uploader.destroy(pdf.cloudinaryId, { resource_type: 'raw' });

    // Remove from the database
    await Pdf.findByIdAndDelete(req.params.id);

    res.status(200).json({ msg: 'PDF deleted successfully' });
  } catch (err) {
    console.error('Error deleting PDF:', err);
    res.status(500).json({ msg: 'Error deleting PDF' });
  }
};
