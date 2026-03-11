using Microsoft.AspNetCore.Http;
using ToolNexus.Application.Services;

namespace ToolNexus.Api.Authentication;

public sealed class HttpRequestExecutionContext(IHttpContextAccessor accessor) : IRequestExecutionContext
{
    public string? Method => accessor.HttpContext?.Request.Method;
    public string? ApiKey => accessor.HttpContext?.Request.Headers["X-API-KEY"].FirstOrDefault();
}
