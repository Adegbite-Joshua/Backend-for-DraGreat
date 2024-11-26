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

app.use(express.json({ limit: '100mb' })); 
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(morgan('dev'));

// Define routes
app.use('/api/admin', adminRoutes);
app.use('/api/pdf', pdfRoutes);

// Error-handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
  
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error',
      success: false,
    });
  });
  

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.timeout = 300000;

