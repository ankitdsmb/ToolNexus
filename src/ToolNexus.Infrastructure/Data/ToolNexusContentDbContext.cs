using Microsoft.EntityFrameworkCore;
using ToolNexus.Infrastructure.Content.Entities;

namespace ToolNexus.Infrastructure.Data;

public sealed class ToolNexusContentDbContext(DbContextOptions<ToolNexusContentDbContext> options) : DbContext(options)
{
    public DbSet<ToolContentEntity> ToolContents => Set<ToolContentEntity>();
    public DbSet<ToolFaqEntity> ToolFaqs => Set<ToolFaqEntity>();
    public DbSet<ToolCategoryEntity> ToolCategories => Set<ToolCategoryEntity>();
    public DbSet<ToolRelatedEntity> ToolRelated => Set<ToolRelatedEntity>();
    public DbSet<ToolFeatureEntity> ToolFeatures => Set<ToolFeatureEntity>();
    public DbSet<ToolStepEntity> ToolSteps => Set<ToolStepEntity>();
    public DbSet<ToolExampleEntity> ToolExamples => Set<ToolExampleEntity>();
    public DbSet<ToolUseCaseEntity> ToolUseCases => Set<ToolUseCaseEntity>();
    public DbSet<ToolDefinitionEntity> ToolDefinitions => Set<ToolDefinitionEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ToolContentEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.Property(x => x.Slug).HasMaxLength(120);
            entity.Property(x => x.Title).HasMaxLength(200);
            entity.Property(x => x.SeoTitle).HasMaxLength(200);
            entity.Property(x => x.SeoDescription).HasMaxLength(320);
            entity.Property(x => x.Keywords).HasMaxLength(500);

            entity.HasMany(x => x.Features).WithOne(x => x.ToolContent).HasForeignKey(x => x.ToolContentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.Steps).WithOne(x => x.ToolContent).HasForeignKey(x => x.ToolContentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.Examples).WithOne(x => x.ToolContent).HasForeignKey(x => x.ToolContentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.Faq).WithOne(x => x.ToolContent).HasForeignKey(x => x.ToolContentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.RelatedTools).WithOne(x => x.ToolContent).HasForeignKey(x => x.ToolContentId).OnDelete(DeleteBehavior.Cascade);
            entity.HasMany(x => x.UseCases).WithOne(x => x.ToolContent).HasForeignKey(x => x.ToolContentId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ToolFeatureEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Value).HasMaxLength(256);
        });

        modelBuilder.Entity<ToolStepEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(160);
            entity.Property(x => x.Description).HasMaxLength(1000);
        });

        modelBuilder.Entity<ToolExampleEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(160);
        });

        modelBuilder.Entity<ToolFaqEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Question).HasMaxLength(300);
            entity.Property(x => x.Answer).HasMaxLength(2000);
        });

        modelBuilder.Entity<ToolCategoryEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.Property(x => x.Slug).HasMaxLength(120);
            entity.Property(x => x.Name).HasMaxLength(120);
        });

        modelBuilder.Entity<ToolRelatedEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.RelatedSlug).HasMaxLength(120);
        });

        modelBuilder.Entity<ToolUseCaseEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Value).HasMaxLength(400);
        });

        modelBuilder.Entity<ToolDefinitionEntity>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Slug).IsUnique();
            entity.Property(x => x.Name).HasMaxLength(200);
            entity.Property(x => x.Slug).HasMaxLength(120);
            entity.Property(x => x.Description).HasMaxLength(2000);
            entity.Property(x => x.Category).HasMaxLength(120);
            entity.Property(x => x.Status).HasMaxLength(20);
            entity.Property(x => x.Icon).HasMaxLength(120);
            entity.Property(x => x.ActionsCsv).HasMaxLength(500);
            entity.Property(x => x.UpdatedAt);
        });
    }
}
