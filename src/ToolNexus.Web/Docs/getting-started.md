# Docs rendering quick start

This page is rendered from markdown.

## Why this exists

We wanted docs to be easy to edit in plain text and still safe to render in MVC.

## Feature check

| Feature | Status |
|---|---|
| GitHub flavored markdown | ✅ |
| Tables | ✅ |
| Code blocks | ✅ |
| Headings | ✅ |
| Links | ✅ |

## Code example

```csharp
var html = await docsService.RenderDocumentAsync("getting-started.md", cancellationToken);
```

## Useful link

See [Markdig on NuGet](https://www.nuget.org/packages/Markdig).
