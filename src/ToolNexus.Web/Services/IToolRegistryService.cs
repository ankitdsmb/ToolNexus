namespace ToolNexus.Web.Services;

public interface IToolRegistryService
{
    ToolDescriptor? GetBySlug(string slug);
    IReadOnlyCollection<ToolDescriptor> GetAll();
}
