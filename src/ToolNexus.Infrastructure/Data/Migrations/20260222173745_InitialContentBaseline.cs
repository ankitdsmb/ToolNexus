using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialContentBaseline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ToolCategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Slug = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToolCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ToolContents",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Slug = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    SeoTitle = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    SeoDescription = table.Column<string>(type: "TEXT", maxLength: 320, nullable: false),
                    Intro = table.Column<string>(type: "TEXT", nullable: false),
                    LongDescription = table.Column<string>(type: "TEXT", nullable: false),
                    Keywords = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToolContents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ToolExamples",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ToolContentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 160, nullable: false),
                    Input = table.Column<string>(type: "TEXT", nullable: false),
                    Output = table.Column<string>(type: "TEXT", nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToolExamples", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ToolExamples_ToolContents_ToolContentId",
                        column: x => x.ToolContentId,
                        principalTable: "ToolContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ToolFaqs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ToolContentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Question = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Answer = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToolFaqs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ToolFaqs_ToolContents_ToolContentId",
                        column: x => x.ToolContentId,
                        principalTable: "ToolContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ToolFeatures",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ToolContentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Value = table.Column<string>(type: "TEXT", maxLength: 256, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToolFeatures", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ToolFeatures_ToolContents_ToolContentId",
                        column: x => x.ToolContentId,
                        principalTable: "ToolContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ToolRelated",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ToolContentId = table.Column<int>(type: "INTEGER", nullable: false),
                    RelatedSlug = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToolRelated", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ToolRelated_ToolContents_ToolContentId",
                        column: x => x.ToolContentId,
                        principalTable: "ToolContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ToolSteps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ToolContentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 160, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToolSteps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ToolSteps_ToolContents_ToolContentId",
                        column: x => x.ToolContentId,
                        principalTable: "ToolContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ToolUseCases",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ToolContentId = table.Column<int>(type: "INTEGER", nullable: false),
                    Value = table.Column<string>(type: "TEXT", maxLength: 400, nullable: false),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ToolUseCases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ToolUseCases_ToolContents_ToolContentId",
                        column: x => x.ToolContentId,
                        principalTable: "ToolContents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ToolCategories_Slug",
                table: "ToolCategories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ToolContents_Slug",
                table: "ToolContents",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ToolExamples_ToolContentId",
                table: "ToolExamples",
                column: "ToolContentId");

            migrationBuilder.CreateIndex(
                name: "IX_ToolFaqs_ToolContentId",
                table: "ToolFaqs",
                column: "ToolContentId");

            migrationBuilder.CreateIndex(
                name: "IX_ToolFeatures_ToolContentId",
                table: "ToolFeatures",
                column: "ToolContentId");

            migrationBuilder.CreateIndex(
                name: "IX_ToolRelated_ToolContentId",
                table: "ToolRelated",
                column: "ToolContentId");

            migrationBuilder.CreateIndex(
                name: "IX_ToolSteps_ToolContentId",
                table: "ToolSteps",
                column: "ToolContentId");

            migrationBuilder.CreateIndex(
                name: "IX_ToolUseCases_ToolContentId",
                table: "ToolUseCases",
                column: "ToolContentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ToolCategories");

            migrationBuilder.DropTable(
                name: "ToolExamples");

            migrationBuilder.DropTable(
                name: "ToolFaqs");

            migrationBuilder.DropTable(
                name: "ToolFeatures");

            migrationBuilder.DropTable(
                name: "ToolRelated");

            migrationBuilder.DropTable(
                name: "ToolSteps");

            migrationBuilder.DropTable(
                name: "ToolUseCases");

            migrationBuilder.DropTable(
                name: "ToolContents");
        }
    }
}
