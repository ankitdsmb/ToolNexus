using System.Text.Json;
using System.Text.Json.Nodes;
using ToolNexus.Application.Models;
using Xunit;

namespace ToolNexus.Api.IntegrationTests.CssIntelligence;

public sealed class CssIntelligenceContractTests
{
    private static readonly JsonSerializerOptions ApiJsonOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public void ToolExecutionResponse_UsesExpectedJsonEnvelopeSchema()
    {
        var response = CreateSuccessfulResponse();

        var envelope = SerializeToObject(response);

        Assert.True(envelope.ContainsKey("success"));
        Assert.True(envelope.ContainsKey("output"));
        Assert.True(envelope.ContainsKey("error"));
        Assert.True(envelope.ContainsKey("notFound"));
        Assert.True(envelope.ContainsKey("insight"));
        Assert.True(envelope.ContainsKey("runtimeIdentity"));
    }

    [Fact]
    public void ToolExecutionResponse_ContractShape_IsStableForSuccessCase()
    {
        var response = CreateSuccessfulResponse();

        var envelope = SerializeToObject(response);

        Assert.True(envelope["success"]!.GetValue<bool>());
        Assert.Equal(".tool-card { display: grid; }", envelope["output"]!.GetValue<string>());
        Assert.Null(envelope["error"]);
        Assert.False(envelope["notFound"]!.GetValue<bool>());
    }

    [Fact]
    public void ToolExecutionResponse_ContainsRuntimeIdentity_WhenProvided()
    {
        var response = CreateSuccessfulResponse();

        var envelope = SerializeToObject(response);
        var runtimeIdentity = Assert.IsType<JsonObject>(envelope["runtimeIdentity"]);

        Assert.Equal("css-intelligence", runtimeIdentity["runtimeType"]!.GetValue<string>());
        Assert.Equal("local", runtimeIdentity["adapter"]!.GetValue<string>());
        Assert.Equal("mock", runtimeIdentity["workerType"]!.GetValue<string>());
        Assert.False(runtimeIdentity["fallbackUsed"]!.GetValue<bool>());
        Assert.Equal("test-suite", runtimeIdentity["executionAuthority"]!.GetValue<string>());
    }

    [Fact]
    public void ToolExecutionResponse_ErrorEnvelope_ContainsExpectedFailureStructure()
    {
        var response = new ToolExecutionResponse(
            Success: false,
            Output: string.Empty,
            Error: "css_parse_error",
            NotFound: false,
            RuntimeIdentity: new RuntimeIdentity("css-intelligence", "local", "mock", true, "test-suite"));

        var envelope = SerializeToObject(response);

        Assert.False(envelope["success"]!.GetValue<bool>());
        Assert.Equal(string.Empty, envelope["output"]!.GetValue<string>());
        Assert.Equal("css_parse_error", envelope["error"]!.GetValue<string>());
        Assert.False(envelope["notFound"]!.GetValue<bool>());

        var runtimeIdentity = Assert.IsType<JsonObject>(envelope["runtimeIdentity"]);
        Assert.True(runtimeIdentity["fallbackUsed"]!.GetValue<bool>());
    }

    private static ToolExecutionResponse CreateSuccessfulResponse()
        => new(
            Success: true,
            Output: ".tool-card { display: grid; }",
            Error: null,
            NotFound: false,
            RuntimeIdentity: new RuntimeIdentity("css-intelligence", "local", "mock", false, "test-suite"));

    private static JsonObject SerializeToObject(ToolExecutionResponse response)
        => Assert.IsType<JsonObject>(JsonSerializer.SerializeToNode(response, ApiJsonOptions));
}
