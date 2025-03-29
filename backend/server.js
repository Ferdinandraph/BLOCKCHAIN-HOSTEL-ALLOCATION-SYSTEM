require('dotenv').config();
console.log('Environment variables:', {
  MONGO_URI: process.env.MONGO_URI,
  PORT: process.env.PORT,
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
  SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL,
  ADMIN_PRIVATE_KEY: process.env.ADMIN_PRIVATE_KEY ? '[REDACTED]' : undefined,
});

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api', apiRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));