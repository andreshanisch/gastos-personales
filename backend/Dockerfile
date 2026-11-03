# Imagen para desplegar la API (Render, Fly.io, etc.)
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Gastos.Api/Gastos.Api.csproj Gastos.Api/
RUN dotnet restore Gastos.Api/Gastos.Api.csproj
COPY Gastos.Api/ Gastos.Api/
RUN dotnet publish Gastos.Api/Gastos.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
# La app escucha en el puerto 8080 (valor por defecto de las imágenes de .NET)
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "Gastos.Api.dll"]
