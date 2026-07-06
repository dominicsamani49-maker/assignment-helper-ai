require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Root route to handle "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Assignment Helper AI is live and connected!');
});

// MongoDB Connection
const PORT = process.env.PORT || 10000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('💾 MongoDB Connected Successfully!');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server live and listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });
