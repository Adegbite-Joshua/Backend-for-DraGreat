const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.authenticateAdmin = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', ''); // Expecting a Bearer token
  console.log(token);

  next();
  
  // if (!token) {
  //   return res.status(401).json({ msg: 'Access denied, no token provided' });
  // }

  // try {
  //   const decoded = jwt.verify(token, process.env.JWT_SECRET);
  //   const admin = await Admin.findById(decoded.admin.id);
    
  //   if (!admin) {
  //     return res.status(404).json({ msg: 'Admin not found' });
  //   }
  //   req.admin = admin;
  //   next();
  // } catch (error) {
  //   console.log(error);
    
  //   res.status(400).json({ msg: 'Invalid token' });
  // }
};
