using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using ToolNexus.Web.Models;
using ToolNexus.Web.Services;

namespace ToolNexus.Web.Controllers;

public sealed class FeedbackController(IFeedbackService feedbackService) : Controller
{
    [HttpGet("/feedback")]
    public IActionResult Index()
    {
        ViewData["Title"] = "Product Feedback | ToolNexus";
        ViewData["Description"] = "Tell us what is working, what is broken, and what we should build next.";
        return View(BuildViewModel());
    }

    [HttpPost("/feedback")]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Index(FeedbackSubmissionViewModel model, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return View(BuildViewModel(model));
        }

        var result = await feedbackService.SubmitAsync(
            model,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);

        if (!result.IsSuccess)
        {
            ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "We could not save your feedback right now.");
            return View(BuildViewModel(model));
        }

        TempData["FeedbackSuccess"] = "Thanks. I read every message that comes through this form.";
        return RedirectToAction(nameof(Index));
    }

    private FeedbackSubmissionPageViewModel BuildViewModel(FeedbackSubmissionViewModel? form = null)
    {
        var currentForm = form ?? new FeedbackSubmissionViewModel();
        return new FeedbackSubmissionPageViewModel
        {
            Form = currentForm,
            CategoryOptions = FeedbackSubmissionViewModel.Categories
                .Select(category => new SelectListItem(category, category, string.Equals(category, currentForm.Category, StringComparison.Ordinal)))
                .ToList()
        };
    }
}

public sealed class FeedbackSubmissionPageViewModel
{
    public required FeedbackSubmissionViewModel Form { get; init; }
    public required IReadOnlyCollection<SelectListItem> CategoryOptions { get; init; }
}
