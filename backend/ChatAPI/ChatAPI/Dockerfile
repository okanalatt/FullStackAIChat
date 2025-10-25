
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build 
WORKDIR /src



COPY ChatAPI.csproj .
RUN dotnet restore


COPY . .

WORKDIR /src
RUN dotnet publish -c Release -o /app/publish


FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:$PORT 
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "ChatAPI.dll"]