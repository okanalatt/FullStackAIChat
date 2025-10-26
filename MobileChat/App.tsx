import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
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
    feeling: 'pozitif' | 'nötr' | 'negatif' | 'bekleniyor' | string;
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
                return '#27ae60';
            case 'negatif':
            case 'negative':
                return '#e74c3c';
            case 'nötr':
            case 'neutral':
                return '#95a5a6';
            default:
                return '#f39c12';
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
            console.error("Mesajlar çekilemedi:", error);
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
            const response = await axios.post(`${API_URL}/api/messages`, messageData);

            const savedMessage = {
                ...response.data,
                feeling: response.data.feeling || response.data.Feeling || 'bekleniyor',
                score: response.data.score || response.data.Score || 0
            };

            setMessages(prev => [...prev, savedMessage]);
            setNewMessage('');
        } catch (error: any) {
            console.error('Mesaj gönderme hatasý:', error);
            if (error.response?.status !== 201) {
                Alert.alert('Hata', 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
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
                <Text style={styles.welcomeTitle}>FullStack AI Chat</Text>
                <Text style={styles.welcomeSubtitle}>Sohbete katilmak icin rumuzunuzu girin</Text>

                <TextInput
                    style={styles.rumuzInput}
                    placeholder="Rumuz girin"
                    placeholderTextColor="#95a5a6"
                    value={rumuz}
                    onChangeText={setRumuz}
                    editable={!loading}
                />

                <TouchableOpacity
                    style={[styles.startButton, !rumuz.trim() && styles.buttonDisabled]}
                    onPress={() => {
                        if (rumuz.trim()) {
                            setIsRumuzEntered(true);
                        } else {
                            Alert.alert('Uyari', 'Lutfen bir rumuz girin.');
                        }
                    }}
                    disabled={loading || !rumuz.trim()}
                >
                    <Text style={styles.startButtonText}>Sohbete Basla</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.fullContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>

            <View style={styles.header}>
                <Text style={styles.headerText}>FullStack AI Chat</Text>
                <Text style={styles.rumuzText}>Rumuz: {rumuz}</Text>
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
                    placeholder="Mesajinizi yazin..."
                    placeholderTextColor="#95a5a6"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    editable={!loading}
                />
                <TouchableOpacity
                    style={[styles.sendButton, (!newMessage.trim() || loading) && styles.buttonDisabled]}
                    onPress={handleSendMessage}
                    disabled={!newMessage.trim() || loading}
                >
                    <Text style={styles.sendButtonText}>
                        {loading ? 'Gonderiliyor...' : 'Gonder'}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    fullContainer: {
        flex: 1,
        backgroundColor: '#ecf0f1',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#ecf0f1',
    },
    welcomeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2c3e50',
        marginBottom: 10,
    },
    welcomeSubtitle: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 30,
        textAlign: 'center',
    },
    header: {
        backgroundColor: '#3498db',
        paddingTop: 40,
        paddingBottom: 15,
        paddingHorizontal: 20,
    },
    headerText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 5,
    },
    rumuzText: {
        fontSize: 14,
        color: 'white',
    },
    rumuzInput: {
        width: '80%',
        borderWidth: 2,
        borderColor: '#3498db',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        backgroundColor: 'white',
        fontSize: 16,
        color: '#2c3e50',
    },
    startButton: {
        backgroundColor: '#3498db',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    startButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#bdc3c7',
        padding: 12,
        borderRadius: 8,
        marginRight: 10,
        backgroundColor: 'white',
        color: '#2c3e50',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        borderTopWidth: 1,
        borderColor: '#bdc3c7',
        backgroundColor: 'white',
        alignItems: 'center',
    },
    sendButton: {
        backgroundColor: '#3498db',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    sendButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    buttonDisabled: {
        backgroundColor: '#95a5a6',
        opacity: 0.6,
    },
    messageBubble: {
        padding: 12,
        borderRadius: 10,
        marginVertical: 5,
        maxWidth: '80%',
    },
    myMessage: {
        backgroundColor: '#d1f2eb',
        alignSelf: 'flex-end',
        marginRight: 10,
    },
    otherMessage: {
        backgroundColor: '#ffffff',
        alignSelf: 'flex-start',
        marginLeft: 10,
        borderWidth: 1,
        borderColor: '#ecf0f1',
    },
    messageRumuz: {
        fontWeight: 'bold',
        fontSize: 12,
        marginBottom: 3,
        color: '#2c3e50',
    },
    messageContent: {
        fontSize: 16,
        color: '#2c3e50',
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
        color: '#7f8c8d',
        fontWeight: 'bold',
    }
});

export default App;