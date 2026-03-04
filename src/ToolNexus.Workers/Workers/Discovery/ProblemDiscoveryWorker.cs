using System.Data.Common;
using System.Data;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace ToolNexus.Workers.Workers.Discovery;

public sealed class ProblemDiscoveryWorker(
    TrendSourceAggregator aggregator,
    IProblemOpportunityStore opportunityStore,
    IOptions<ProblemDiscoveryWorkerOptions> options,
    ILogger<ProblemDiscoveryWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = options.Value.PollingInterval;
        if (interval <= TimeSpan.Zero)
        {
            interval = TimeSpan.FromMinutes(30);
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var opportunities = await aggregator.CollectMergedProblemsAsync(stoppingToken);
                if (opportunities.Count > 0)
                {
                    await opportunityStore.UpsertAsync(opportunities, stoppingToken);
                }

                logger.LogInformation("Problem discovery cycle completed with {Count} merged opportunities.", opportunities.Count);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Problem discovery cycle failed.");
            }

            await Task.Delay(interval, stoppingToken);
        }
    }
}

public sealed class ProblemDiscoveryWorkerOptions
{
    public TimeSpan PollingInterval { get; set; } = TimeSpan.FromMinutes(30);
}

public interface IProblemOpportunityStore
{
    Task UpsertAsync(IReadOnlyCollection<DetectedProblem> opportunities, CancellationToken cancellationToken);
}

public interface IDbConnectionFactory
{
    Task<IDbConnection> OpenConnectionAsync(CancellationToken cancellationToken);
}

public sealed class SqlProblemOpportunityStore(IDbConnectionFactory connectionFactory) : IProblemOpportunityStore
{
    public async Task UpsertAsync(IReadOnlyCollection<DetectedProblem> opportunities, CancellationToken cancellationToken)
    {
        if (opportunities.Count == 0)
        {
            return;
        }

        using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);

        using var createTableCommand = connection.CreateCommand();
        createTableCommand.CommandText =
            """
            CREATE TABLE IF NOT EXISTS tool_opportunities (
                id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                problem TEXT NOT NULL,
                category TEXT NOT NULL,
                score NUMERIC(10,2) NOT NULL,
                detectedAt TIMESTAMPTZ NOT NULL,
                CONSTRAINT ux_tool_opportunities_problem UNIQUE(problem)
            );
            """;
        await ExecuteNonQueryAsync(createTableCommand, cancellationToken);

        foreach (var opportunity in opportunities)
        {
            using var upsertCommand = connection.CreateCommand();
            upsertCommand.CommandText =
                """
                INSERT INTO tool_opportunities(problem, category, score, detectedAt)
                VALUES (@problem, @category, @score, @detectedAt)
                ON CONFLICT(problem)
                DO UPDATE SET
                    category = EXCLUDED.category,
                    score = GREATEST(tool_opportunities.score, EXCLUDED.score),
                    detectedAt = EXCLUDED.detectedAt;
                """;

            AddParameter(upsertCommand, "@problem", opportunity.Problem.Trim());
            AddParameter(upsertCommand, "@category", opportunity.Category.Trim().ToLowerInvariant());
            AddParameter(upsertCommand, "@score", CalculateOpportunityScore(opportunity.SearchVolume));
            AddParameter(upsertCommand, "@detectedAt", DateTime.UtcNow);

            await ExecuteNonQueryAsync(upsertCommand, cancellationToken);
        }
    }

    private static decimal CalculateOpportunityScore(int searchVolume)
    {
        var boundedVolume = Math.Max(1, searchVolume);
        var score = Math.Min(100m, (decimal)Math.Log10(boundedVolume) * 20m);
        return decimal.Round(score, 2, MidpointRounding.AwayFromZero);
    }

    private static void AddParameter(IDbCommand command, string name, object value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value;
        command.Parameters.Add(parameter);
    }

    private static async Task ExecuteNonQueryAsync(IDbCommand command, CancellationToken cancellationToken)
    {
        if (command is DbCommand dbCommand)
        {
            await dbCommand.ExecuteNonQueryAsync(cancellationToken);
            return;
        }

        command.ExecuteNonQuery();
    }
}
