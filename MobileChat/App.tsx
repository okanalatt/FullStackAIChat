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
    // Sizin C# Modeliniz: Name, Description, Feeling, Score
    name: string;
    description: string;
    timestamp: string;
    feeling: 'pozitif' | 'n�tr' | 'negatif' | 'bekleniyor' | string;
    score: number;
}

const App = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    // Mobil uygulamay� direkt chat ekran�na ge�irmek i�in rumuzun �nceden ayarlanmas�
    const [rumuz, setRumuz] = useState('');
    const [loading, setLoading] = useState(false);

    // Yeni durum: �lk ba�ta rumuzu girmesi gereken bir ekran g�sterece�iz.
    const [isRumuzEntered, setIsRumuzEntered] = useState(false);


    // --- Yard�mc� Fonksiyonlar ---

    const getSentimentColor = (score: string) => {
        // Sizin C# Feeling alan�n�zdan gelen de�ere g�re renk d�ner
        switch (score.toLowerCase()) {
            case 'pozitif':
                return 'green';
            case 'negatif':
                return 'red';
            case 'n�tr':
                return 'gray';
            default:
                return 'orange';
        }
    };

    const getMessages = async () => {
        try {
            // T�m mesajlar� �ekiyoruz
            const response = await axios.get(`${API_URL}/api/messages`);

            // Gelen verideki feeling alan�n� kullan�yoruz.
            setMessages(response.data.map((msg: any) => ({
                ...msg,
                feeling: msg.feeling || 'bekleniyor'
            })));
        } catch (error) {
            console.error("Mesajlar �ekilemedi:", error);
            // Mesaj �ekmede hata olursa kullan�c�y� uyarmayal�m, sadece console'a d��s�n
        }
    };


    const handleSendMessage = async () => {
        if (!newMessage.trim() || !rumuz.trim()) return;
        setLoading(true);

        // D�zeltme: Sizin C# Modelinizdeki alan adlar�n� kullan�yoruz: Name ve Description
        const messageData = {
            Name: rumuz,
            Description: newMessage,
        };

        try {
            // Mesaj� /api/messages endpoint'ine POST ediyoruz
            const response = await axios.post(`${API_URL}/api/messages`, messageData);

            // Backend (C# Controller), analiz yap�p muhtemelen t�m mesaj listesini geri d�nd�r�yor.
            setMessages(response.data.map((msg: any) => ({
                ...msg,
                feeling: msg.feeling || 'bekleniyor'
            })));
            setNewMessage('');
        } catch (error) {
            // Rumuz kayd� yerine direkt mesaj hatas� g�sterelim.
            Alert.alert('Hata', 'Mesaj g�nderilemedi. (Backend/AI sorunu olabilir.)');
        } finally {
            setLoading(false);
        }
    };

    // Rumuz girildikten sonra mesajlar� �ekmeye ba�la
    useEffect(() => {
        if (isRumuzEntered) {
            getMessages();
            // 5 saniyede bir mesajlar� yenile
            const interval = setInterval(getMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [isRumuzEntered]);

    // --- Aray�z (UI) Render B�l�m� ---

    // Kullan�c� hen�z rumuzunu girmediyse Rumuz Giri� Ekran�
    if (!isRumuzEntered) {
        return (
            <View style={styles.container}>
                <Text style={styles.headerText}>Konu�arak ��ren Mobil Chat</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Bir Rumuz Girin (Gerekli)"
                    value={rumuz}
                    onChangeText={setRumuz}
                    editable={!loading}
                />
                <Button
                    title={'Chat\'e Ba�la'}
                    onPress={() => {
                        if (rumuz.trim()) {
                            setIsRumuzEntered(true);
                        } else {
                            Alert.alert('Uyar�', 'L�tfen bir rumuz girin.');
                        }
                    }}
                    disabled={loading}
                />
            </View>
        );
    }

    // Kullan�c� Rumuzunu Girdikten Sonraki Chat Ekran�
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
                        // Kendi mesaj�n� Name alan�na g�re belirliyoruz
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
                        {/* Skor: {item.score} */}
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