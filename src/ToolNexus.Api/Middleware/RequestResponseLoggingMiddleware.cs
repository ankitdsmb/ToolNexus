using System.Diagnostics;
using System.Text;
using System.Text.Json;

namespace ToolNexus.Api.Middleware;

public sealed class RequestResponseLoggingMiddleware(RequestDelegate next, ILogger<RequestResponseLoggingMiddleware> logger)
{
    private const int MaxLoggedBodyLength = 4096;

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        var requestBody = await ReadRequestBodyAsync(context.Request);

        var originalBodyStream = context.Response.Body;
        await using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        try
        {
            await next(context);
        }
        finally
        {
            sw.Stop();
            var responseBodyText = await ReadResponseBodyAsync(context.Response);

            logger.LogInformation(
                "HTTP transaction completed {@HttpLog}",
                new
                {
                    method = context.Request.Method,
                    path = context.Request.Path.ToString(),
                    queryString = context.Request.QueryString.ToString(),
                    statusCode = context.Response.StatusCode,
                    elapsedMilliseconds = sw.Elapsed.TotalMilliseconds,
                    requestBody,
                    responseBody = responseBodyText,
                    traceId = context.TraceIdentifier
                });

            responseBody.Position = 0;
            await responseBody.CopyToAsync(originalBodyStream);
            context.Response.Body = originalBodyStream;
        }
    }

    private static async Task<string?> ReadRequestBodyAsync(HttpRequest request)
    {
        if (!request.ContentLength.HasValue || request.ContentLength.Value == 0 || request.Body.CanSeek is false && !request.Body.CanRead)
        {
            return null;
        }

        request.EnableBuffering();
        request.Body.Position = 0;
        using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        request.Body.Position = 0;

        return NormalizeBody(body);
    }

    private static async Task<string?> ReadResponseBodyAsync(HttpResponse response)
    {
        response.Body.Position = 0;
        using var reader = new StreamReader(response.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        return NormalizeBody(body);
    }

    private static string? NormalizeBody(string body)
    {
        if (string.IsNullOrWhiteSpace(body))
        {
            return null;
        }

        if (body.Length <= MaxLoggedBodyLength)
        {
            return body;
        }

        var trimmedBody = body[..MaxLoggedBodyLength];
        return JsonSerializer.Serialize(new { truncated = true, preview = trimmedBody });
    }
}
