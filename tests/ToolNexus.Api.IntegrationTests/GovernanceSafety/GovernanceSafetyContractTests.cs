using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using PublicToolsController = ToolNexus.Api.Controllers.ToolsController;
using ToolNexus.Api.Controllers.Admin;
using ToolNexus.Api.Authentication;
using ToolNexus.Application.Models;
using ToolNexus.Application.Services.Pipeline.Steps;
using Xunit;

namespace ToolNexus.Api.IntegrationTests.GovernanceSafety;

public sealed class GovernanceSafetyContractTests
{
    [Fact]
    public void ExecuteRequest_Contract_DoesNotExposeAuthorityOverrideInputs()
    {
        var requestProperties = typeof(PublicToolsController.ExecuteToolRequest)
            .GetProperties(BindingFlags.Instance | BindingFlags.Public)
            .Select(x => x.Name)
            .ToArray();

        Assert.DoesNotContain("Authority", requestProperties, StringComparer.OrdinalIgnoreCase);
        Assert.DoesNotContain("GovernanceDecisionId", requestProperties, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("Input", requestProperties, StringComparer.Ordinal);
        Assert.Contains("Options", requestProperties, StringComparer.Ordinal);
    }

    [Fact]
    public void PolicyEnforcement_ExecutesBeforeRuntimeExecutionStep()
    {
        Assert.True(new PolicyEnforcementStep(null!, null!, null!).Order < new ExecutionStep(null!, null!).Order);
    }

    [Fact]
    public void AdminMutationEndpoints_RequireAdminWritePolicy()
    {
        var mutationMethods = typeof(ExecutionController).GetMethods(BindingFlags.Instance | BindingFlags.Public)
            .Where(x => x.GetCustomAttributes<HttpMethodAttribute>(inherit: true).Any(attr =>
                attr.HttpMethods.Any(method => method is "POST" or "PUT" or "PATCH" or "DELETE")))
            .ToArray();

        Assert.NotEmpty(mutationMethods);

        foreach (var method in mutationMethods)
        {
            var authorize = method.GetCustomAttributes<AuthorizeAttribute>(inherit: true).ToArray();
            Assert.Contains(authorize, x => x.Policy == AdminPolicyNames.AdminWrite);
        }
    }
}
