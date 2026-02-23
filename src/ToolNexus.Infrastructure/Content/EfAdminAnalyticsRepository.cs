using Microsoft.EntityFrameworkCore;
using ToolNexus.Application.Services;
using ToolNexus.Infrastructure.Data;

namespace ToolNexus.Infrastructure.Content;

public sealed class EfAdminAnalyticsRepository(ToolNexusContentDbContext dbContext) : IAdminAnalyticsRepository
{
    public async Task<IReadOnlyList<DailyToolMetricsSnapshot>> GetByDateRangeAsync(DateOnly startDateInclusive, DateOnly endDateInclusive, CancellationToken cancellationToken)
    {
        var startDate = startDateInclusive.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
        var endDate = endDateInclusive.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);

        return await dbContext.DailyToolMetrics
            .AsNoTracking()
            .Where(x => x.DateUtc >= startDate && x.DateUtc <= endDate)
            .Select(x => new DailyToolMetricsSnapshot(
                x.ToolSlug,
                DateOnly.FromDateTime(x.DateUtc),
                x.TotalExecutions,
                x.SuccessCount,
                x.AvgDurationMs))
            .ToListAsync(cancellationToken);
    }
}

