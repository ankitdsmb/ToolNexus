using System.Diagnostics;
using System.Text;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using PdfSharpCore.Drawing;
using UglyToad.PdfPig;

namespace ToolNexus.Application.Tools.DocumentConverter;

public sealed class DocumentConverterService
{
    private static readonly HashSet<string> AllowedModes = new(StringComparer.OrdinalIgnoreCase)
    {
        "docx-to-pdf",
        "pdf-to-docx"
    };

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".docx",
        ".pdf"
    };

    public async Task<DocumentConversionResult> ConvertAsync(Stream source, string fileName, string mode, CancellationToken cancellationToken)
    {
        if (source is null)
        {
            throw new ArgumentNullException(nameof(source));
        }

        if (string.IsNullOrWhiteSpace(fileName))
        {
            throw new InvalidOperationException("A file name is required.");
        }

        if (!AllowedModes.Contains(mode))
        {
            throw new InvalidOperationException("Unsupported conversion mode.");
        }

        var extension = Path.GetExtension(fileName);
        if (!AllowedExtensions.Contains(extension))
        {
            throw new InvalidOperationException("Only DOCX and PDF files are supported.");
        }

        ValidateInputByMode(mode, extension);

        await using var sourceBuffer = new MemoryStream();
        await source.CopyToAsync(sourceBuffer, cancellationToken);
        sourceBuffer.Position = 0;

        var diagnostics = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["inputFileName"] = fileName,
            ["mode"] = mode,
            ["inputExtension"] = extension,
            ["inputSizeBytes"] = sourceBuffer.Length.ToString()
        };

        var sw = Stopwatch.StartNew();
        byte[] resultBytes;
        string outputFileName;
        string contentType;

        if (string.Equals(mode, "docx-to-pdf", StringComparison.OrdinalIgnoreCase))
        {
            var extractedText = ExtractDocxText(sourceBuffer);
            diagnostics["textLength"] = extractedText.Length.ToString();
            resultBytes = BuildPdfFromText(extractedText);
            outputFileName = Path.ChangeExtension(Path.GetFileName(fileName), ".pdf");
            contentType = "application/pdf";
        }
        else
        {
            var extractedText = ExtractPdfText(sourceBuffer);
            diagnostics["textLength"] = extractedText.Length.ToString();
            resultBytes = BuildDocxFromText(extractedText);
            outputFileName = Path.ChangeExtension(Path.GetFileName(fileName), ".docx");
            contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }

        sw.Stop();

        diagnostics["outputSizeBytes"] = resultBytes.LongLength.ToString();
        diagnostics["durationMs"] = sw.ElapsedMilliseconds.ToString();

        return new DocumentConversionResult(resultBytes, outputFileName, contentType, sw.Elapsed, diagnostics);
    }

    private static void ValidateInputByMode(string mode, string extension)
    {
        if (mode.Equals("docx-to-pdf", StringComparison.OrdinalIgnoreCase) && !extension.Equals(".docx", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("DOCX → PDF mode requires a .docx input file.");
        }

        if (mode.Equals("pdf-to-docx", StringComparison.OrdinalIgnoreCase) && !extension.Equals(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("PDF → DOCX mode requires a .pdf input file.");
        }
    }

    private static string ExtractDocxText(Stream stream)
    {
        stream.Position = 0;
        using var document = WordprocessingDocument.Open(stream, false);
        var body = document.MainDocumentPart?.Document?.Body;
        if (body is null)
        {
            return string.Empty;
        }

        var builder = new StringBuilder();
        foreach (var paragraph in body.Elements<Paragraph>())
        {
            var text = paragraph.InnerText;
            if (!string.IsNullOrWhiteSpace(text))
            {
                builder.AppendLine(text.Trim());
            }
        }

        return builder.ToString().Trim();
    }

    private static string ExtractPdfText(Stream stream)
    {
        stream.Position = 0;
        using var document = UglyToad.PdfPig.PdfDocument.Open(stream);
        var builder = new StringBuilder();
        foreach (var page in document.GetPages())
        {
            if (!string.IsNullOrWhiteSpace(page.Text))
            {
                builder.AppendLine(page.Text.Trim());
                builder.AppendLine();
            }
        }

        return builder.ToString().Trim();
    }

    private static byte[] BuildPdfFromText(string text)
    {
        using var output = new MemoryStream();
        using var pdfDocument = new PdfSharpCore.Pdf.PdfDocument();

        var page = pdfDocument.AddPage();
        var graphics = XGraphics.FromPdfPage(page);
        var font = new XFont("Arial", 12, XFontStyle.Regular);

        const double top = 36;
        const double left = 36;
        const double lineHeight = 18;
        var y = top;

        var lines = (text ?? string.Empty)
            .Replace("\r\n", "\n", StringComparison.Ordinal)
            .Split('\n');

        foreach (var line in lines)
        {
            if (y > page.Height - top)
            {
                page = pdfDocument.AddPage();
                graphics = XGraphics.FromPdfPage(page);
                y = top;
            }

            graphics.DrawString(line, font, XBrushes.Black, new XRect(left, y, page.Width - (left * 2), lineHeight), XStringFormats.TopLeft);
            y += lineHeight;
        }

        pdfDocument.Save(output, false);
        return output.ToArray();
    }

    private static byte[] BuildDocxFromText(string text)
    {
        using var output = new MemoryStream();

        using (var document = WordprocessingDocument.Create(output, DocumentFormat.OpenXml.WordprocessingDocumentType.Document, true))
        {
            var mainPart = document.AddMainDocumentPart();
            mainPart.Document = new Document(new Body());

            var body = mainPart.Document.Body ?? new Body();
            var lines = (text ?? string.Empty)
                .Replace("\r\n", "\n", StringComparison.Ordinal)
                .Split('\n', StringSplitOptions.None);

            foreach (var line in lines)
            {
                var paragraph = new Paragraph(new Run(new Text(line ?? string.Empty)
                {
                    Space = SpaceProcessingModeValues.Preserve
                }));

                body.Append(paragraph);
            }

            mainPart.Document.Body = body;
            mainPart.Document.Save();
        }

        return output.ToArray();
    }
}

public sealed record DocumentConversionResult(
    byte[] Content,
    string FileName,
    string ContentType,
    TimeSpan Duration,
    IReadOnlyDictionary<string, string> Diagnostics);
