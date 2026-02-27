# ToolNexus

## Local PostgreSQL Setup for ToolNexus

ToolNexus local runtime is PostgreSQL-first and startup will fail fast if PostgreSQL is unavailable.

### 1) Start PostgreSQL

Use the repository compose file:

```bash
docker compose up -d postgres
```

Default local credentials:

- Host: `localhost`
- Port: `5432`
- Database: `ToolNexus`
- Username: `toolnexus`
- Password: `toolnexus_dev`

### 2) Verify database configuration

Both `ToolNexus.Api` and `ToolNexus.Web` use the `Database` section:

- `Database:Provider` = `PostgreSQL`
- `Database:ConnectionString` = your PostgreSQL connection string
- `Database:RunMigrationOnStartup` = `true` for local first-run

Environment variable override examples:

```bash
export Database__Provider=PostgreSQL
export Database__ConnectionString='Host=localhost;Port=5432;Database=ToolNexus;Username=toolnexus;Password=toolnexus_dev;SSL Mode=Disable'
export Database__RunMigrationOnStartup=true
```

### 3) Run API and Web

```bash
dotnet run --project src/ToolNexus.Api
dotnet run --project src/ToolNexus.Web
```

On startup, migration diagnostics will log connectivity target and migration status.

### 4) Optional development fallback connection

For development only, you can enable a secondary PostgreSQL fallback connection if the primary endpoint is temporarily unavailable:

```bash
export Database__EnableDevelopmentFallbackConnection=true
export Database__DevelopmentFallbackConnectionString='Host=localhost;Port=5432;Database=ToolNexus_DevFallback;Username=toolnexus;Password=toolnexus_dev;SSL Mode=Disable'
```

If both primary and fallback are unavailable, startup emits a clear error and aborts.
