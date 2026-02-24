using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using ToolNexus.Infrastructure.Data;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    [DbContext(typeof(ToolNexusContentDbContext))]
    [Migration("20260310000000_AddRuntimeIncidentCorrelationId")]
    public partial class AddRuntimeIncidentCorrelationId : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CorrelationId",
                table: "RuntimeIncidents",
                type: "TEXT",
                maxLength: 120,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CorrelationId",
                table: "RuntimeIncidents");
        }
    }
}
