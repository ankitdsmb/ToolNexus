namespace ToolNexus.Web.Monitoring;

public interface IStructuredRequestLogger
{
    void Info(HttpContext context, string messageTemplate, params object?[] args);
    void Warning(HttpContext context, string messageTemplate, params object?[] args);
}
