using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Web.Controllers;
using ToolNexus.Web.Models;

namespace ToolNexus.Web.Tests;

public sealed class AuthControllerTests
{
    [Fact]
    public void Login_WhenUnauthenticated_ReturnsLoginView()
    {
        using var db = CreateDbContext();
        var controller = CreateController(db, isAuthenticated: false);

        var result = controller.Login();

        var view = Assert.IsType<ViewResult>(result);
        Assert.IsType<AuthLoginViewModel>(view.Model);
    }

    [Fact]
    public void Login_WhenAuthenticated_RedirectsToHome()
    {
        using var db = CreateDbContext();
        var controller = CreateController(db, isAuthenticated: true);

        var result = controller.Login();

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
    }

    private static ToolNexusContentDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<ToolNexusContentDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new ToolNexusContentDbContext(options);
    }

    private static AuthController CreateController(ToolNexusContentDbContext db, bool isAuthenticated)
    {
        var controller = new AuthController(db, new PasswordHasher<object>());
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
