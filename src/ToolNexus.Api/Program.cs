using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using ToolNexus.Api.Infrastructure;
using ToolNexus.Tools.Common;
using ToolNexus.Tools.Base64;
using ToolNexus.Tools.Csv;
using ToolNexus.Tools.Html;
using ToolNexus.Tools.Json;
using ToolNexus.Tools.Minifier;
using ToolNexus.Tools.Xml;

var builder = WebApplication.CreateBuilder(args);

const long maxRequestBodySizeBytes = 5 * 1024 * 1024;

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = maxRequestBodySizeBytes;
});

builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("api", policyOptions =>
    {
        policyOptions.PermitLimit = 100;
        policyOptions.Window = TimeSpan.FromMinutes(1);
        policyOptions.QueueLimit = 0;
    });
});

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

app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        var exceptionHandlerFeature = context.Features.Get<IExceptionHandlerFeature>();
        var exception = exceptionHandlerFeature?.Error;

        var problem = new ProblemDetails
        {
            Status = StatusCodes.Status500InternalServerError,
            Title = "An unexpected error occurred.",
            Detail = app.Environment.IsDevelopment() ? exception?.Message : null,
            Type = "https://httpstatuses.com/500"
        };

        context.Response.StatusCode = problem.Status.Value;
        await context.Response.WriteAsJsonAsync(problem);
    });
});

app.UseRateLimiter();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers().RequireRateLimiting("api");

app.Run();
