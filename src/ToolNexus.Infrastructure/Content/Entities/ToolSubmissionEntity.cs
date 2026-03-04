namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ToolSubmissionEntity
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string AuthorId { get; set; } = string.Empty;
    public string Status { get; set; } = ToolSubmissionStatus.Pending;
    public DateTimeOffset SubmittedAt { get; set; }
    public string Manifest { get; set; } = "{}";
    public string Schema { get; set; } = "{}";
    public string RuntimeModule { get; set; } = string.Empty;
    public string Template { get; set; } = string.Empty;
}

public static class ToolSubmissionStatus
{
    public const string Pending = "pending";
    public const string Approved = "approved";
    public const string Rejected = "rejected";
}
