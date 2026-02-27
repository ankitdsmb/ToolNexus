using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Areas.Admin.Controllers.Api;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class ExecutionLedgerApiControllerContractTests
{
    [Fact]
    public void ExecutionLedgerApiController_ExposesAdminRoute()
    {
        var route = typeof(ExecutionsController)
            .GetCustomAttributes(typeof(RouteAttribute), inherit: false)
            .OfType<RouteAttribute>()
            .Single();

        Assert.Equal("api/admin/executions", route.Template);
    }
}
