using Xunit;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using ToolNexus.Application.Tools.DocumentConverter;

namespace ToolNexus.Application.Tests;

public sealed class DocumentConverterServiceTests
{
    [Fact]
    public async Task ConvertAsync_DocxToPdf_ReturnsPdfPayload()
    {
        var service = new DocumentConverterService();
        var docxBytes = BuildDocx("ToolNexus Document Converter");

        await using var source = new MemoryStream(docxBytes);
        var result = await service.ConvertAsync(source, "sample.docx", "docx-to-pdf", CancellationToken.None);

        Assert.Equal("application/pdf", result.ContentType);
        Assert.EndsWith(".pdf", result.FileName, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(result.Content);
        Assert.Contains("durationMs", result.Diagnostics.Keys);
    }

    [Fact]
    public async Task ConvertAsync_InvalidMode_Throws()
    {
        var service = new DocumentConverterService();
        await using var source = new MemoryStream([1, 2, 3]);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.ConvertAsync(source, "sample.docx", "bad-mode", CancellationToken.None));
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
