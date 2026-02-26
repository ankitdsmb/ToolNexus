using Microsoft.AspNetCore.Authorization;
using ToolNexus.Web.Areas.Admin.Controllers.Api;
using ToolNexus.Web.Security;
using Xunit;

namespace ToolNexus.Web.Tests;

public sealed class AdminExecutionControlPlaneAuthorizationTests
{
    [Fact]
    public void MutatingOperations_RequireAdminWritePolicy()
    {
        var methods = typeof(ExecutionMonitoringController).GetMethods()
            .Where(x => x.Name is "ResetCaches" or "DrainQueue" or "ReplayDeadLetters");

        foreach (var method in methods)
        {
            var authorize = Assert.Single(method.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true).Cast<AuthorizeAttribute>());
            Assert.Equal(AdminPolicyNames.AdminWrite, authorize.Policy);
        }
    }
}
