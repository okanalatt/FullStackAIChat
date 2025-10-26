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
    // C# Modelinde 'Name' olarak tanýmlý
    name: string;
    // C# Modelinde 'Description' olarak tanýmlý
    description: string;
    timestamp: string;
    // C# Modelinde 'Feeling' olarak tanýmlý
    feeling: 'pozitif' | 'nötr' | 'negatif' | 'bekleniyor' | string;
    score: number;
}

const App = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [rumuz, setRumuz] = useState('');
    const [isRegistered, setIsRegistered] = useState(false);
    const [loading, setLoading] = useState(false);

    // --- Yardýmcý Fonksiyonlar ---

    const getSentimentColor = (score: string) => {
        switch (score.toLowerCase()) {
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
            // Gelen veriyi (name, description, feeling) kullanýyoruz
            setMessages(response.data.map((msg: any) => ({
                ...msg,
                feeling: msg.feeling || 'bekleniyor'
            })));
        } catch (error) {
            console.error("Mesajlar çekilemedi:", error);
            // Bu hata mesajýný daha az agresif yapalým, sadece console'a düþsün.
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
            // Düzeltme: C# Modelinizdeki Name alanýný gönderiyoruz
            // API'niz muhtemelen bu Name ile bir User/Rumuz kaydý yapýyor.
            await axios.post(`${API_URL}/api/users`, { Name: rumuz });
            setIsRegistered(true);
            await getMessages();
        } catch (error) {
            // Hata: Rumuz kaydý baþarýsýz oldu (Hala 400 Bad Request alýyorsak, buraya düþeriz)
            Alert.alert('Hata', 'Rumuz kaydý baþarýsýz oldu. (Backend Model Hatasý Olabilir!)');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !isRegistered) return;
        setLoading(true);

        // Düzeltme: C# Modelinizdeki Name ve Description alanlarýný gönderiyoruz
        const messageData = {
            Name: rumuz,
            Description: newMessage,
        };

        try {
            // Mesajý gönder ve backend'den analiz edilmiþ tüm mesaj listesini geri al.
            const response = await axios.post(`${API_URL}/api/messages`, messageData);

            // Backend, analiz sonucuyla birlikte güncel listeyi döndürüyor.
            setMessages(response.data.map((msg: any) => ({
                ...msg,
                feeling: msg.feeling || 'bekleniyor'
            })));
            setNewMessage('');
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
            // 5 saniyede bir mesajlarý yenile
            const interval = setInterval(getMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [isRegistered]);

    // --- Arayüz (UI) Render Bölümü ---

    // Kullanýcý henüz kaydolmadýysa Rumuz Giriþ Ekraný
    if (!isRegistered) {
        return (
            <View style={styles.container}>
                <Text style={styles.headerText}>Konuþarak Öðren Mobil Chat</Text>
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
                        {/* Skor: {item.score} (Ek bilgi) */}
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