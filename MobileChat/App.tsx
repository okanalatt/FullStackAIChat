import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    Button,
    FlatList,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import axios from 'axios';

// Backend URL'niz: Render API'nin ana adresi.
const API_URL = 'https://fullstackaichat-htei.onrender.com';

// Mesaj tipini C# Modelinize (Message) göre güncelledik
interface Message {
    id: number;
    // Sizin C# Modeliniz: Name, Description, Feeling, Score
    name: string;
    description: string;
    timestamp: string;
    feeling: 'pozitif' | 'nötr' | 'negatif' | 'bekleniyor' | string;
    score: number;
}

const App = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    // Mobil uygulamayý direkt chat ekranýna geçirmek için rumuzun önceden ayarlanmasý
    const [rumuz, setRumuz] = useState('');
    const [loading, setLoading] = useState(false);

    // Yeni durum: Ýlk baþta rumuzu girmesi gereken bir ekran göstereceðiz.
    const [isRumuzEntered, setIsRumuzEntered] = useState(false);


    // --- Yardýmcý Fonksiyonlar ---

    const getSentimentColor = (score: string) => {
        // Sizin C# Feeling alanýnýzdan gelen deðere göre renk döner
        switch (score.toLowerCase()) {
            case 'pozitif':
                return 'green';
            case 'negatif':
                return 'red';
            case 'nötr':
                return 'gray';
            default:
                return 'orange';
        }
    };

    const getMessages = async () => {
        try {
            // Tüm mesajlarý çekiyoruz
            const response = await axios.get(`${API_URL}/api/messages`);

            // Gelen verideki feeling alanýný kullanýyoruz.
            setMessages(response.data.map((msg: any) => ({
                ...msg,
                feeling: msg.feeling || 'bekleniyor'
            })));
        } catch (error) {
            console.error("Mesajlar çekilemedi:", error);
            // Mesaj çekmede hata olursa kullanýcýyý uyarmayalým, sadece console'a düþsün
        }
    };


    const handleSendMessage = async () => {
        if (!newMessage.trim() || !rumuz.trim()) return;
        setLoading(true);

        // Düzeltme: Sizin C# Modelinizdeki alan adlarýný kullanýyoruz: Name ve Description
        const messageData = {
            Name: rumuz,
            Description: newMessage,
        };

        try {
            // Mesajý /api/messages endpoint'ine POST ediyoruz
            const response = await axios.post(`${API_URL}/api/messages`, messageData);

            // Backend (C# Controller), analiz yapýp muhtemelen tüm mesaj listesini geri döndürüyor.
            setMessages(response.data.map((msg: any) => ({
                ...msg,
                feeling: msg.feeling || 'bekleniyor'
            })));
            setNewMessage('');
        } catch (error) {
            // Rumuz kaydý yerine direkt mesaj hatasý gösterelim.
            Alert.alert('Hata', 'Mesaj gönderilemedi. (Backend/AI sorunu olabilir.)');
        } finally {
            setLoading(false);
        }
    };

    // Rumuz girildikten sonra mesajlarý çekmeye baþla
    useEffect(() => {
        if (isRumuzEntered) {
            getMessages();
            // 5 saniyede bir mesajlarý yenile
            const interval = setInterval(getMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [isRumuzEntered]);

    // --- Arayüz (UI) Render Bölümü ---

    // Kullanýcý henüz rumuzunu girmediyse Rumuz Giriþ Ekraný
    if (!isRumuzEntered) {
        return (
            <View style={styles.container}>
                <Text style={styles.headerText}>Konuþarak Öðren Mobil Chat</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Bir Rumuz Girin (Gerekli)"
                    value={rumuz}
                    onChangeText={setRumuz}
                    editable={!loading}
                />
                <Button
                    title={'Chat\'e Baþla'}
                    onPress={() => {
                        if (rumuz.trim()) {
                            setIsRumuzEntered(true);
                        } else {
                            Alert.alert('Uyarý', 'Lütfen bir rumuz girin.');
                        }
                    }}
                    disabled={loading}
                />
            </View>
        );
    }

    // Kullanýcý Rumuzunu Girdikten Sonraki Chat Ekraný
    return (
        <KeyboardAvoidingView
            style={styles.fullContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>

            <View style={styles.header}>
                <Text style={styles.headerText}>Full Stack AI Chat (Mobil)</Text>
                <Text style={{ color: 'white' }}>Rumuzunuz: {rumuz}</Text>
            </View>

            <FlatList
                data={messages}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View style={[
                        styles.messageBubble,
                        // Kendi mesajýný Name alanýna göre belirliyoruz
                        item.name === rumuz ? styles.myMessage : styles.otherMessage,
                    ]}>
                        <Text style={styles.messageRumuz}>{item.name}</Text>
                        <Text style={styles.messageContent}>{item.description}</Text>

                        {/* Duygu Skoru Gösterimi */}
                        <Text style={[
                            styles.sentiment,
                            { color: getSentimentColor(item.feeling) },
                        ]}>
                            Duygu: {item.feeling.toUpperCase()}
                        </Text>
                        {/* Skor: {item.score} */}
                    </View>
                )}
            />

            {/* Mesaj Giriþ Alaný */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Mesajýnýzý yazýn..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                    editable={!loading}
                />
                <Button
                    title={loading ? 'Gönderiliyor...' : 'Gönder'}
                    onPress={handleSendMessage}
                    disabled={!newMessage.trim() || loading}
                />
            </View>
        </KeyboardAvoidingView>
    );
};

// --- Stil Tanýmlamalarý ---
const styles = StyleSheet.create({
    fullContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        backgroundColor: '#3498db',
        paddingTop: 40,
        paddingBottom: 10,
        paddingHorizontal: 20,
    },
    headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderColor: '#eee',
        backgroundColor: 'white',
    },
    messageBubble: {
        padding: 10,
        borderRadius: 10,
        marginVertical: 5,
        maxWidth: '80%',
    },
    myMessage: {
        backgroundColor: '#dcf8c6', // Benim mesajým
        alignSelf: 'flex-end',
        marginRight: 10,
    },
    otherMessage: {
        backgroundColor: '#ffffff', // Diðerinin mesajý
        alignSelf: 'flex-start',
        marginLeft: 10,
        borderWidth: 1,
        borderColor: '#eee',
    },
    messageRumuz: {
        fontWeight: 'bold',
        fontSize: 12,
        marginBottom: 3,
    },
    messageContent: {
        fontSize: 16,
    },
    sentiment: {
        marginTop: 5,
        fontSize: 10,
        fontWeight: 'bold',
        alignSelf: 'flex-end',
    }
});

export default App;