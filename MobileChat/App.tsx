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

// Mesaj tipini C# Modelinize (Message) g�re g�ncelledik
interface Message {
    id: number;
    // C# Modelinde 'Name' olarak tan�ml�
    name: string;
    // C# Modelinde 'Description' olarak tan�ml�
    description: string;
    timestamp: string;
    // C# Modelinde 'Feeling' olarak tan�ml�
    feeling: 'pozitif' | 'n�tr' | 'negatif' | 'bekleniyor' | string;
    score: number;
}

const App = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [rumuz, setRumuz] = useState('');
    const [isRegistered, setIsRegistered] = useState(false);
    const [loading, setLoading] = useState(false);

    // --- Yard�mc� Fonksiyonlar ---

    const getSentimentColor = (score: string) => {
        switch (score.toLowerCase()) {
            case 'pozitif':
                return 'green';
            case 'negatif':
                return 'red';
            case 'n�tr':
                return 'gray';
            default:
                return 'orange'; // Duygu analizi bekleniyor
        }
    };

    const getMessages = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/messages`);
            // Gelen veriyi (name, description, feeling) kullan�yoruz
            setMessages(response.data.map((msg: any) => ({
                ...msg,
                feeling: msg.feeling || 'bekleniyor'
            })));
        } catch (error) {
            console.error("Mesajlar �ekilemedi:", error);
            // Bu hata mesaj�n� daha az agresif yapal�m, sadece console'a d��s�n.
        }
    };

    // --- Temel Ak�� Fonksiyonlar� ---

    const handleRegister = async () => {
        if (!rumuz.trim()) {
            Alert.alert('Uyar�', 'L�tfen bir rumuz girin.');
            return;
        }
        setLoading(true);
        try {
            // D�zeltme: C# Modelinizdeki Name alan�n� g�nderiyoruz
            // API'niz muhtemelen bu Name ile bir User/Rumuz kayd� yap�yor.
            await axios.post(`${API_URL}/api/users`, { Name: rumuz });
            setIsRegistered(true);
            await getMessages();
        } catch (error) {
            // Hata: Rumuz kayd� ba�ar�s�z oldu (Hala 400 Bad Request al�yorsak, buraya d��eriz)
            Alert.alert('Hata', 'Rumuz kayd� ba�ar�s�z oldu. (Backend Model Hatas� Olabilir!)');
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !isRegistered) return;
        setLoading(true);

        // D�zeltme: C# Modelinizdeki Name ve Description alanlar�n� g�nderiyoruz
        const messageData = {
            Name: rumuz,
            Description: newMessage,
        };

        try {
            // Mesaj� g�nder ve backend'den analiz edilmi� t�m mesaj listesini geri al.
            const response = await axios.post(`${API_URL}/api/messages`, messageData);

            // Backend, analiz sonucuyla birlikte g�ncel listeyi d�nd�r�yor.
            setMessages(response.data.map((msg: any) => ({
                ...msg,
                feeling: msg.feeling || 'bekleniyor'
            })));
            setNewMessage('');
        } catch (error) {
            Alert.alert('Hata', 'Mesaj g�nderilemedi veya analiz ba�ar�s�z oldu.');
        } finally {
            setLoading(false);
        }
    };

    // Uygulama ilk a��ld���nda veya register sonras� �al��acak
    useEffect(() => {
        if (isRegistered) {
            getMessages();
            // 5 saniyede bir mesajlar� yenile
            const interval = setInterval(getMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [isRegistered]);

    // --- Aray�z (UI) Render B�l�m� ---

    // Kullan�c� hen�z kaydolmad�ysa Rumuz Giri� Ekran�
    if (!isRegistered) {
        return (
            <View style={styles.container}>
                <Text style={styles.headerText}>Konu�arak ��ren Mobil Chat</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Bir Rumuz Girin"
                    value={rumuz}
                    onChangeText={setRumuz}
                    editable={!loading}
                />
                <Button
                    title={loading ? 'Kaydediliyor...' : 'Rumuz ile Ba�la'}
                    onPress={handleRegister}
                    disabled={loading}
                />
            </View>
        );
    }

    // Kullan�c� Kaydolduktan Sonraki Chat Ekran�
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

                        {/* Duygu Skoru G�sterimi */}
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

            {/* Mesaj Giri� Alan� */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Mesaj�n�z� yaz�n..."
                    value={newMessage}
                    onChangeText={setNewMessage}
                    editable={!loading}
                />
                <Button
                    title={loading ? 'G�nderiliyor...' : 'G�nder'}
                    onPress={handleSendMessage}
                    disabled={!newMessage.trim() || loading}
                />
            </View>
        </KeyboardAvoidingView>
    );
};

// --- Stil Tan�mlamalar� ---
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
        backgroundColor: '#dcf8c6', // Benim mesaj�m
        alignSelf: 'flex-end',
        marginRight: 10,
    },
    otherMessage: {
        backgroundColor: '#ffffff', // Di�erinin mesaj�
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