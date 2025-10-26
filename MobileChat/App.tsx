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
    ScrollView,
} from 'react-native';
import axios from 'axios';

const API_URL = 'https://fullstackaichat-htei.onrender.com';

// Mesaj tipini tanýmlýyoruz (TypeScript için)
interface Message {
    id: number;
    rumuz: string;
    content: string;
    timestamp: string;
    sentimentScore: 'pozitif' | 'nötr' | 'negatif' | 'bekleniyor';
}

const App = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [rumuz, setRumuz] = useState('');
    const [isRegistered, setIsRegistered] = useState(false);
    const [loading, setLoading] = useState(false);

    // --- Yardýmcý Fonksiyonlar ---

    const getSentimentColor = (score: string) => {
        switch (score) {
            case 'pozitif':
                return 'green';
            case 'negatif':
                return 'red';
            case 'nötr':
                return 'gray';
            default:
                return 'orange'; // Duygu analizi bekleniyor
        }
    };

    const getMessages = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/messages`);
            // Gelen veriyi TypeScript modelimize uygun hale getiriyoruz
            setMessages(response.data.map((msg: any) => ({
                ...msg,
                sentimentScore: msg.sentimentScore || 'bekleniyor'
            })));
        } catch (error) {
            console.error("Mesajlar çekilemedi:", error);
            Alert.alert('Hata', 'Mesajlar listelenirken bir sorun oluþtu.');
        }
    };

    // --- Temel Akýþ Fonksiyonlarý ---

    const handleRegister = async () => {
        if (!rumuz.trim()) {
            Alert.alert('Uyarý', 'Lütfen bir rumuz girin.');
            return;
        }
        setLoading(true);
        try {
            // 1. Kullanýcý kaydý (sadece rumuz) .NET API'ye gönderiliyor [cite: 7]
            await axios.post(`${API_URL}/api/users`, { rumuz });
            setIsRegistered(true);
            await getMessages(); // Kayýttan sonra mevcut mesajlarý çek
        } catch (error) {
            Alert.alert('Hata', 'Rumuz kaydý baþarýsýz oldu.');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !isRegistered) return;
        setLoading(true);

        const messageData = {
            Rumuz: rumuz,
            Content: newMessage,
        };

        try {
            // 2. Mesajýn gönderilmesi (Backend AI'yi tetikleyecek) [cite: 7]
            const response = await axios.post(`${API_URL}/api/messages`, messageData);

            // Backend, analiz sonucuyla birlikte güncel listeyi döndürüyor. [cite: 7]
            setMessages(response.data.map((msg: any) => ({
                ...msg,
                sentimentScore: msg.sentimentScore || 'bekleniyor'
            })));
            setNewMessage(''); // Giriþ alanýný temizle
        } catch (error) {
            Alert.alert('Hata', 'Mesaj gönderilemedi veya analiz baþarýsýz oldu.');
        } finally {
            setLoading(false);
        }
    };

    // Uygulama ilk açýldýðýnda veya register sonrasý çalýþacak
    useEffect(() => {
        if (isRegistered) {
            getMessages();
            // MVP için basit bir refresh mekanizmasý (Gerçek zamanlý olmasa da güncel tutar)
            const interval = setInterval(getMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [isRegistered]);

    // --- Arayüz (UI) Render Bölümü ---

    // Kullanýcý henüz kaydolmadýysa Rumuz Giriþ Ekraný
    if (!isRegistered) {
        return (
            <View style={styles.container}>
                <Text style={styles.title}>Konuþarak Öðren Mobil Chat</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Bir Rumuz Girin"
                    value={rumuz}
                    onChangeText={setRumuz}
                    editable={!loading}
                />
                <Button
                    title={loading ? 'Kaydediliyor...' : 'Rumuz ile Baþla'}
                    onPress={handleRegister}
                    disabled={loading}
                />
            </View>
        );
    }

    // Kullanýcý Kaydolduktan Sonraki Chat Ekraný
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
                        item.rumuz === rumuz ? styles.myMessage : styles.otherMessage,
                    ]}>
                        <Text style={styles.messageRumuz}>{item.rumuz}</Text>
                        <Text style={styles.messageContent}>{item.content}</Text>

                        {/* Duygu Skoru Gösterimi */}
                        <Text style={[
                            styles.sentiment,
                            { color: getSentimentColor(item.sentimentScore) },
                        ]}>
                            Duygu: {item.sentimentScore.toUpperCase()}
                        </Text>
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