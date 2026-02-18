using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using ToolNexus.Api.Middleware;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class SanitizeErrorMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_DoesNotLeakInternalExceptionMessage()
    {
        var middleware = new SanitizeErrorMiddleware(
            _ => throw new InvalidOperationException("database password leaked"),
            NullLogger<SanitizeErrorMiddleware>.Instance);

        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();

        await middleware.InvokeAsync(context);

        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var response = await JsonSerializer.DeserializeAsync<SanitizeErrorMiddleware.ApiErrorResponse>(context.Response.Body, options);

        Assert.NotNull(response);
        Assert.Equal("internal_error", response!.Code);
        Assert.DoesNotContain("database password leaked", response.Message, StringComparison.OrdinalIgnoreCase);
    }
}
