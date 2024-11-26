const Pdf = require('../models/Pdf');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 300000,
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



exports.uploadPdf = async (req, res) => {
  const { title, pages } = req.body;

  if (!req.file) {
    return res.status(400).json({ msg: 'No file uploaded' });
  }

  try {
    // Upload the file buffer to Cloudinary
    const result = await cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw', // 'raw' for PDF files
        folder: 'documents',
        chunk_size: 6000000, // 6MB chunk size
      },
      (error, result) => {
        if (error) throw error;

        // Save to database
        const pdf = new Pdf({
          title,
          pages,
          url: result.secure_url,
          cloudinaryId: result.public_id,
          uploadedBy: req.admin.id,
        });

        pdf.save();
        res.json(pdf);
      }
    );

    // Pipe the file buffer to the Cloudinary uploader
    const stream = require('stream');
    const uploadStream = new stream.PassThrough();
    uploadStream.end(req.file.buffer);
    uploadStream.pipe(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({ msg: 'Error uploading file' });
  }
};



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
