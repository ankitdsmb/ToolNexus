using System.ComponentModel.DataAnnotations;
using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public sealed class ExecutionPolicyService(IExecutionPolicyRepository repository) : IExecutionPolicyService
{
    private static readonly UpdateToolExecutionPolicyRequest DefaultRequest = new("Local", 30, 120, 1_000_000, true);

    public async Task<ToolExecutionPolicyModel> GetBySlugAsync(string slug, CancellationToken cancellationToken = default)
        => await repository.GetBySlugAsync(slug, cancellationToken) ?? BuildDefault(0, slug);

    public Task<ToolExecutionPolicyModel?> GetByToolIdAsync(int toolId, CancellationToken cancellationToken = default)
        => repository.GetByToolIdAsync(toolId, cancellationToken);

    public async Task<ToolExecutionPolicyModel> UpdateBySlugAsync(string slug, UpdateToolExecutionPolicyRequest request, CancellationToken cancellationToken = default)
    {
        Validate(request);
        var updated = await repository.UpsertBySlugAsync(slug, request, cancellationToken);
        if (updated is null)
        {
            throw new ValidationException($"Tool '{slug}' not found.");
        }

        return updated;
    }

    public void Invalidate(string slug)
    {
        // no-op here; infrastructure cache invalidates during repository updates.
    }

    private static ToolExecutionPolicyModel BuildDefault(int toolId, string slug)
        => new(toolId, slug, DefaultRequest.ExecutionMode, DefaultRequest.TimeoutSeconds, DefaultRequest.MaxRequestsPerMinute, DefaultRequest.MaxInputSize, DefaultRequest.IsExecutionEnabled);

    private static void Validate(UpdateToolExecutionPolicyRequest request)
    {
        var modes = new[] { "Local", "Remote", "Sandbox", "Disabled" };
        if (!modes.Contains(request.ExecutionMode, StringComparer.OrdinalIgnoreCase))
        {
            throw new ValidationException("ExecutionMode must be one of: Local, Remote, Sandbox, Disabled.");
        }

        if (request.TimeoutSeconds <= 0)
        {
            throw new ValidationException("TimeoutSeconds must be greater than zero.");
        }

        if (request.MaxRequestsPerMinute <= 0)
        {
            throw new ValidationException("MaxRequestsPerMinute must be greater than zero.");
        }

        if (request.MaxInputSize <= 0)
        {
            throw new ValidationException("MaxInputSize must be greater than zero.");
        }
    }
}
