using System.Reflection;
using ToolNexus.Application;
using ToolNexus.Domain;
using ToolNexus.Infrastructure; // Only if needed for options binding

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Application Layer
builder.Services.AddApplication();

// -----------------------------
// Cache Configuration
// -----------------------------
var cacheOptions = builder.Configuration
    .GetSection("ToolResultCache")
    .Get<ToolResultCacheOptions>() 
    ?? new ToolResultCacheOptions();

if (cacheOptions.MaxEntries <= 0)
{
    cacheOptions.MaxEntries = ToolResultCacheOptions.DefaultMaxEntries;
}

builder.Services.AddMemoryCache(options =>
{
    options.SizeLimit = cacheOptions.MaxEntries;
});

builder.Services.Configure<ToolResultCacheOptions>(options =>
{
    options.MaxEntries = cacheOptions.MaxEntries;
});

// -----------------------------
// Infrastructure Executors (Reflection Based)
// -----------------------------
RegisterInfrastructureExecutors(builder.Services);

// Factory & Execution Service
builder.Services.AddScoped<IToolExecutorFactory, ToolExecutorFactory>();
builder.Services.AddScoped<IToolExecutionService, ToolExecutionService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();

app.Run();

static void RegisterInfrastructureExecutors(IServiceCollection services)
{
    var infrastructureAssembly = Assembly.Load("ToolNexus.Infrastructure");

    var executorTypes = infrastructureAssembly
        .GetTypes()
        .Where(t =>
            t is { IsAbstract: false, IsInterface: false } &&
            typeof(IToolExecutor).IsAssignableFrom(t));

    foreach (var executorType in executorTypes)
    {
        services.AddScoped(typeof(IToolExecutor), executorType);
    }
}