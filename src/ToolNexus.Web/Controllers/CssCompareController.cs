using System.Net;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Controllers;

[Route("tools/css-compare")]
public sealed class CssCompareController(CssComparisonService cssComparisonService) : Controller
{
    private static readonly Regex DomainRegex = new(
        "^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    [HttpGet("{domainA}-vs-{domainB}")]
    public async Task<IActionResult> Compare(string domainA, string domainB, CancellationToken cancellationToken)
    {
        var normalizedDomainA = NormalizeDomain(domainA);
        var normalizedDomainB = NormalizeDomain(domainB);

        if (!await IsAllowedPublicDomain(normalizedDomainA, cancellationToken)
            || !await IsAllowedPublicDomain(normalizedDomainB, cancellationToken))
        {
            return BadRequest("Only valid public domains are allowed.");
        }

        var result = await cssComparisonService.Compare(normalizedDomainA, normalizedDomainB, cancellationToken);

        ViewData["Title"] = $"{result.DomainA} vs {result.DomainB} CSS Performance Comparison";
        ViewData["Description"] = $"Compare CSS efficiency, framework usage and performance between {result.DomainA} and {result.DomainB}.";
        ViewData["CanonicalUrl"] = $"{Request.Scheme}://{Request.Host}/tools/css-compare/{result.DomainA}-vs-{result.DomainB}";

        return View("~/Views/Tools/CssCompare.cshtml", result);
    }

    private static string NormalizeDomain(string domain)
    {
        return domain.Trim().ToLowerInvariant();
    }

    private static async Task<bool> IsAllowedPublicDomain(string domain, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(domain) || !DomainRegex.IsMatch(domain))
        {
            return false;
        }

        if (domain.Equals("localhost", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var addresses = await Dns.GetHostAddressesAsync(domain, cancellationToken);
        if (addresses.Length == 0)
        {
            return false;
        }

        return addresses.All(address => !IsPrivateAddress(address));
    }

    private static bool IsPrivateAddress(IPAddress address)
    {
        if (IPAddress.IsLoopback(address))
        {
            return true;
        }

        if (address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
        {
            var bytes = address.GetAddressBytes();
            return bytes[0] switch
            {
                10 => true,
                127 => true,
                172 when bytes[1] >= 16 && bytes[1] <= 31 => true,
                192 when bytes[1] == 168 => true,
                169 when bytes[1] == 254 => true,
                _ => false
            };
        }

        if (address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6)
        {
            return address.IsIPv6LinkLocal || address.IsIPv6SiteLocal || address.IsIPv6Multicast;
        }

        return false;
    }
}
