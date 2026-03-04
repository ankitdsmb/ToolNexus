using System.Data;
using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Web.Services;

public sealed class CssScanCacheService(ToolNexusContentDbContext dbContext)
{
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromHours(24);

    public async Task<string?> GetCachedResult(string url, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(url);

        var connection = dbContext.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;

        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT Result, ScannedAtUtc
                FROM CssScanResults
                WHERE Url = @url
                ORDER BY ScannedAtUtc DESC
                LIMIT 1
                """;

            AddParameter(command, "@url", url);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return null;
            }

            var result = reader.IsDBNull(0) ? null : reader.GetString(0);
            if (string.IsNullOrWhiteSpace(result))
            {
                return null;
            }

            var scannedAtUtc = reader.GetDateTime(1);
            if (scannedAtUtc < DateTime.UtcNow.Subtract(CacheLifetime))
            {
                return null;
            }

            return result;
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    public async Task SaveResult(string url, string result, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(url);
        ArgumentNullException.ThrowIfNull(result);

        var nowUtc = DateTime.UtcNow;

        var connection = dbContext.Database.GetDbConnection();
        var shouldClose = connection.State != ConnectionState.Open;

        if (shouldClose)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var updateCommand = connection.CreateCommand();
            updateCommand.CommandText = """
                UPDATE CssScanResults
                SET Result = @result,
                    ScannedAtUtc = @scannedAtUtc
                WHERE Url = @url
                """;

            AddParameter(updateCommand, "@result", result);
            AddParameter(updateCommand, "@scannedAtUtc", nowUtc);
            AddParameter(updateCommand, "@url", url);

            var rowsUpdated = await updateCommand.ExecuteNonQueryAsync(cancellationToken);
            if (rowsUpdated > 0)
            {
                return;
            }

            await using var insertCommand = connection.CreateCommand();
            insertCommand.CommandText = """
                INSERT INTO CssScanResults (Url, Result, ScannedAtUtc)
                VALUES (@url, @result, @scannedAtUtc)
                """;

            AddParameter(insertCommand, "@url", url);
            AddParameter(insertCommand, "@result", result);
            AddParameter(insertCommand, "@scannedAtUtc", nowUtc);

            await insertCommand.ExecuteNonQueryAsync(cancellationToken);
        }
        finally
        {
            if (shouldClose)
            {
                await connection.CloseAsync();
            }
        }
    }

    private static void AddParameter(IDbCommand command, string name, object value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }
}
