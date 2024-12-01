const Pdf = require('../models/Pdf');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const multer = require('multer');
const streamifier = require('streamifier');

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



// exports.uploadPdf = async (req, res) => {
//   const { title, pages, file } = req.body;

//   try {
//     const result = await cloudinary.uploader.upload(file, {
//       resource_type: 'auto',
//       folder: 'documents'
//     });
    
//    const pdf = new Pdf({
//       title,
//       pages,
//       url: result.secure_url,
//       cloudinaryId: result.public_id,
//       uploadedBy: req.admin.id,
//     });
//     await pdf.save();
//     res.json(pdf);
//   } catch (err) { 
//     console.log(err);
//     res.status(500).json({ msg: 'Error uploading file' });
//   }
// };

exports.uploadPdf = [
  upload.single('file'), // Use multer middleware to handle file upload
  async (req, res) => {
      const { title, pages } = req.body;

      if (!req.file) {
          return res.status(400).json({ msg: 'No file provided' });
      }

      try {
          const uploadStream = cloudinary.uploader.upload_stream(
              {
                  resource_type: 'auto',
                  folder: 'documents',
              },
              async (error, result) => {
                  if (error) {
                      console.error('Cloudinary Upload Error:', error);
                      return res.status(500).json({ msg: 'Error uploading file' });
                  }

                  // Save the result to the database
                  const pdf = new Pdf({
                      title,
                      pages: pages ? parseInt(pages, 10) : null,
                      url: result.secure_url,
                      cloudinaryId: result.public_id,
                      uploadedBy: req.admin.id,
                  });

                  await pdf.save();
                  res.json(pdf);
              }
          );

          streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
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
  


exports.deletePdf = async (req, res) => {
  try {
    const pdf = await Pdf.findById(req.params.id);
    if (!pdf) return res.status(404).json({ msg: 'PDF not found' });

    await cloudinary.uploader.destroy(pdf.cloudinaryId, { resource_type: 'raw' });
    await Pdf.findByIdAndDelete(req.params.id);

    res.json({ msg: 'PDF deleted' });
  } catch (err) {
    console.log(err)
    res.status(500).json({ msg: 'Error deleting PDF' });
  }
};
