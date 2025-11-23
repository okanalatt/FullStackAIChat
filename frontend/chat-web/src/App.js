// App.js - HuggingFace Space API uyumlu
import React, { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "https://huggingface.co/spaces/okanalat/duygu-analizi/api/predict/";

function App() {
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [nickname, setNickname] = useState("Anonim");
    const [isLoading, setIsLoading] = useState(false);
    const [lastError, setLastError] = useState(null);

    const handleSend = async (e) => {
        e.preventDefault();
        setLastError(null);
        if (!currentMessage.trim() || isLoading) return;

        const payload = {
            inputs: currentMessage // HuggingFace Space input key genellikle 'inputs' oluyor
        };

        setIsLoading(true);

        try {
            const response = await axios.post(API_URL, payload, {
                headers: { "Content-Type": "application/json" },
            });

            // HuggingFace model cevabı genellikle response.data ile geliyor
            const prediction = response.data;

            // Mesaj listesine ekle
            setMessages((prev) => [
                ...prev,
                {
                    Name: nickname,
                    Description: currentMessage,
                    Feeling: prediction?.label || "Analiz yok",
                    Score: prediction?.score || null,
                },
            ]);

            setCurrentMessage("");
        } catch (error) {
            console.error("Mesaj gönderilemedi:", error);
            setLastError("Sunucuya ulaşılamıyor veya HuggingFace Space cevap vermiyor.");
        } finally {
            setIsLoading(false);
        }
    };

    const getSentimentColor = (feeling) => {
        if (!feeling) return "gray";
        const f = feeling.toLowerCase();
        if (f.includes("pozitif")) return "green";
        if (f.includes("negatif")) return "red";
        return "gray";
    };

    return (
        <div className="App" style={{ padding: "20px" }}>
            <h1>FullStack Chat + AI Analiz 💬</h1>

            <div className="chat-box" aria-live="polite">
                {messages.length === 0 ? (
                    <p style={{ textAlign: "center", color: "#666" }}>Henüz mesaj yok. Bir mesaj gönderin!</p>
                ) : (
                    messages.map((msg, index) => (
                        <div className="message-item" key={index}>
                            <strong>{msg.Name}:</strong> {msg.Description}
                            <span
                                className="message-feeling"
                                style={{ color: getSentimentColor(msg.Feeling) }}
                            >
                                ({msg.Feeling || "Analiz"})
                            </span>
                            {msg.Score && (
                                <span className="message-score">[{(msg.Score * 100).toFixed(1)}%]</span>
                            )}
                        </div>
                    ))
                )}
            </div>

            {lastError && (
                <div style={{ color: "#a33", marginBottom: "10px" }}>
                    ⚠ {lastError}
                </div>
            )}

            <form onSubmit={handleSend} style={{ display: "flex" }}>
                <input
                    type="text"
                    placeholder="Rumuzunuz"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    style={{ marginRight: "10px", padding: "8px" }}
                />
                <input
                    type="text"
                    placeholder="Mesajınızı yazın..."
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    style={{ flexGrow: 1, padding: "8px", marginRight: "10px" }}
                />
                <button type="submit" style={{ padding: "8px 15px" }} disabled={isLoading}>
                    {isLoading ? "Gönderiliyor..." : "Gönder"}
                </button>
            </form>
        </div>
    );
}

export default App;
