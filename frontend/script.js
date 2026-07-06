const API = "http://localhost:5000";

const messages = document.getElementById("messages");

/* ---------------- ADD MESSAGE ---------------- */
function addMessage(text, type) {
    const div = document.createElement("div");
    div.classList.add("msg", type);
    div.innerText = text;

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

/* ---------------- TYPING INDICATOR ---------------- */
function addTyping() {
    const div = document.createElement("div");
    div.classList.add("msg", "bot");
    div.id = "typing";
    div.innerText = "AI is thinking...";

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
}

/* ---------------- REMOVE TYPING ---------------- */
function removeTyping() {
    const el = document.getElementById("typing");
    if (el) el.remove();
}

/* ---------------- UPLOAD PDF ---------------- */
async function uploadPDF() {
    const file = document.getElementById("fileInput").files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("pdf", file);

    document.getElementById("status").innerText = "Uploading...";

    const res = await fetch(`${API}/upload-pdf`, {
        method: "POST",
        body: formData
    });

    const data = await res.json();

    document.getElementById("status").innerText =
        data.message || data.error;
}

/* ---------------- ASK AI ---------------- */
async function ask() {
    const input = document.getElementById("question");
    const text = input.value.trim();

    if (!text) return;

    addMessage(text, "user");
    input.value = "";

    addTyping();

    const res = await fetch(`${API}/ask-pdf`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: text })
    });

    const data = await res.json();

    removeTyping();

    addMessage(data.answer, "bot");
}

/* ---------------- SUMMARY ---------------- */
async function summarizePDF() {
    addTyping();

    const res = await fetch(`${API}/summarize-pdf`, {
        method: "POST"
    });

    const data = await res.json();

    removeTyping();

    addMessage(data.summary, "bot");
}