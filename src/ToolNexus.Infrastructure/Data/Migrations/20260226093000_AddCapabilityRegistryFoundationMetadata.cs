using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ToolNexus.Infrastructure.Data.Migrations
{
    public partial class AddCapabilityRegistryFoundationMetadata : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "execution_capability_type",
                table: "capability_registry",
                type: "character varying(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "standard");

            migrationBuilder.AddColumn<int>(
                name: "ui_rendering_type",
                table: "capability_registry",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "activation_state",
                table: "capability_registry",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "idx_capability_registry_activation_state",
                table: "capability_registry",
                column: "activation_state");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "idx_capability_registry_activation_state",
                table: "capability_registry");

            migrationBuilder.DropColumn(
                name: "execution_capability_type",
                table: "capability_registry");

            migrationBuilder.DropColumn(
                name: "ui_rendering_type",
                table: "capability_registry");

            migrationBuilder.DropColumn(
                name: "activation_state",
                table: "capability_registry");
        }
    }
}
