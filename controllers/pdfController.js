const Pdf = require('../models/Pdf');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const multer = require('multer');
const streamifier = require('streamifier');
const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');



// Configure Multer
const storage = multer.memoryStorage(); // Store file in memory for direct upload to Cloudinary
const upload = multer({ storage });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});



exports.getAllPdfs = async (req, res) => {
  try {
    const pdfs = await Pdf.find().sort({ dateOfUpload: -1 });
    res.json(pdfs);
  } catch (err) {
    res.status(500).json({ msg: 'Error fetching PDFs' });
  }
};


exports.searchPdfs = async (req, res) => {
  const { keyword } = req.query;

  try {
    const pdfs = await Pdf.find({
      title: { $regex: keyword, $options: 'i' },
    }).sort({ dateOfUpload: -1 });

    res.json(pdfs);
  } catch (err) {
    res.status(500).json({ msg: 'Error searching PDFs' });
  }
};


// exports.uploadPdf = [
//   upload.single('file'), // Use multer middleware to handle file upload
//   async (req, res) => {
//       const { title, pages } = req.body;

//       if (!req.file) {
//           return res.status(400).json({ msg: 'No file provided' });
//       }

//       try {
//           const uploadStream = cloudinary.uploader.upload_stream(
//               {
//                   resource_type: 'auto',
//                   folder: 'documents',
//               },
//               async (error, result) => {
//                   if (error) {
//                       console.error('Cloudinary Upload Error:', error);
//                       return res.status(500).json({ msg: 'Error uploading file' });
//                   }

//                   // Save the result to the database
//                   const pdf = new Pdf({
//                       title,
//                       pages: pages ? parseInt(pages, 10) : null,
//                       url: result.secure_url,
//                       cloudinaryId: result.public_id,
//                       uploadedBy: req.admin.id,
//                   });

//                   await pdf.save();
//                   res.json(pdf);
//               }
//           );

//           streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
//       } catch (err) {
//           console.error('Upload Error:', err);
//           res.status(500).json({ msg: 'Error uploading file' });
//       }
//   },
// ];

async function validatePDF(fileBuffer) {
  try {
    await pdfParse(fileBuffer);
    return true; // PDF is valid
  } catch (error) {
    console.error('Invalid PDF:', error.message);
    return false; // PDF is invalid
  }
}

exports.uploadPdf = [
  upload.single('file'), 
  async (req, res) => {
    const { title, pages } = req.body;

    if (!req.file) {
      return res.status(400).json({ msg: 'No file provided' });
    }

    try {
      const isValid = await validatePDF(req.file.buffer);
      if (!isValid) {
        return res.status(400).json({ msg: 'Uploaded file is not a valid PDF' });
      }

      const pdfDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();
      const MAX_FILE_SIZE = 9.5 * 1024 * 1024;
      const urls = [];
      let segmentStart = 0;

      while (segmentStart < totalPages) {
        const pdfSegment = await PDFDocument.create();
        let segmentEnd = segmentStart;
        let currentSize = 0;

        while (segmentEnd < totalPages) {
          const [copiedPage] = await pdfSegment.copyPages(pdfDoc, [segmentEnd]);
          pdfSegment.addPage(copiedPage);

          const pdfBytes = await pdfSegment.save();
          currentSize = pdfBytes.length;

          if (currentSize > MAX_FILE_SIZE) break;

          segmentEnd++;
        }

        const pdfBytes = await pdfSegment.save();
        const url = await uploadToCloudinary(pdfBytes);
        urls.push(url);

        segmentStart = segmentEnd;
      }

      const pdf = new Pdf({
        title,
        pages: pages ? parseInt(pages, 10) : null,
        urls,
        uploadedBy: req.admin.id,
      });

      await pdf.save();
      res.json(pdf);
    } catch (err) {
      console.error('Upload Error:', err);
      res.status(500).json({ msg: 'Error uploading file' });
    }
  },
];




exports.updatePdf = async (req, res) => {
  const { id } = req.params;
  const { title, pages } = req.body;

  try {
    const pdf = await Pdf.findByIdAndUpdate(
      id,
      { title, pages },
      { new: true }
    );
    if (!pdf) return res.status(404).json({ msg: 'PDF not found' });
    res.json(pdf);
  } catch (err) {
    res.status(500).json({ msg: 'Error updating PDF' });
  }
};


const extractPublicId = (url) => {
  const parts = url.split('/');
  const fileWithExtension = parts.slice(-1)[0];
  return fileWithExtension.split('.').slice(0, -1).join('.'); // Remove file extension
};

exports.deletePdf = async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) return res.status(404).json({ msg: 'PDF not found' });

    for (const url of pdf.urls) {
      const publicId = extractPublicId(url);
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
    }

    await Pdf.findByIdAndDelete(req.params.id);

    res.json({ msg: 'PDF and all segments deleted' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Error deleting PDF' });
  }
};

