using Xunit;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ToolNexus.Application.Tools.DocumentConverter;
using ToolNexus.Web.Controllers.Api;

namespace ToolNexus.Web.Tests;

public sealed class DocumentConverterControllerTests
{
    [Fact]
    public async Task Run_WithDocxFile_ReturnsFileResultWithDiagnosticsHeaders()
    {
        var controller = new DocumentConverterController(new DocumentConverterService())
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        var docx = BuildDocx("Controller conversion test");
        await using var stream = new MemoryStream(docx);
        IFormFile formFile = new FormFile(stream, 0, stream.Length, "file", "input.docx");

        var result = await controller.Run(formFile, "docx-to-pdf", CancellationToken.None);

        var file = Assert.IsType<FileContentResult>(result);
        Assert.Equal("application/pdf", file.ContentType);
        Assert.True(controller.Response.Headers.ContainsKey("X-ToolNexus-Diagnostics"));
    }

    private static byte[] BuildDocx(string content)
    {
        using var stream = new MemoryStream();
        using (var document = WordprocessingDocument.Create(stream, DocumentFormat.OpenXml.WordprocessingDocumentType.Document, true))
        {
            var mainPart = document.AddMainDocumentPart();
            mainPart.Document = new Document(new Body(new Paragraph(new Run(new Text(content)))));
            mainPart.Document.Save();
        }

        return stream.ToArray();
    }
}
