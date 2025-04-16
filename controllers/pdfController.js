// const Pdf = require('../models/Pdf');
// const cloudinary = require('cloudinary').v2;
// require('dotenv').config();
// const multer = require('multer');
// const streamifier = require('streamifier');
// const { PDFDocument } = require('pdf-lib');


// // Configure Multer
// const storage = multer.memoryStorage(); // Store file in memory for direct upload to Cloudinary
// const upload = multer({ storage });

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });



// exports.getAllPdfs = async (req, res) => {
//   try {
//     const pdfs = await Pdf.find().sort({ dateOfUpload: -1 });
//     res.json(pdfs);
//   } catch (err) {
//     res.status(500).json({ msg: 'Error fetching PDFs' });
//   }
// };


// exports.searchPdfs = async (req, res) => {
//   const { keyword } = req.query;

//   try {
//     const pdfs = await Pdf.find({
//       title: { $regex: keyword, $options: 'i' },
//     }).sort({ dateOfUpload: -1 });

//     res.json(pdfs);
//   } catch (err) {
//     res.status(500).json({ msg: 'Error searching PDFs' });
//   }
// };


// exports.uploadPdf = [
//   upload.single('file'), // Use multer middleware to handle file upload
//   async (req, res) => {
//     const { title, pages } = req.body;

//     if (!req.file) {
//       return res.status(400).json({ msg: 'No file provided' });
//     }

//     try {
//       const pdfDoc = await PDFDocument.load(req.file.buffer);
//       const totalPages = pdfDoc.getPageCount();

//       const MAX_FILE_SIZE = 9.5 * 1024 * 1024; // 9.5 MB
//       const urls = [];
//       let segmentStart = 0;

//       while (segmentStart < totalPages) {
//         const pdfSegment = await PDFDocument.create();
//         let segmentEnd = segmentStart;
//         let currentSize = 0;

//         while (segmentEnd < totalPages) {
//           const [copiedPage] = await pdfSegment.copyPages(pdfDoc, [segmentEnd]);
//           pdfSegment.addPage(copiedPage);

//           const pdfBytes = await pdfSegment.save();
//           currentSize = pdfBytes.length;

//           if (currentSize > MAX_FILE_SIZE) {
//             break;
//           }

//           segmentEnd++;
//         }

//         const pdfBytes = await pdfSegment.save();
//         await new Promise((resolve, reject) => {
//           const uploadStream = cloudinary.uploader.upload_stream(
//             {
//               resource_type: 'auto',
//               folder: 'documents',
//             },
//             (error, result) => {
//               if (error) {
//                 console.error('Cloudinary Upload Error:', error);
//                 reject(error);
//               } else {
//                 urls.push(result.secure_url);
//                 resolve();
//               }
//             }
//           );

//           // Pipe the segment data to Cloudinary
//           streamifier.createReadStream(pdfBytes).pipe(uploadStream);
//         });

//         segmentStart = segmentEnd; // Move to the next set of pages
//       }

//       const pdf = new Pdf({
//         title,
//         pages: pages ? parseInt(pages, 10) : null,
//         urls,
//       });

//       await pdf.save();
//       res.json(pdf);
//     } catch (err) {
//       console.error('Upload Error:', err);
//       res.status(500).json({ msg: 'Error uploading file' });
//     }
//   },
// ];

const Pdf = require('../models/Pdf');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const multer = require('multer');
const streamifier = require('streamifier');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configure Multer
const storage = multer.memoryStorage();
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

// Helper function to upload a segment with retry logic
const uploadSegmentToCloudinary = async (segmentBytes, retries = 3) => {
  try {
    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto', folder: 'documents' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );
      streamifier.createReadStream(segmentBytes).pipe(uploadStream);
    });
  } catch (error) {
    if (retries > 0) {
      console.log(`Upload failed, retrying... (${retries} attempts left)`);
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      return uploadSegmentToCloudinary(segmentBytes, retries - 1);
    }
    throw error;
  }
};

// Optional: Compress PDF if needed (requires additional libraries)
const compressPdf = async (pdfBytes, quality = 'medium') => {
  // This is a placeholder. You would need to implement actual compression
  // using a library like pdf-lib, ghostscript via child_process, or a third-party service
  
  // For now, we'll just return the original bytes
  console.log(`Would compress PDF with ${quality} quality`);
  return pdfBytes;
};

exports.uploadPdf = [
  upload.single('file'),
  async (req, res) => {
    const { title, pages } = req.body;

    if (!req.file) {
      return res.status(400).json({ msg: 'No file provided' });
    }

    // Create a temporary file to avoid memory issues with large PDFs
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `upload_${Date.now()}.pdf`);
    
    try {
      // Write the buffer to a temporary file
      fs.writeFileSync(tempFilePath, req.file.buffer);
      
      // Load the PDF document
      const pdfDoc = await PDFDocument.load(fs.readFileSync(tempFilePath));
      const totalPages = pdfDoc.getPageCount();
      
      // Calculate the maximum size for each segment (9.5MB)
      const MAX_FILE_SIZE = 9.5 * 1024 * 1024;
      
      // Estimate the average page size
      const initialPdfBytes = await pdfDoc.save();
      const avgPageSize = initialPdfBytes.length / totalPages;
      
      // Calculate how many pages we can fit in each segment (with 10% safety margin)
      const pagesPerSegment = Math.max(1, Math.floor((MAX_FILE_SIZE * 0.9) / avgPageSize));
      
      console.log(`Total pages: ${totalPages}, Avg page size: ${avgPageSize} bytes`);
      console.log(`Estimated pages per segment: ${pagesPerSegment}`);
      
      // Split the PDF into segments
      const segments = [];
      for (let i = 0; i < totalPages; i += pagesPerSegment) {
        const segmentDoc = await PDFDocument.create();
        const endPage = Math.min(i + pagesPerSegment, totalPages);
        
        // Copy pages to this segment
        for (let j = i; j < endPage; j++) {
          const [copiedPage] = await segmentDoc.copyPages(pdfDoc, [j]);
          segmentDoc.addPage(copiedPage);
        }
        
        // Save the segment
        const segmentBytes = await segmentDoc.save();
        
        // Optional: Compress the segment
        // const compressedBytes = await compressPdf(segmentBytes);
        // segments.push(compressedBytes);
        
        segments.push(segmentBytes);
        
        console.log(`Created segment ${segments.length} with pages ${i+1}-${endPage} (${segmentBytes.length} bytes)`);
      }
      
      // Upload all segments in parallel
      console.log(`Uploading ${segments.length} segments to Cloudinary...`);
      const uploadPromises = segments.map(segment => uploadSegmentToCloudinary(segment));
      const urls = await Promise.all(uploadPromises);
      
      // Create and save the PDF record
      const pdf = new Pdf({
        title,
        pages: pages ? parseInt(pages, 10) : totalPages,
        urls,
      });
      
      await pdf.save();
      
      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);
      
      res.json({
        ...pdf.toObject(),
        message: `Successfully uploaded PDF with ${segments.length} segments`
      });
      
    } catch (err) {
      console.error('Upload Error:', err);
      
      // Clean up the temporary file if it exists
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      
      res.status(500).json({ 
        msg: 'Error uploading file',
        error: err.message
      });
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

