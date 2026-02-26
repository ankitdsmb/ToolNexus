using Microsoft.AspNetCore.Mvc;
using ToolNexus.Api.Controllers.Admin;
using Xunit;

namespace ToolNexus.Api.IntegrationTests;

public sealed class ArchitectureEvolutionControllerContractTests
{
    [Fact]
    public void ArchitectureEvolutionController_UsesExpectedRoute()
    {
        var route = typeof(ArchitectureEvolutionController)
            .GetCustomAttributes(typeof(RouteAttribute), inherit: false)
            .Cast<RouteAttribute>()
            .Single();

        Assert.Equal("api/admin/architecture/evolution", route.Template);

        var generate = typeof(ArchitectureEvolutionController).GetMethod("GenerateRecommendations");
        Assert.NotNull(generate);
    }
}
