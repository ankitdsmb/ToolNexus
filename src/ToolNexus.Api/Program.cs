using System.Reflection;
using ToolNexus.Application;
using ToolNexus.Domain;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddApplication();

RegisterInfrastructureExecutors(builder.Services);

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
        .Where(t => t is { IsAbstract: false, IsInterface: false } && typeof(IToolExecutor).IsAssignableFrom(t));

    foreach (var executorType in executorTypes)
    {
        services.AddScoped(typeof(IToolExecutor), executorType);
    }
}
