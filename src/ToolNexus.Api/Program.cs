using ToolNexus.Api.Infrastructure;
using ToolNexus.Tools.Common;
using ToolNexus.Tools.Base64;
using ToolNexus.Tools.Csv;
using ToolNexus.Tools.Html;
using ToolNexus.Tools.Json;
using ToolNexus.Tools.Minifier;
using ToolNexus.Tools.Xml;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddScoped<IToolExecutor, JsonToolExecutor>();
builder.Services.AddScoped<IToolExecutor, XmlToolExecutor>();
builder.Services.AddScoped<IToolExecutor, CsvToolExecutor>();
builder.Services.AddScoped<IToolExecutor, Base64ToolExecutor>();
builder.Services.AddScoped<IToolExecutor, HtmlToolExecutor>();
builder.Services.AddScoped<IToolExecutor, MinifierToolExecutor>();
builder.Services.AddScoped<IToolExecutorFactory, ToolExecutorFactory>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();

app.Run();
