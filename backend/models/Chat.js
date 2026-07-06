const mongoose = require("mongoose");

// This tells MongoDB exactly what data to expect and save
const ChatSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    fileName: { type: String, default: "" },
    pdfText: { type: String, default: "" },
    textChunks: { type: [String], default: [] },
    messages: [
        {
            type: { type: String, enum: ["user", "bot"], required: true },
            text: { type: String, required: true },
            sources: { type: [String], default: [] }
        }
    ],
    chatHistory: [
        {
            role: { type: String, required: true },
            content: { type: String, required: true }
        }
    ],
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Chat", ChatSchema);