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

const API_URL = 'https://fullstackaichat-htei.onrender.com';

interface Message {
    id: number;
    name: string;
    description: string;
    timestamp: string;
    feeling: 'pozitif' | 'n�tr' | 'negatif' | 'bekleniyor' | string;
    score: number;
}

const App = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [rumuz, setRumuz] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRumuzEntered, setIsRumuzEntered] = useState(false);

    const getSentimentColor = (score: string) => {
        switch (score.toLowerCase()) {
            case 'pozitif':
            case 'positive':
                return 'green';
            case 'negatif':
            case 'negative':
                return 'red';
            case 'n�tr':
            case 'neutral':
                return 'gray';
            default:
                return 'orange';
        }
    };

    const getMessages = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/messages`);
            setMessages(response.data.map((msg: any) => ({
                ...msg,
                feeling: msg.feeling || msg.Feeling || 'bekleniyor',
                score: msg.score || msg.Score || 0
            })));
        } catch (error) {
            console.error("Mesajlar �ekilemedi:", error);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !rumuz.trim()) return;
        setLoading(true);

        const messageData = {
            Name: rumuz,
            Description: newMessage,
        };

        try {
            // Backend'den tek mesaj d�n�yor, array de�il!
            const response = await axios.post(`${API_URL}/api/messages`, messageData);

            // Yeni mesaj� mevcut listeye ekle
            const savedMessage = {
                ...response.data,
                feeling: response.data.feeling || response.data.Feeling || 'bekleniyor',
                score: response.data.score || response.data.Score || 0
            };

            setMessages(prev => [...prev, savedMessage]);
            setNewMessage('');
        } catch (error: any) {
            console.error('Mesaj g�nderme hatas�:', error);
            // Sadece ger�ek hata oldu�unda g�ster
            if (error.response?.status !== 201) {
                Alert.alert('Hata', 'Mesaj g�nderilemedi. L�tfen tekrar deneyin.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isRumuzEntered) {
            getMessages();
            const interval = setInterval(getMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [isRumuzEntered]);

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

                        <View style={styles.sentimentContainer}>
                            <Text style={[
                                styles.sentiment,
                                { color: getSentimentColor(item.feeling) },
                            ]}>
                                {item.feeling.toUpperCase()}
                            </Text>
                            {item.score > 0 && (
                                <Text style={styles.scoreText}>
                                    {(item.score * 100).toFixed(1)}%
                                </Text>
                            )}
                        </View>
                    </View>
                )}
            />

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
        backgroundColor: '#dcf8c6',
        alignSelf: 'flex-end',
        marginRight: 10,
    },
    otherMessage: {
        backgroundColor: '#ffffff',
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
    sentimentContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 5,
    },
    sentiment: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    scoreText: {
        fontSize: 10,
        color: '#666',
        fontWeight: 'bold',
    }
});

export default App;