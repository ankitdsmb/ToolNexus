FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ToolNexus.sln ./
COPY src/ToolNexus.Api/ToolNexus.Api.csproj src/ToolNexus.Api/
COPY src/ToolNexus.Application/ToolNexus.Application.csproj src/ToolNexus.Application/
COPY src/ToolNexus.Domain/ToolNexus.Domain.csproj src/ToolNexus.Domain/
COPY src/ToolNexus.Infrastructure/ToolNexus.Infrastructure.csproj src/ToolNexus.Infrastructure/

RUN dotnet restore src/ToolNexus.Api/ToolNexus.Api.csproj

COPY . .

RUN dotnet publish src/ToolNexus.Api/ToolNexus.Api.csproj \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false \
    /p:PublishTrimmed=true \
    /p:PublishReadyToRun=true \
    /p:SelfContained=false \
    /p:GenerateDocumentationFile=false \
    /p:DebugType=None \
    /p:DebugSymbols=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_EnableDiagnostics=0

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --spider -q http://localhost:8080/health || exit 1

USER appuser

ENTRYPOINT ["dotnet", "ToolNexus.Api.dll"]
