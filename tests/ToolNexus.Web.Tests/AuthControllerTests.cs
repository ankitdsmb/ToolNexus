using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Controllers;
using ToolNexus.Web.Models;

namespace ToolNexus.Web.Tests;

public sealed class AuthControllerTests
{
    [Fact]
    public void Login_WhenUnauthenticated_ReturnsLoginView()
    {
        var controller = CreateController(isAuthenticated: false);

        var result = controller.Login();

        var view = Assert.IsType<ViewResult>(result);
        Assert.IsType<AuthLoginViewModel>(view.Model);
    }

    [Fact]
    public void Login_WhenAuthenticated_RedirectsToHome()
    {
        var controller = CreateController(isAuthenticated: true);

        var result = controller.Login();

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
    }

    private static AuthController CreateController(bool isAuthenticated)
    {
        var controller = new AuthController(null!);
        var identity = isAuthenticated
            ? new ClaimsIdentity([new Claim(ClaimTypes.Name, "tester")], "Cookies")
            : new ClaimsIdentity();

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };

        return controller;
    }
}
