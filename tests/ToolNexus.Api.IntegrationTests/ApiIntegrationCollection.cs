using Xunit;

namespace ToolNexus.Api.IntegrationTests;

[CollectionDefinition("ApiIntegration", DisableParallelization = true)]
public sealed class ApiIntegrationCollection : ICollectionFixture<ApiIntegrationTestFactory>
{
}
