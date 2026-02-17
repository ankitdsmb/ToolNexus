using System.Text;
using ToolNexus.Api.Options;

namespace ToolNexus.Api.Middleware;

public static class ContentSecurityPolicyBuilder
{
    public static string Build(SecurityHeadersOptions options)
    {
        var directives = options.ContentSecurityPolicy;
        if (directives.Count == 0)
        {
            return "default-src 'self'";
        }

        var builder = new StringBuilder(256);

        foreach (var directive in directives)
        {
            if (string.IsNullOrWhiteSpace(directive.Key) || directive.Value.Count == 0)
            {
                continue;
            }

            if (builder.Length > 0)
            {
                builder.Append("; ");
            }

            builder.Append(directive.Key.Trim());
            builder.Append(' ');

            for (var i = 0; i < directive.Value.Count; i++)
            {
                if (i > 0)
                {
                    builder.Append(' ');
                }

                builder.Append(directive.Value[i].Trim());
            }
        }

        return builder.Length == 0 ? "default-src 'self'" : builder.ToString();
    }
}
