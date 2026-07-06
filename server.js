const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const Groq = require('groq-sdk');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(cors());
app.use(express.json());

// Serves your frontend folder
app.use(express.static(path.join(__dirname, 'frontend')));

app.post('/chat', upload.single('file'), async (req, res) => {
    try {
        const { question } = req.body;
        let systemMessage = "You are a helpful AI assistant.";
        
        if (req.file) {
            const data = await pdfParse(req.file.buffer);
            systemMessage += `\n\nCONTEXT FROM PDF: ${data.text}`;
        }

        const response = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemMessage },
                { role: "user", content: question }
            ],
            model: "llama-3.3-70b-versatile",
        });

        res.json({ answer: response.choices[0].message.content });
    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: "Server error" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
