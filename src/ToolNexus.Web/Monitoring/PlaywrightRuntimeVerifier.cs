using Microsoft.Playwright;

namespace ToolNexus.Web.Monitoring;

public sealed class PlaywrightRuntimeVerifier(ILogger<PlaywrightRuntimeVerifier> logger)
{
    public bool ChromiumExecutableAvailable { get; private set; }

    public string? ChromiumExecutablePath { get; private set; }

    public string? LastError { get; private set; }

    public async Task VerifyChromiumExecutableAsync()
    {
        try
        {
            using var playwright = await Playwright.CreateAsync();
            ChromiumExecutablePath = playwright.Chromium.ExecutablePath;

            ChromiumExecutableAvailable =
                !string.IsNullOrWhiteSpace(ChromiumExecutablePath) &&
                File.Exists(ChromiumExecutablePath);

            if (!ChromiumExecutableAvailable)
            {
                LastError = "Chromium executable was not found. Run 'playwright install chromium' during deployment.";
                logger.LogCritical(
                    "Playwright Chromium executable missing at startup. ExpectedPath={ChromiumExecutablePath}. Ensure deployment runs 'playwright install chromium'.",
                    ChromiumExecutablePath ?? "<null>");
                return;
            }

            LastError = null;
            logger.LogInformation("Playwright Chromium executable verified at startup. Path={ChromiumExecutablePath}", ChromiumExecutablePath);
        }
        catch (Exception ex)
        {
            ChromiumExecutableAvailable = false;
            LastError = ex.Message;
            logger.LogCritical(ex,
                "Playwright Chromium runtime verification failed at startup. Ensure deployment runs 'playwright install chromium'.");
        }
    }
}
