using System.Security.Claims;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using ToolNexus.Web.Controllers;
using ToolNexus.Web.Models;
using ToolNexus.Web.Security;

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
        var controller = new AuthController(new TestEnvironment(), new TestPrincipalFactory());
        var identity = isAuthenticated
            ? new ClaimsIdentity([new Claim(ClaimTypes.Name, "tester")], "Cookies")
            : new ClaimsIdentity();

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };

        return controller;
    }

    private sealed class TestEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "ToolNexus.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; } = string.Empty;
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }

    private sealed class TestPrincipalFactory : IInternalUserPrincipalFactory
    {
        public ClaimsPrincipal CreatePrincipal()
        {
            var identity = new ClaimsIdentity([new Claim(ClaimTypes.Name, "dev-admin")], "Cookies");
            return new ClaimsPrincipal(identity);
        }
    }
}
