# FullStack AI Chat Projesi

Kullanıcıların mesajlaşarak sohbet edebildiği, AI ile duygu analizi yapılan web + mobil uygulama.

## 🚀 Teknolojiler

- **Frontend Web**: React.js + Axios + Vercel
- **Frontend Mobil**: React Native CLI (TypeScript)
- **Backend**: .NET Core 9 + Entity Framework + SQLite + Render
- **AI Servisi**: Hugging Face (distilbert-base-uncased-finetuned-sst-2-english)

## 📦 Proje Yapısı
```
fullstack-ai-chat/
├── frontend/           # React Web (Vercel'de deploy)
│   ├── src/
│   │   ├── App.jsx    # Ana chat ekranı
│   │   └── App.css    # Stil dosyası
│   └── package.json
├── mobile/            # React Native CLI (Android/iOS)
│   ├── App.tsx        # Mobil chat ekranı
│   └── package.json
├── backend/           # .NET Core API (Render'da deploy)
│   ├── Controllers/
│   │   └── MessagesController.cs
│   ├── Data/
│   │   └── AppDbContext.cs
│   ├── Models/
│   │   ├── Message.cs
│   │   └── SentimentRequest.cs
│   └── Program.cs
└── README.md
```

## 🔗 Demo Linkleri

- **Web Chat**: https://full-stack-ai-chat-git-main-okanalats-projects.vercel.app
- **Backend API**: https://fullstackaichat-htei.onrender.com/api/messages
- **Mobil APK**: [İndirme Linki Buraya]

## ⚙️ Kurulum

### Backend (.NET)
```bash
cd backend
dotnet restore
dotnet ef migrations add InitialCreate
dotnet ef database update
dotnet run
```

### Frontend (React)
```bash
cd frontend
npm install
npm start
```

### Mobil (React Native)
```bash
cd mobile
npm install
npx react-native run-android
```

## 🤖 AI Entegrasyonu

Hugging Face'teki `distilbert-base-uncased-finetuned-sst-2-english` modeli kullanılarak duygu analizi yapılıyor:
- **Pozitif/POSITIVE**: Yeşil renk + Skor (0-100%)
- **Negatif/NEGATIVE**: Kırmızı renk + Skor (0-100%)
- **Nötr/NEUTRAL**: Gri renk + Skor (0-100%)

Backend, her mesaj gönderildiğinde Hugging Face API'sine istek atar ve dönen sentiment skorunu veritabanına kaydeder.

## 📝 Dosya Açıklamaları

### Backend (.NET Core)

#### **Program.cs**
- CORS yapılandırması (Vercel frontend'inin backend'e erişimi için)
- Entity Framework DbContext yapılandırması
- SQLite veritabanı migration otomasyonu
- Controller routing ve middleware sıralaması

#### **MessagesController.cs**
- **GET /api/messages**: Tüm mesajları timestamp'e göre sıralı döndürür
- **POST /api/messages**: Mesaj kaydı + Hugging Face AI çağrısı
  - HttpClient ile Hugging Face API'sine istek
  - Timeout handling (20 saniye)
  - Sentiment response parsing (label + score)
  - Veritabanına kayıt

#### **AppDbContext.cs**
- Entity Framework Core DbContext
- Message modelini SQLite'a map eder
- Database connection string yönetimi

#### **Message.cs**
- Mesaj veri modeli
- Alanlar: Id, Name, Description, Feeling, Score, Timestamp

#### **SentimentRequest.cs**
- POST isteği için input modeli
- Alanlar: Name, Description

### Frontend Web (React)

#### **App.jsx**
- **useState hooks**: messages, currentMessage, nickname, isLoading
- **useEffect**: Sayfa yüklendiğinde mesajları çeker
- **fetchMessages()**: Backend'den GET ile mesajları alır
- **handleSend()**: POST ile mesaj gönderir, backend'den gelen response'u listeye ekler
- **getSentimentColor()**: Feeling değerine göre renk döndürür
- Mesaj listesi rendering (name, description, feeling, score)
- Input alanları (rumuz, mesaj) ve gönder butonu

#### **App.css**
- Chat container stilleri
- Mesaj bubble'ları için CSS
- Responsive tasarım

### Mobil (React Native)

#### **App.tsx**
- TypeScript ile yazılmış React Native chat uygulaması
- **Interface Message**: TypeScript tip tanımı
- **İki ekran state'i**: Rumuz giriş ekranı + Chat ekranı
- **FlatList**: Mesaj listesini render eder
- **KeyboardAvoidingView**: Klavye açıldığında ekranı kaydırır
- **Mesaj ayırımı**: Kendi mesajları sağda (yeşil), diğerleri solda (beyaz)
- **5 saniyede bir otomatik yenileme**: setInterval ile getMessages çağrısı
- Duygu ve skor gösterimi (renk kodlu)

## 🛠️ AI Araçları Kullanımı

Bu projede ChatGPT/Claude AI asistanları kullanılarak:
- Hata ayıklama ve debugging
- CORS yapılandırması önerileri
- React Native stil iyileştirmeleri
- TypeScript interface tanımları
- Kod optimizasyonu

### ✍️ Tamamen Manuel Yazılan Kodlar:

#### Backend:
- `MessagesController.cs` - **Tüm metod yapısı**
  - Hugging Face API çağrısı (satır 44-92)
  - HttpClient yapılandırması ve timeout ayarı
  - JSON serileştirme ve sentiment parsing
  - Veritabanı kayıt işlemleri
  - Try-catch hata yönetimi

- `Program.cs` - **CORS politikası**
  - AllowAnyOrigin, AllowAnyHeader, AllowAnyMethod yapılandırması
  - Middleware sıralaması (UseCors → UseRouting → UseAuthorization)

- `AppDbContext.cs` ve `Message.cs` - **Model tanımları**
  - Entity Framework DbSet tanımı
  - SQLite connection string yapılandırması

#### Frontend:
- `App.jsx` - **Core fonksiyonlar**
  - `fetchMessages()` - Axios GET isteği
  - `handleSend()` - Axios POST isteği ve state güncelleme
  - `getSentimentColor()` - Renk mapping mantığı
  - useEffect hook yapısı
  - Error handling (console.error)

#### Mobil:
- `App.tsx` - **State yönetimi ve UI logic**
  - Rumuz giriş ekranı state kontrolü
  - Message interface tanımı
  - getSentimentColor switch-case
  - FlatList renderItem fonksiyonu
  - Mesaj gönderme ve liste güncelleme mantığı

### 🤝 AI Yardımıyla Yazılan Kısımlar:
- React Native stil tanımları (StyleSheet)
- TypeScript tip hataları düzeltmeleri
- README dokümantasyonu
- Bazı JSX component yapıları
- Axios error handling önerileri

## 🎯 Öğrenilenler

- ✅ Full-stack uçtan uca geliştirme (React → .NET → AI)
- ✅ RESTful API tasarımı (GET/POST endpoint'leri)
- ✅ CORS yapılandırması ve güvenlik
- ✅ Entity Framework Core + SQLite kullanımı
- ✅ Hugging Face API entegrasyonu
- ✅ React hooks (useState, useEffect)
- ✅ React Native CLI ile mobil uygulama geliştirme
- ✅ TypeScript interface ve type safety
- ✅ Ücretsiz deployment (Vercel, Render, Hugging Face)
- ✅ Error handling ve timeout yönetimi
- ✅ Axios ile HTTP istekleri
- ✅ Git ve GitHub versiyon kontrolü

## 📊 Proje İstatistikleri

- **Toplam Satır**: ~800+ satır kod
- **Backend**: ~250 satır (.NET C#)
- **Frontend Web**: ~150 satır (React JSX)
- **Frontend Mobil**: ~250 satır (React Native TypeScript)
- **Manuel Yazılan Kod Oranı**: ~%70-75
- **AI Destekli Kod Oranı**: ~%25-30

## 🐛 Bilinen Sorunlar ve Çözümler

1. **CORS Hatası**: `Program.cs`'te UseCors sıralaması düzeltildi
2. **404 Not Found**: Backend URL'i düzeltildi (Render deployment)
3. **Türkçe Karakter Sorunu**: UTF-8 encoding kontrol edildi
4. **Timeout Hatası**: Hugging Face API timeout 20 saniyeye çıkarıldı
5. **Score Gösterimi**: Frontend'e score alanı eklendi (yüzde formatında)

## 📱 APK Oluşturma
```bash
cd mobile/android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

## 🙏 Teşekkürler

Bu proje, stajyer alım süreci için geliştirilmiştir ve full-stack + AI entegrasyonunu öğrenmek amacıyla hazırlanmıştır.
