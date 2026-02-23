using System.Diagnostics.Metrics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace ToolNexus.Infrastructure.Content;

public sealed class AuditGuardrailsMetrics
{
    public const string MeterName = "ToolNexus.AuditGuardrails";
    private readonly Meter meter = new(MeterName);
    public Counter<long> AuditWriteAttempts { get; }
    public Counter<long> AuditWriteSuccess { get; }
    public Counter<long> AuditWriteDegrade { get; }
    public ObservableGauge<long> OutboxBacklogDepth { get; }
    public ObservableGauge<long> DeadLetterOpenCount { get; }
    public Counter<long> RedactionApplied { get; }
    public Counter<long> TruncationApplied { get; }

    private long outboxBacklog;
    private long deadLetterOpen;

    public AuditGuardrailsMetrics()
    {
        AuditWriteAttempts = meter.CreateCounter<long>("audit_write_success_rate_attempts");
        AuditWriteSuccess = meter.CreateCounter<long>("audit_write_success_rate_success");
        AuditWriteDegrade = meter.CreateCounter<long>("audit_write_degrade_count");
        RedactionApplied = meter.CreateCounter<long>("redaction_application_rate");
        TruncationApplied = meter.CreateCounter<long>("truncation_application_rate");
        OutboxBacklogDepth = meter.CreateObservableGauge<long>("outbox_backlog_depth", () => Interlocked.Read(ref outboxBacklog));
        DeadLetterOpenCount = meter.CreateObservableGauge<long>("dead_letter_open_count", () => Interlocked.Read(ref deadLetterOpen));
    }

    public long CurrentOutboxBacklogDepth => Interlocked.Read(ref outboxBacklog);
    public long CurrentDeadLetterOpenCount => Interlocked.Read(ref deadLetterOpen);

    public void SetBacklogDepth(long value) => Interlocked.Exchange(ref outboxBacklog, value);
    public void SetDeadLetterOpenCount(long value) => Interlocked.Exchange(ref deadLetterOpen, value);
}

public interface IAuditPayloadProcessor
{
    AuditPayloadProcessingResult Process(object? before, object? after);
}

public sealed record AuditPayloadProcessingResult(string PayloadJson, string PayloadHashSha256, bool RedactionApplied, bool TruncationApplied);

public sealed class AuditPayloadProcessor : IAuditPayloadProcessor
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const int FieldCapBytes = 2048;
    private const int PayloadCapBytes = 64 * 1024;
    private static readonly Regex JwtRegex = new("eyJ[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9_-]{10,}", RegexOptions.Compiled);
    private static readonly Regex BearerRegex = new("(?i)bearer\\s+[a-z0-9\\-\\._~\\+\\/]+=*", RegexOptions.Compiled);
    private static readonly Regex PemRegex = new("-----BEGIN [A-Z ]+PRIVATE KEY-----[\\s\\S]+?-----END [A-Z ]+PRIVATE KEY-----", RegexOptions.Compiled);
    private static readonly Regex PanRegex = new("\\b(?:\\d[ -]*?){13,19}\\b", RegexOptions.Compiled);

    private static readonly HashSet<string> FullRedactKeys =
    [
        "password","passphrase","secret","clientsecret","apikey","accesskey","privatekey","token","refreshtoken","authorization","setcookie","cookie","sessionid","otp","mfacode","pin"
    ];

    private static readonly HashSet<string> PartialPiiKeys = ["email", "phone", "ssn", "nationalid", "taxid", "creditcard", "cardnumber"];

    public AuditPayloadProcessingResult Process(object? before, object? after)
    {
        var node = JsonNode.Parse(JsonSerializer.Serialize(new JsonObject
        {
            ["before"] = before is null ? null : JsonSerializer.SerializeToNode(before, JsonOptions),
            ["after"] = after is null ? null : JsonSerializer.SerializeToNode(after, JsonOptions)
        }, JsonOptions)) ?? new JsonObject();

        var redactedPaths = new List<string>();
        var patternCount = 0;
        RedactNode(node, "$", redactedPaths, ref patternCount);
        var redactionMeta = new JsonObject
        {
            ["rule_version"] = 1,
            ["fields_redacted_count"] = redactedPaths.Count,
            ["patterns_redacted_count"] = patternCount,
            ["redacted_paths"] = ToJsonArray(redactedPaths)
        };
        node["_redaction_meta"] = redactionMeta;

        var beforeHash = Hash(node.ToJsonString(JsonOptions));
        var dropped = new List<string>();
        var truncated = new List<string>();
        var originalBytes = Encoding.UTF8.GetByteCount(node.ToJsonString(JsonOptions));
        TruncateNode(node, "$", truncated);

        DropOptionalPath(node, "debug", dropped);
        DropOptionalPath(node, "stack", dropped);
        DropOptionalPath(node, "raw_request", dropped);
        DropOptionalPath(node, "raw_response", dropped);

        while (Encoding.UTF8.GetByteCount(node.ToJsonString(JsonOptions)) > PayloadCapBytes && TryShrinkLargestString(node, "$", truncated)) { }
        while (Encoding.UTF8.GetByteCount(node.ToJsonString(JsonOptions)) > PayloadCapBytes && TrySummarizeLargestArray(node, "$", truncated)) { }

        var finalJson = node.ToJsonString(JsonOptions);
        var finalBytes = Encoding.UTF8.GetByteCount(finalJson);
        node["_truncation_meta"] = new JsonObject
        {
            ["applied"] = truncated.Count > 0 || dropped.Count > 0 || finalBytes != originalBytes,
            ["rule_version"] = 1,
            ["bytes_original"] = originalBytes,
            ["bytes_final"] = finalBytes,
            ["dropped_paths"] = ToJsonArray(dropped),
            ["truncated_paths"] = ToJsonArray(truncated.Distinct()),
            ["content_hash_sha256_before"] = beforeHash,
            ["content_hash_sha256_after"] = Hash(finalJson)
        };

        finalJson = node.ToJsonString(JsonOptions);
        return new(finalJson, Hash(finalJson), redactedPaths.Count > 0 || patternCount > 0, truncated.Count > 0 || dropped.Count > 0 || finalBytes != originalBytes);
    }

    private static void RedactNode(JsonNode? node, string path, List<string> paths, ref int patternCount)
    {
        if (node is JsonObject obj)
        {
            foreach (var kv in obj.ToList())
            {
                var key = kv.Key;
                var normalized = NormalizeKey(key);
                var childPath = $"{path}.{key}";
                if (kv.Value is JsonValue value)
                {
                    var raw = value.ToJsonString().Trim('"');
                    if (raw == "[REDACTED]")
                    {
                        continue;
                    }

                    if (FullRedactKeys.Contains(normalized))
                    {
                        obj[key] = "[REDACTED]";
                        paths.Add(childPath);
                        continue;
                    }

                    if (PartialPiiKeys.Contains(normalized))
                    {
                        obj[key] = Mask(normalized, raw);
                        paths.Add(childPath);
                        continue;
                    }

                    var scanned = PatternRedact(raw, out var redactedCount);
                    patternCount += redactedCount;
                    if (!ReferenceEquals(scanned, raw))
                    {
                        obj[key] = scanned;
                        paths.Add(childPath);
                    }
                }
                else
                {
                    RedactNode(kv.Value, childPath, paths, ref patternCount);
                }
            }
        }
        else if (node is JsonArray arr)
        {
            for (var i = 0; i < arr.Count; i++)
            {
                RedactNode(arr[i], $"{path}[{i}]", paths, ref patternCount);
            }
        }
    }

    private static void TruncateNode(JsonNode? node, string path, List<string> truncated)
    {
        if (node is JsonObject obj)
        {
            foreach (var kv in obj.ToList())
            {
                if (kv.Value is JsonValue value)
                {
                    var raw = value.ToJsonString().Trim('"');
                    var bytes = Encoding.UTF8.GetByteCount(raw);
                    if (bytes > FieldCapBytes)
                    {
                        var keep = Encoding.UTF8.GetString(Encoding.UTF8.GetBytes(raw), 0, Math.Min(FieldCapBytes, Encoding.UTF8.GetByteCount(raw)));
                        obj[kv.Key] = keep + $"<TRUNCATED bytes_original={bytes} bytes_kept={Encoding.UTF8.GetByteCount(keep)} sha256={Hash(raw)}>";
                        truncated.Add($"{path}.{kv.Key}");
                    }
                }
                else
                {
                    TruncateNode(kv.Value, $"{path}.{kv.Key}", truncated);
                }
            }
        }
        else if (node is JsonArray arr)
        {
            for (var i = 0; i < arr.Count; i++)
            {
                TruncateNode(arr[i], $"{path}[{i}]", truncated);
            }
        }
    }

    private static string PatternRedact(string input, out int patternCount)
    {
        patternCount = 0;
        var value = ReplaceAndCount(input, JwtRegex, ref patternCount);
        value = ReplaceAndCount(value, BearerRegex, ref patternCount);
        value = ReplaceAndCount(value, PemRegex, ref patternCount);
        value = PanRegex.Replace(value, m => IsLuhnValid(m.Value) ? "[REDACTED]" : m.Value);
        return value;
    }

    private static string ReplaceAndCount(string source, Regex regex, ref int count)
    {
        var localCount = 0;
        var replaced = regex.Replace(source, _ =>
        {
            localCount++;
            return "[REDACTED]";
        });

        count += localCount;
        return replaced;
    }

    private static void DropOptionalPath(JsonNode root, string property, List<string> dropped)
    {
        if (root is not JsonObject obj || obj[property] is null) return;
        obj.Remove(property);
        dropped.Add("$." + property);
    }

    private static bool TryShrinkLargestString(JsonNode node, string path, List<string> truncated)
    {
        var all = new List<(JsonObject parent, string key, string value, string path)>();
        CollectStrings(node, path, all);
        var target = all.OrderByDescending(x => Encoding.UTF8.GetByteCount(x.value)).FirstOrDefault();
        if (target.parent is null) return false;
        var keep = target.value[..Math.Max(1, target.value.Length / 2)];
        target.parent[target.key] = keep + $"<TRUNCATED bytes_original={Encoding.UTF8.GetByteCount(target.value)} bytes_kept={Encoding.UTF8.GetByteCount(keep)} sha256={Hash(target.value)}>";
        truncated.Add(target.path);
        return true;
    }

    private static bool TrySummarizeLargestArray(JsonNode node, string path, List<string> truncated)
    {
        var all = new List<(JsonObject parent, string key, JsonArray arr, string path)>();
        CollectArrays(node, path, all);
        var target = all.OrderByDescending(x => x.arr.Count).FirstOrDefault();
        if (target.parent is null) return false;
        target.parent[target.key] = new JsonObject
        {
            ["_truncated_array"] = true,
            ["original_count"] = target.arr.Count,
            ["sample"] = new JsonArray(target.arr.Take(3).Select(item => JsonValue.Create(Hash(item?.ToJsonString() ?? "null"))).ToArray())
        };
        truncated.Add(target.path);
        return true;
    }

    private static void CollectStrings(JsonNode? node, string path, List<(JsonObject parent, string key, string value, string path)> output)
    {
        if (node is JsonObject obj)
        {
            foreach (var kv in obj)
            {
                if (kv.Value is JsonValue value)
                {
                    output.Add((obj, kv.Key, value.ToJsonString().Trim('"'), $"{path}.{kv.Key}"));
                }
                else CollectStrings(kv.Value, $"{path}.{kv.Key}", output);
            }
        }
        else if (node is JsonArray arr)
        {
            for (var i = 0; i < arr.Count; i++) CollectStrings(arr[i], $"{path}[{i}]", output);
        }
    }

    private static void CollectArrays(JsonNode? node, string path, List<(JsonObject parent, string key, JsonArray arr, string path)> output)
    {
        if (node is JsonObject obj)
        {
            foreach (var kv in obj)
            {
                if (kv.Value is JsonArray arr)
                {
                    output.Add((obj, kv.Key, arr, $"{path}.{kv.Key}"));
                }

                CollectArrays(kv.Value, $"{path}.{kv.Key}", output);
            }
        }
        else if (node is JsonArray array)
        {
            for (var i = 0; i < array.Count; i++) CollectArrays(array[i], $"{path}[{i}]", output);
        }
    }


    private static JsonArray ToJsonArray(IEnumerable<string> values)
    {
        var arr = new JsonArray();
        foreach (var value in values)
        {
            arr.Add(value);
        }

        return arr;
    }

    private static string NormalizeKey(string key) => new(key.Where(char.IsLetterOrDigit).Select(char.ToLowerInvariant).ToArray());
    private static string Hash(string input) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(input))).ToLowerInvariant();

    private static string Mask(string key, string value)
    {
        if (key == "email")
        {
            var parts = value.Split('@');
            if (parts.Length == 2 && parts[0].Length > 0)
            {
                return $"{parts[0][0]}***@{parts[1]}";
            }
        }

        if (key == "phone")
        {
            var digits = new string(value.Where(char.IsDigit).ToArray());
            return digits.Length <= 2 ? "**" : new string('*', Math.Max(0, digits.Length - 2)) + digits[^2..];
        }

        if (key is "ssn" or "nationalid" or "taxid")
        {
            return value.Length <= 4 ? "****" : new string('*', Math.Max(0, value.Length - 4)) + value[^4..];
        }

        if (key is "creditcard" or "cardnumber")
        {
            var digits = new string(value.Where(char.IsDigit).ToArray());
            if (digits.Length >= 10)
            {
                return digits[..6] + new string('*', Math.Max(0, digits.Length - 10)) + digits[^4..];
            }
        }

        return "[REDACTED]";
    }

    private static bool IsLuhnValid(string input)
    {
        var digits = new string(input.Where(char.IsDigit).ToArray());
        if (digits.Length is < 13 or > 19) return false;
        var sum = 0;
        var alternate = false;
        for (var i = digits.Length - 1; i >= 0; i--)
        {
            var n = digits[i] - '0';
            if (alternate)
            {
                n *= 2;
                if (n > 9) n -= 9;
            }

            sum += n;
            alternate = !alternate;
        }

        return sum % 10 == 0;
    }
}
