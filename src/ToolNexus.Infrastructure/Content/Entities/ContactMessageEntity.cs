namespace ToolNexus.Infrastructure.Content.Entities;

public sealed class ContactMessageEntity
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public string Status { get; set; } = ContactMessageStatus.New;
}

public static class ContactMessageStatus
{
    public const string New = "new";
    public const string Read = "read";
    public const string Closed = "closed";
}
