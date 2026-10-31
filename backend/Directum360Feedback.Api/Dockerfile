
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY backend/ ./backend/

RUN dotnet restore backend/Directum360Feedback.Api/Directum360Feedback.Api.csproj

RUN dotnet publish backend/Directum360Feedback.Api/Directum360Feedback.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

COPY --from=build /app/publish/ ./

RUN mkdir -p /app/data && chown -R $APP_UID:$APP_UID /app/data

USER $APP_UID

EXPOSE 8080

ENTRYPOINT ["dotnet", "Directum360Feedback.Api.dll"]