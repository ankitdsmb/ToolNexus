using System.Reflection;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Http.Features;
using ToolNexus.Api.Middleware;
using ToolNexus.Application;

var builder = WebApplication.CreateBuilder(args);
var maxRequestBodySizeBytes = 5 * 1024 * 1024;

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = maxRequestBodySizeBytes;
});

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = maxRequestBodySizeBytes;
});

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});
builder.Services.AddApplication(builder.Configuration);

var infrastructureAssembly = Assembly.Load("ToolNexus.Infrastructure");
builder.Services.AddToolExecutorsFromAssembly(infrastructureAssembly);

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/swagger/v1/swagger.json", "ToolNexus API v1");
});

app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseRateLimiter();
app.MapControllers();

app.Run();
