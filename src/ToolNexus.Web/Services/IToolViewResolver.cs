namespace ToolNexus.Web.Services;

public interface IToolViewResolver
{
    string ResolveViewName(string slug);
}
