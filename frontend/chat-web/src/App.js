import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

// KRİTİK: BURAYI KENDİ RENDER API ADRESİNİZLE DEĞİŞTİRİN
const API_BASE_URL = 'https://localhost:7112/api/messages';

function App() {
    // Mesaj listesi: Artık tam Message objesini tutacak
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [nickname, setNickname] = useState('Anonim');

    const handleSend = async (e) => {
        e.preventDefault();

        if (!currentMessage.trim()) return;

        // KRİTİK DEĞİŞİKLİK: C# Message modeline UYARLANDI
        const messageData = {
            Name: nickname, // C# Message.Name alanına eşleşir
            Description: currentMessage, // C# Message.Description alanına eşleşir

        };

        try {
            // Backend'e POST isteği at
            const response = await axios.post(API_BASE_URL, messageData);

            // Backend'den dönen yanıt muhtemelen AI sonucunu içeriyor (Kontrolcünüze göre sadece Ok(resultSentiment) dönüyor)
            // ANCAK, projenin gereksinimi: kaydedilen mesajı listeye eklemek.
            // Bu nedenle, Backend'deki PostMessage metodunuzun ya tüm Message objesini kaydetmesini
            // ya da kaydedilen Message objesiyle birlikte Sentiment sonucunu döndürmesini BEKLİYORUZ.

            // Backend'iniz şu anda SADECE AI sonucunu (SentimentResponse) döndürdüğü için,
            // mesajı biz manuel olarak listeye ekleyelim ve Feeling/Score alanlarını dolduralım.

            const sentimentResult = response.data; // SentimentResponse

            const newMessage = {
                // Gönderdiğimiz veriler
                Name: nickname,
                Description: currentMessage,
                Timestamp: new Date().toISOString(), // Simülasyon

                // AI'dan gelen veriler
                Feeling: sentimentResult.label, // C# SentimentResponse.label'dan
                Score: sentimentResult.score // C# SentimentResponse.score'dan
            };

            // Mesaj listesini güncelle
            setMessages(prevMessages => [...prevMessages, newMessage]);

            // Giriş alanını temizle
            setCurrentMessage('');

        } catch (error) {
            console.error('Mesaj gönderme hatası:', error.response ? error.response.data : error.message);
            alert('Mesaj gönderilemedi. Konsolu kontrol edin.');
        }
    };

    return (
        <div className="App" style={{ padding: '20px' }}>
            <h1>FullStack Chat + AI Analiz 💬</h1>

            {/* Mesaj Listesi Alanı */}
            <div style={{ border: '1px solid #ccc', height: '300px', overflowY: 'scroll', marginBottom: '10px', padding: '10px' }}>
                {messages.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#666' }}>Henüz mesaj yok. Bir mesaj gönderin!</p>
                ) : (
                    messages.map((msg, index) => (
                        <div key={index} style={{ marginBottom: '5px' }}>
                            {/* C# Modelindeki Name ve Description alanlarını kullanıyoruz */}
                            <strong>{msg.Name}:</strong> {msg.Description}
                            <span style={{
                                marginLeft: '10px', fontWeight: 'bold',
                                color: msg.Feeling === 'pozitif' ? 'green' : msg.Feeling === 'negatif' ? 'red' : 'gray'
                            }}>
                                ({msg.Feeling || 'Analiz Ediliyor'})
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Mesaj Gönderme Formu */}
            <form onSubmit={handleSend}>
                <input
                    type="text"
                    placeholder="Rumuzunuz"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    style={{ marginRight: '10px', padding: '8px' }}
                />
                <input
                    type="text"
                    placeholder="Mesajınızı yazın..."
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    style={{ padding: '8px', width: '300px', marginRight: '10px' }}
                />
                <button type="submit" style={{ padding: '8px 15px' }}>
                    Gönder
                </button>
            </form>
        </div>
    );
}

export default App;