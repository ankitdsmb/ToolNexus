using Microsoft.Extensions.Options;
using System.Security.Claims;
using ToolNexus.Web.Options;
using ToolNexus.Web.Security;
using Xunit;

namespace ToolNexus.Web.Tests;

public class InternalUserPrincipalFactoryTests
{
    [Fact]
    public void CreatePrincipal_WithDefaultOptions_ThrowsException()
    {
        // Arrange
        // This simulates empty configuration where defaults are used (which are now empty/secure)
        var options = new InternalAuthOptions();
        var optionsWrapper = Microsoft.Extensions.Options.Options.Create(options);
        var factory = new InternalUserPrincipalFactory(optionsWrapper);

        // Act & Assert
        // SECURE BEHAVIOR: Throws exception because UserId is missing
        var exception = Assert.Throws<InvalidOperationException>(() => factory.CreatePrincipal());
        Assert.Equal("Internal authentication is not configured.", exception.Message);
    }

    [Fact]
    public void CreatePrincipal_WithValidOptions_ReturnsPrincipal()
    {
        // Arrange
        var options = new InternalAuthOptions
        {
            UserId = "test-user",
            DisplayName = "Test User",
            ToolPermissions = new[] { "tool:access" },
            SecurityLevels = new[] { "Level1" }
        };
        var optionsWrapper = Microsoft.Extensions.Options.Options.Create(options);
        var factory = new InternalUserPrincipalFactory(optionsWrapper);

        // Act
        var principal = factory.CreatePrincipal();

        // Assert
        Assert.NotNull(principal);
        var identity = principal.Identity as ClaimsIdentity;
        Assert.NotNull(identity);
        Assert.Equal("test-user", identity.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        Assert.Equal("Test User", identity.FindFirst(ClaimTypes.Name)?.Value);
        Assert.Contains(identity.Claims, c => c.Type == "tool_permission" && c.Value == "tool:access");
        Assert.Contains(identity.Claims, c => c.Type == "tool_security_level" && c.Value == "Level1");
    }
}
