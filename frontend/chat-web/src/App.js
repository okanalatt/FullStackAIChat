import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';


const API_BASE_URL = 'https://fullstack-ai-chat-5tje1.onrender.com/api/messages';

function App() {
    // Mesaj listesi
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [nickname, setNickname] = useState('Anonim');
    const [isLoading, setIsLoading] = useState(false);

    // 1. Uygulama yüklendiğinde mevcut mesajları çeker
    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const response = await axios.get(API_BASE_URL);
            setMessages(response.data || []);
        } catch (error) {
            console.error("Mesajlar çekilirken hata oluştu:", error);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();

        if (!currentMessage.trim() || isLoading) return;

        // Backend'e gönderilecek sade veri
        const messageData = {
            Name: nickname,
            Description: currentMessage,
        };

        setIsLoading(true);

        try {
        
            const response = await axios.post(API_BASE_URL, messageData);

        
            const savedMessage = response.data;

         
            setMessages(prevMessages => [...prevMessages, savedMessage]);

        
            setCurrentMessage('');

        } catch (error) {
            console.error('Mesaj gönderme hatası:', error.response ? error.response.data : error.message);
            const errorDetails = error.response?.data?.details || error.response?.data?.error || 'Bilinmeyen bir hata oluştu.';
            alert(`Mesaj gönderilemedi. Hata: ${errorDetails}`);
        } finally {
            setIsLoading(false);
        }
    };


    const getSentimentColor = (feeling) => {
        if (!feeling) return 'gray';
        const lowerCaseFeeling = feeling.toLowerCase();
        if (lowerCaseFeeling.includes('pozitif')) return 'green';
        if (lowerCaseFeeling.includes('negatif')) return 'red';
        return 'gray';
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
                            <strong>{msg.name || msg.Name}:</strong> {msg.description || msg.Description}
                            <span style={{
                                marginLeft: '10px', fontWeight: 'bold',
                                color: getSentimentColor(msg.feeling || msg.Feeling)
                            }}>
                                ({msg.feeling || msg.Feeling || 'Analiz Ediliyor'})
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Mesaj Gönderme Formu */}
            <form onSubmit={handleSend} style={{ display: 'flex' }}>
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
                    style={{ flexGrow: 1, padding: '8px', marginRight: '10px' }}
                />
                <button type="submit" style={{ padding: '8px 15px' }} disabled={isLoading}>
                    {isLoading ? 'Gönderiliyor...' : 'Gönder'}
                </button>
            </form>
        </div>
    );
}

export default App;