const mongoose = require('mongoose');

const PdfSchema = new mongoose.Schema({
  title: { type: String, required: true },
  dateUploaded: { type: Date, default: Date.now },
  pages: { type: Number }, // optional field
  url: { type: String },
  urls: [
    { type: String }
  ],
  cloudinaryId: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Pdf', PdfSchema);