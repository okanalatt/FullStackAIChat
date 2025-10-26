# FullStack AI Chat Projesi

Kullanıcıların mesajlaşarak sohbet edebildiği, AI ile duygu analizi yapılan web + mobil uygulama.

## 🚀 Teknolojiler

- **Frontend Web**: React.js + Axios + Vercel
- **Frontend Mobil**: React Native CLI (TypeScript)
- **Backend**: .NET Core 9 + Entity Framework + SQLite + Docker + Render
- **AI Servisi**: Hugging Face (distilbert-base-uncased-finetuned-sst-2-english)

## 📦 Proje Yapısı
```
FullStackAIChat/
├── .git/                  # Git versiyon kontrolü
├── .github/               # GitHub yapılandırması
├── ai-service/            # AI servis dosyaları
├── backend/               # .NET Core API (Render'da deploy)
│   ├── ChatAPI/
│   │   ├── bin/
│   │   ├── Controllers/
│   │   │   └── MessagesController.cs
│   │   ├── Data/
│   │   │   └── AppDbContext.cs
│   │   ├── Migrations/
│   │   ├── Models/
│   │   │   ├── Message.cs
│   │   │   ├── SentimentRequest.cs
│   │   │   └── SentimentResponse.cs
│   │   ├── obj/
│   │   ├── Properties/
│   │   ├── appsettings.json
│   │   ├── appsettings.Development.json
│   │   ├── ChatAPI.csproj
│   │   ├── ChatAPI.http
│   │   ├── ChatDB (SQLite database)
│   │   ├── Dockerfile
│   │   └── Program.cs
├── frontend/              # React Web (Vercel'de deploy)
│   └── chat-web/
│       ├── node_modules/
│       ├── public/
│       ├── src/
│       │   ├── App.css
│       │   └── App.jsx
│       ├── package.json
│       └── README.md
├── MobileChat/            # React Native CLI (Android/iOS)
│   ├── android/
│   ├── ios/
│   ├── node_modules/
│   ├── App.tsx
│   └── package.json
├── .gitignore
└── README.md
```

## 🔗 Demo Linkleri

- **Web Chat**: https://full-stack-ai-chat-git-main-okanalats-projects.vercel.app
- **Backend API**: https://fullstackaichat-htei.onrender.com/api/messages
- **Mobil APK**: 

## ⚙️ Kurulum

### Backend (.NET)
```bash
cd backend/ChatAPI
dotnet restore
dotnet ef database update
dotnet run
```

### Frontend (React)
```bash
cd frontend/chat-web
npm install
npm start
```

### Mobil (React Native)
```bash
cd MobileChat
npm install
npx react-native run-android
```

## 🐳 Docker ile Backend Deploy (Render)

Render platformu doğrudan .NET desteği sunmadığı için **Dockerfile** ile containerize edildi:

### Dockerfile
```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app
COPY *.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish -c Release -o out

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/out .
EXPOSE 8080
ENTRYPOINT ["dotnet", "ChatAPI.dll"]
```

### Render Deploy Adımları:
1. GitHub'a push yap
2. Render.com'da "New Web Service" oluştur
3. Repo'yu bağla
4. **Build Command**: (Docker otomatik algılanır)
5. **Start Command**: (Dockerfile'dan otomatik çalışır)
6. Environment Variables ekle (varsa)
7. Deploy!

**Sorun:** Render'da .NET doğrudan desteklenmediği için ilk başta 404 hatası alındı.
**Çözüm:** Dockerfile oluşturularak backend containerize edildi ve başarıyla deploy edildi.

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

#### **SentimentRequest.cs & SentimentResponse.cs**
- API request/response modelleri
- Hugging Face'ten dönen JSON'u parse etmek için

#### **Dockerfile**
- Multi-stage build (SDK + Runtime)
- .NET 9.0 base image
- Port 8080 expose
- Render deployment için gerekli

### Frontend Web (React)

#### **App.jsx**
- **useState hooks**: messages, currentMessage, nickname, isLoading
- **useEffect**: Sayfa yüklendiğinde mesajları çeker
- **fetchMessages()**: Backend'den GET ile mesajları alır
- **handleSend()**: POST ile mesaj gönderir, backend'den gelen response'u listeye ekler
- **getSentimentColor()**: Feeling değerine göre renk döndürür
- Mesaj listesi rendering (name, description, feeling, score)

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

## 🛠️ AI Araçları ve Manuel Kod Dengesi

Bu projede **ChatGPT/Claude AI asistanları** aktif olarak kullanıldı:

### 🤖 AI Yardımıyla Yazılan Kısımlar (~%50):
- Başlangıç kod şablonları ve proje yapısı
- CORS yapılandırması önerileri
- Dockerfile oluşturma ve Docker komutları
- React Native stil tanımları (StyleSheet)
- TypeScript interface tanımları ve tip düzeltmeleri
- Error handling pattern'leri
- README dokümantasyonu
- Axios kullanımı ve HTTP request örnekleri
- Entity Framework migration komutları

### ✍️ Manuel Yazılan/Öğrenilerek Geliştirilen Kodlar (~%50):

#### Backend:
- Hugging Face API entegrasyonu mantığı
- HttpClient timeout ve error handling stratejisi
- Sentiment response parsing ve mapping
- CORS policy yapılandırması ve test edilmesi
- Database model ilişkileri ve migrations
- API endpoint tasarımı

#### Frontend:
- State yönetimi mantığı (useState, useEffect)
- Mesaj gönderme ve liste güncelleme akışı
- getSentimentColor fonksiyon mantığı
- UI/UX tasarım kararları
- Axios isteklerinin entegrasyonu

#### Mobil:
- Rumuz giriş ekranı state kontrolü
- FlatList renderItem özelleştirmeleri
- Mesaj ayırımı mantığı (sol/sağ bubble)
- Otomatik yenileme interval kurulumu

### 🔧 Hata Ayıklama Süreci (Tamamen Manuel):
- CORS hatası çözümü (UseCors sıralaması)
- 404 Not Found backend URL düzeltmesi
- Render deployment Dockerfile problemi
- Türkçe karakter encoding sorunları
- Score gösterimi eklenmesi
- Timeout ayarlamaları

## 📊 Proje İstatistikleri

- **Toplam Satır**: ~800+ satır kod
- **Backend**: ~300 satır (.NET C#)
- **Frontend Web**: ~150 satır (React JSX)
- **Frontend Mobil**: ~250 satır (React Native TypeScript)
- **Dockerfile + Config**: ~50 satır
- **Manuel/Öğrenilerek Yazılan**: ~%50
- **AI Destekli**: ~%50

## 🎯 Öğrenilenler

- ✅ Full-stack uçtan uca geliştirme (React → .NET → AI)
- ✅ RESTful API tasarımı (GET/POST endpoint'leri)
- ✅ CORS yapılandırması ve güvenlik
- ✅ Entity Framework Core + SQLite kullanımı
- ✅ **Docker containerization ve Dockerfile yazımı**
- ✅ **Render deployment süreçleri**
- ✅ Hugging Face API entegrasyonu
- ✅ React hooks (useState, useEffect)
- ✅ React Native CLI ile mobil uygulama geliştirme
- ✅ TypeScript interface ve type safety
- ✅ Vercel deployment ve environment variables
- ✅ Error handling ve timeout yönetimi
- ✅ Axios ile HTTP istekleri
- ✅ Git ve GitHub versiyon kontrolü
- ✅ AI asistanları ile verimli kod geliştirme

## 🐛 Karşılaşılan Sorunlar ve Çözümler

| Sorun | Çözüm |
|-------|-------|
| **CORS Hatası** | `Program.cs`'te `UseCors` middleware sıralaması düzeltildi |
| **404 Not Found** | Backend URL'i düzeltildi (Render deployment linki güncellendi) |
| **Render .NET Desteği Yok** | **Dockerfile oluşturularak containerize edildi** |
| **Türkçe Karakter Sorunu** | UTF-8 encoding kontrol edildi, placeholder metinleri düzeltildi |
| **Timeout Hatası** | Hugging Face API timeout 20 saniyeye çıkarıldı |
| **Score Gösterimi Eksik** | Frontend ve mobilde score alanı eklendi (yüzde formatında) |
| **Gereksiz Alert** | Mobil uygulamada try-catch düzenlendi, sadece gerçek hatalarda alert |

## 📱 APK Oluşturma
```bash
cd MobileChat/android
./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

## 🔐 Environment Variables

### Backend (Render)
```
AIServices__ApiKey=YOUR_HUGGINGFACE_API_KEY
AIServices__Model=distilbert-base-uncased-finetuned-sst-2-english
```

### Frontend (Vercel)
```
REACT_APP_API_URL=https://fullstackaichat-htei.onrender.com
```

## 🙏 Teşekkürler

Bu proje, stajyer alım süreci için geliştirilmiştir ve full-stack + AI entegrasyonunu öğrenmek amacıyla hazırlanmıştır. Geliştirme sürecinde AI araçları aktif kullanılmış, ancak tüm kod mantığı anlaşılarak ve test edilerek entegre edilmiştir.

---

**Geliştirici**: Okan Alat Github: okanalatt 
**Proje Süresi**: 5 gun  
**Deployment**: Vercel + Render + Hugging Face
