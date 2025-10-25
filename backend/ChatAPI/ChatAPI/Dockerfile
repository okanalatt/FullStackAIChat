# 1. Aşama: Build (Derleme)
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# ChatAPI klasöründeki proje dosyasını kopyala
COPY ChatAPI/ChatAPI.csproj ./ChatAPI/
RUN dotnet restore "./ChatAPI/ChatAPI.csproj"

# Geri kalan tüm dosyaları kopyala
COPY ChatAPI/. ./ChatAPI/

# Yayınla (Release)
WORKDIR /src/ChatAPI
RUN dotnet publish "ChatAPI.csproj" -c Release -o /app/publish

# 2. Aşama: Çalıştırma (Runtime)
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ChatAPI.dll"]
