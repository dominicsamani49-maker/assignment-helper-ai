require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mongoose = require("mongoose");
const Chat = require("./models/Chat");

const app = express();

app.use(cors());
app.use(express.json());

// Connect to MongoDB Database securely
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("💾 MongoDB Connected Successfully!"))
    .catch(err => console.error("Database connection error:", err));

const upload = multer({ storage: multer.memoryStorage() });

function chunkText(text, maxLength = 1000) {
    const paragraphs = text.split(/\n\s*\n/);
    let chunks = [];
    let currentChunk = "";

    paragraphs.forEach(para => {
        if ((currentChunk + para).length > maxLength) {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = para;
        } else {
            currentChunk += "\n\n" + para;
        }
    });
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
}

function getRelevantContextObjects(question, chunks, maxChunks = 3) {
    if (!chunks || chunks.length === 0) return [];

    const keywords = question.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);

    if (keywords.length === 0) {
        return chunks.slice(0, maxChunks).map(c => ({ text: c }));
    }

    const scoredChunks = chunks.map(chunk => {
        let score = 0;
        const lowerChunk = chunk.toLowerCase();
        keywords.forEach(word => {
            if (lowerChunk.includes(word)) score += 1;
        });
        return { text: chunk, score };
    });

    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, maxChunks).filter(item => item.score > 0 || chunks.length <= maxChunks);
}

// Fetch all saved database sessions on start
app.get("/get-all-chats", async (req, res) => {
    try {
        const chats = await Chat.find().sort({ updatedAt: -1 });
        let records = {};
        chats.forEach(c => {
            records[c.chatId] = {
                fileName: c.fileName,
                messages: c.messages
            };
        });
        res.json(records);
    } catch (err) {
        res.status(500).json({ error: "Failed to load history." });
    }
});

app.post("/upload-pdf", upload.single("pdf"), async (req, res) => {
    try {
        const { chatId } = req.body;
        if (!req.file) return res.status(400).json({ error: "No file uploaded." });

        const data = await pdfParse(req.file.buffer);
        const rawText = data.text;
        const chunks = chunkText(rawText);

        const updatedChat = await Chat.findOneAndUpdate(
            { chatId: chatId || "chat_default" },
            { 
                pdfText: rawText, 
                textChunks: chunks, 
                fileName: req.file.originalname,
                updatedAt: new Date()
            },
            { upsert: true, new: true }
        );

        res.json({ message: "PDF optimized and persisted", fileName: updatedChat.fileName });
    } catch (error) {
        res.status(500).json({ error: "Failed to read PDF." });
    }
});

app.post("/ask-pdf", async (req, res) => {
    try {
        const { question, chatId } = req.body;
        const activeId = chatId || "chat_default";
        if (!question) return res.status(400).json({ answer: "Missing question." });

        let session = await Chat.findOne({ chatId: activeId });
        if (!session) {
            session = new Chat({ chatId: activeId, messages: [], chatHistory: [] });
        }

        let systemPrompt = "";
        let targetContent = "";
        let currentTemperature = 0.3;
        let sourcesUsed = [];

        if (session.textChunks && session.textChunks.length > 0) {
            const relevantObjects = getRelevantContextObjects(question, session.textChunks);
            sourcesUsed = relevantObjects.map(obj => obj.text);
            const contextText = sourcesUsed.join("\n\n");

            systemPrompt = `You are an expert academic assistant. Answer the question accurately using the provided context clips. Always stay true to the reference content.`;
            targetContent = `RELEVANT DOCUMENT CONTEXT CLIPS:\n${contextText}\n\nUSER QUESTION:\n${question}`;
        } else {
            currentTemperature = 0.5;
            systemPrompt = `You are a helpful AI assistant. Provide highly accurate answers based on your global knowledge base.`;
            targetContent = question;
        }

        let messagesArray = [{ role: "system", content: systemPrompt }];
        session.chatHistory.forEach(msg => messagesArray.push({ role: msg.role, content: msg.content }));
        messagesArray.push({ role: "user", content: targetContent });

        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.3-70b-versatile",
                messages: messagesArray,
                temperature: currentTemperature
            },
            {
                headers: {
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const answer = response.data.choices[0].message.content;

        session.messages.push({ type: "user", text: question, sources: [] });
        session.messages.push({ type: "bot", text: answer, sources: sourcesUsed });
        
        session.chatHistory.push({ role: "user", content: question });
        session.chatHistory.push({ role: "assistant", content: answer });
        if (session.chatHistory.length > 14) session.chatHistory = session.chatHistory.slice(-14);
        
        session.updatedAt = new Date();
        await session.save();

        res.json({ answer, sources: sourcesUsed });

    } catch (error) {
        res.json({ answer: "AI failed to respond. Verify database connections.", sources: [] });
    }
});

// Dynamic port configuration for production cloud hosting
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server live and listening on port ${PORT}`));