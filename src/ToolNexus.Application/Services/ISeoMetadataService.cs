using ToolNexus.Application.Models;

namespace ToolNexus.Application.Services;

public interface ISeoMetadataService
{
    SeoPageMetadata BuildToolPageMetadata(ToolDefinition tool, string baseUrl);
}
