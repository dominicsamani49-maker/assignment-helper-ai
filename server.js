require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

app.use(cors());
app.use(express.json());

// This route fixes "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Assignment Helper AI is live!');
});

const PORT = process.env.PORT || 10000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('💾 MongoDB Connected Successfully!');
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server live and listening on port ${PORT}`);
    });
  })
  .catch((err) => console.error(err));
