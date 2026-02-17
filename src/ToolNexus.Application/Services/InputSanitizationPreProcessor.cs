using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ToolNexus.Application.Models;
using ToolNexus.Application.Options;

namespace ToolNexus.Application.Services;

public sealed class InputSanitizationPreProcessor(
    IOptions<InputSanitizationOptions> options,
    ILogger<InputSanitizationPreProcessor> logger) : IToolExecutionPreProcessor
{
    private readonly InputSanitizationOptions _options = options.Value;

    public ValueTask<ToolExecutionRequest> ProcessAsync(
        ToolExecutionRequest request,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (request.Input.Length > _options.MaxInputCharacters)
        {
            logger.LogWarning(
                "Rejected oversized tool input for slug {Slug}. Length: {Length}.",
                request.Slug,
                request.Input.Length);

            throw new InputSanitizationException(
                "Input exceeds the maximum allowed payload size.");
        }

        if (!IsValidUnicode(request.Input))
        {
            logger.LogWarning(
                "Rejected invalid UTF input for slug {Slug}.",
                request.Slug);

            throw new InputSanitizationException(
                "Input contains invalid UTF sequences.");
        }

        string sanitizedInput = SanitizeInput(
            request.Input,
            _options.RejectControlCharacters);

        if (ReferenceEquals(sanitizedInput, request.Input))
        {
            return ValueTask.FromResult(request);
        }

        return ValueTask.FromResult(request with { Input = sanitizedInput });
    }

    private static string SanitizeInput(string input, bool stripControlCharacters)
    {
        StringBuilder? builder = null;

        for (int i = 0; i < input.Length; i++)
        {
            char current = input[i];

            bool shouldStrip =
                current == '\0' ||
                (stripControlCharacters &&
                 char.IsControl(current) &&
                 !IsAllowedControlCharacter(current));

            if (!shouldStrip)
            {
                if (builder is not null)
                {
                    builder.Append(current);
                }

                continue;
            }

            builder ??= new StringBuilder(input.Length);

            if (i > 0 && builder.Length == 0)
            {
                builder.Append(input, 0, i);
            }
        }

        return builder?.ToString() ?? input;
    }

    private static bool IsAllowedControlCharacter(char current)
    {
        return current is '\r' or '\n' or '\t';
    }

    // ✅ FIXED METHOD
    private static bool IsValidUnicode(string value)
    {
        int index = 0;

        while (index < value.Length)
        {
            if (!Rune.TryGetRuneAt(value, index, out Rune rune))
            {
                return false;
            }

            index += rune.Utf16SequenceLength;
        }

        return true;
    }
}
