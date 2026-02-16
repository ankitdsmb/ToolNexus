# ----------------------------
# Stage 1: Build
# ----------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copy everything
COPY . ./

# Restore & publish
RUN dotnet restore
RUN dotnet publish ToolNexus.Api/ToolNexus.Api.csproj -c Release -o /publish

# ----------------------------
# Stage 2: Runtime
# ----------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

COPY --from=build /publish .

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

ENTRYPOINT ["dotnet", "ToolNexus.Api.dll"]
