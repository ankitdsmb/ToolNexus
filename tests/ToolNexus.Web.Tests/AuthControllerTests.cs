using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Controllers;

namespace ToolNexus.Web.Tests;

public sealed class AuthControllerTests
{
    [Fact]
    public void Login_WhenUnauthenticated_ReturnsLoginPageWithHttp200()
    {
        var controller = CreateController(isAuthenticated: false);

        var result = controller.Login();

        var content = Assert.IsType<ContentResult>(result);
        Assert.Equal(StatusCodes.Status200OK, content.StatusCode ?? StatusCodes.Status200OK);
        Assert.Equal("text/html", content.ContentType);
        Assert.Contains("Login", content.Content ?? string.Empty, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Login_WhenAuthenticated_RedirectsToHome()
    {
        var controller = CreateController(isAuthenticated: true);

        var result = controller.Login();

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        Assert.Equal("Home", redirect.ControllerName);
    }

    private static AuthController CreateController(bool isAuthenticated)
    {
        var controller = new AuthController();
        var identity = new ClaimsIdentity();
        if (isAuthenticated)
        {
            identity = new ClaimsIdentity([new Claim(ClaimTypes.Name, "tester")], "Cookies");
        }

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(identity)
            }
        };

        return controller;
    }
}
