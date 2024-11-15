const express = require('express');
const connectDB = require('./config/db');
const adminRoutes = require('./routes/adminRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();

const app = express();
connectDB();

// Enable CORS for all routes
app.use(cors({
    origin: '*',
}));

app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Define routes
app.use('/api/admin', adminRoutes);
app.use('/api/pdf', pdfRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
