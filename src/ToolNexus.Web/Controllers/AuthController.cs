using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Data;
using ToolNexus.Web.Models;

namespace ToolNexus.Web.Controllers;

[Route("auth")]
public sealed class AuthController(
    ToolNexusContentDbContext dbContext,
    IPasswordHasher<object> passwordHasher) : Controller
{
    [AllowAnonymous]
    [HttpGet("login")]
    public IActionResult Login([FromQuery] string? returnUrl = null)
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            if (!string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl))
            {
                return LocalRedirect(returnUrl);
            }

            return RedirectToAction("Index", "Home");
        }

        return View(new AuthLoginViewModel { ReturnUrl = returnUrl });
    }

    [AllowAnonymous]
    [HttpPost("login")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Login(AuthLoginViewModel model)
    {
        if (!ModelState.IsValid)
        {
            return View(model);
        }

        var normalizedEmail = model.Email.Trim().ToUpperInvariant();
        var user = await dbContext.AdminIdentityUsers.SingleOrDefaultAsync(x => x.NormalizedEmail == normalizedEmail);
        if (user is null)
        {
            ModelState.AddModelError(string.Empty, "Invalid email or password.");
            return View(model);
        }

        if (user.LockoutEndUtc.HasValue && user.LockoutEndUtc > DateTimeOffset.UtcNow)
        {
            ModelState.AddModelError(string.Empty, "Account is locked. Please try again later.");
            return View(model);
        }

        var verifyResult = passwordHasher.VerifyHashedPassword(new object(), user.PasswordHash, model.Password);
        if (verifyResult == PasswordVerificationResult.Failed)
        {
            user.AccessFailedCount += 1;
            if (user.AccessFailedCount >= 5)
            {
                user.LockoutEndUtc = DateTimeOffset.UtcNow.AddMinutes(15);
                user.AccessFailedCount = 0;
            }

            await dbContext.SaveChangesAsync();
            ModelState.AddModelError(string.Empty, "Invalid email or password.");
            return View(model);
        }

        user.AccessFailedCount = 0;
        user.LockoutEndUtc = null;
        await dbContext.SaveChangesAsync();

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim("tool_permission", "admin:read"),
            new Claim("tool_permission", "admin:write")
        };

        var principal = new ClaimsPrincipal(new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

        if (!string.IsNullOrWhiteSpace(model.ReturnUrl) && Url.IsLocalUrl(model.ReturnUrl))
        {
            return LocalRedirect(model.ReturnUrl);
        }

        return RedirectToAction("Index", "Dashboard", new { area = "Admin" });
    }

    [AllowAnonymous]
    [HttpGet("access-denied")]
    public IActionResult AccessDenied() => View();

    [HttpPost("logout")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction("Index", "Home");
    }
}
