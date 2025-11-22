// App.js (GÜÇLENDİRİLMİŞ - Render 410 Gone için robust retry + wake)
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./App.css";

const API_ORIGIN = "https://fullstackaichat-htei.onrender.com"; // origin olarak uyarıyoruz
const API_BASE_URL = `${API_ORIGIN}/api/messages`;

function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

function App() {
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [nickname, setNickname] = useState("Anonim");
    const [isLoading, setIsLoading] = useState(false);
    const [lastError, setLastError] = useState(null);

    useEffect(() => {
        // sayfa açılınca önce origin'i uyar, sonra mesajları çek
        (async () => {
            await robustWakeServer();
            await fetchMessagesWithRetry();
        })();
    }, []);

    // Önce origin'e ping at: bazı hostlar başlatmayı root'tan tetikliyor
    const robustWakeServer = async () => {
        const maxTries = 6;
        let attempt = 0;
        while (attempt < maxTries) {
            attempt++;
            try {
                console.log(`[wake] ping origin attempt ${attempt}`);
                // ping root first (faster to wake on some hosts)
                await axios.get(API_ORIGIN, { timeout: 5000 });
                console.log("[wake] origin responded");
                return;
            } catch (err) {
                console.warn(`[wake] origin not ready (attempt ${attempt})`);
                // küçük aralıklarla bekle (artan)
                await sleep(800 * attempt);
            }
        }
        console.warn("[wake] origin did not respond after attempts - will continue and try API calls directly");
    };

    // fetch messages, 3 deneme
    const fetchMessagesWithRetry = async () => {
        const max = 3;
        let attempt = 0;
        while (attempt < max) {
            attempt++;
            try {
                const res = await axios.get(API_BASE_URL, { timeout: 8000 });
                setMessages(res.data || []);
                return;
            } catch (err) {
                console.warn(`[fetchMessages] attempt ${attempt} failed`, err?.message || err);
                await sleep(700 * attempt);
            }
        }
        console.error("[fetchMessages] tüm denemeler başarısız");
        setLastError("Mesajlar çekilemedi. Ağ veya sunucu uyanmamış olabilir.");
    };

    // POST için exponential backoff retry (özellikle 410 Gone için)
    const postWithRetry = async (payload, maxRetries = 5) => {
        let attempt = 0;
        let lastErr = null;

        while (attempt < maxRetries) {
            attempt++;
            try {
                console.log(`[postWithRetry] attempt ${attempt}`);
                const res = await axios.post(API_BASE_URL, payload, { timeout: 12000 });
                return res;
            } catch (err) {
                lastErr = err;
                const status = err.response?.status;
                console.warn(`[postWithRetry] attempt ${attempt} failed, status=${status}`, err.message || err);

                // Eğer 410 geliyorsa sunucu muhtemelen uyanıyor => bekle ve tekrar yap
                if (status === 410 || !err.response) {
                    // artan bekleme: 700ms, 1400ms, 2800ms, ...
                    const wait = 700 * Math.pow(2, attempt - 1);
                    console.log(`[postWithRetry] waiting ${wait}ms before retry (status=${status})`);
                    await sleep(wait);
                    // ekstra: origin'e kısa ping at
                    try { await axios.get(API_ORIGIN, { timeout: 4000 }); } catch (_) { }
                    continue;
                } else {
                    // 4xx/5xx farklı hata ise tekrar deneme gereksiz olabilir — kır
                    break;
                }
            }
        }

        // tüm denemeler bitti hata fırlat
        throw lastErr;
    };

    const handleSend = async (e) => {
        e.preventDefault();
        setLastError(null);
        if (!currentMessage.trim() || isLoading) return;

        const messageData = {
            Name: nickname,
            Description: currentMessage,
        };

        setIsLoading(true);

        try {
            const response = await postWithRetry(messageData, 5);
            const saved = response.data;
            setMessages((prev) => [...prev, saved]);
            setCurrentMessage("");
        } catch (error) {
            console.error("Mesaj gönderilemedi:", error);
            const status = error.response?.status;
            if (status === 410) {
                setLastError("Sunucu uyuma durumunda ve uyanamadı (410 Gone). Birkaç saniye sonra tekrar deneyin.");
            } else if (status) {
                setLastError(`Sunucu hatası: ${status}`);
            } else {
                setLastError("Ağ hatası veya sunucuya ulaşılamıyor.");
            }
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
                            <strong>{msg.name || msg.Name}:</strong> {msg.description || msg.Description}
                            <span
                                className="message-feeling"
                                style={{ color: getSentimentColor(msg.feeling || msg.Feeling) }}
                            >
                                ({msg.feeling || msg.Feeling || "Analiz"})
                            </span>
                            {(msg.score || msg.Score) && (
                                <span className="message-score">[{((msg.score || msg.Score) * 100).toFixed(1)}%]</span>
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

            <div style={{ marginTop: 8, fontSize: 12, color: "#666" }}>
                Not: Sunucu uyku modundaysa ilk denemede "410 Gone" gelebilir — bu sürüm bunu otomatik tekrar dener.
            </div>
        </div>
    );
}

export default App;
