require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// 1. The Route that fixes "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Assignment Helper AI is live and connected to the database!');
});

// MongoDB Connection
const PORT = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('💾 MongoDB Connected Successfully!');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server live and listening on port ${PORT}`);
    });
  })
  .catch((err) => console.error('Could not connect to MongoDB:', err));
