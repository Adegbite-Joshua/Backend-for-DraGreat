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
}, { timestamps: true });

module.exports = mongoose.model('Pdf', PdfSchema);