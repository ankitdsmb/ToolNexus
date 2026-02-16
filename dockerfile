# -----------------------------
# Stage 1: Build
# -----------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj first for layer caching
COPY ToolNexus.Api/ToolNexus.Api.csproj ToolNexus.Api/
COPY ToolNexus.Application/ToolNexus.Application.csproj ToolNexus.Application/
COPY ToolNexus.Domain/ToolNexus.Domain.csproj ToolNexus.Domain/
COPY ToolNexus.Infrastructure/ToolNexus.Infrastructure.csproj ToolNexus.Infrastructure/

RUN dotnet restore ToolNexus.Api/ToolNexus.Api.csproj

# Copy everything else
COPY . .

RUN dotnet publish ToolNexus.Api/ToolNexus.Api.csproj \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

# -----------------------------
# Stage 2: Runtime
# -----------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

# Security: create non-root user
RUN adduser --disabled-password --gecos "" appuser
USER appuser

# Copy published output
COPY --from=build /app/publish .

# Optimize for small memory footprint
ENV DOTNET_gcServer=1
ENV DOTNET_GCDynamicAdaptationMode=1
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "ToolNexus.Api.dll"]
