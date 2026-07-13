using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Directum360Feedback.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Directum360Feedback.Infrastructure.Migrations
{
    /// <summary>
    /// Предопределённые списки респондентов (шаблоны состава оценивающих).
    /// </summary>
    [DbContext(typeof(AppDbContext))]
    [Migration("20260713120000_AddRespondentTemplates")]
    public partial class AddRespondentTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RespondentTemplates",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    Description = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RespondentTemplates", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "RespondentTemplateItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    TemplateId = table.Column<int>(type: "INTEGER", nullable: false),
                    // null = «сам оцениваемый» (самооценка)
                    EmployeeId = table.Column<int>(type: "INTEGER", nullable: true),
                    Role = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RespondentTemplateItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RespondentTemplateItems_Employees_EmployeeId",
                        column: x => x.EmployeeId,
                        principalTable: "Employees",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_RespondentTemplateItems_RespondentTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "RespondentTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RespondentTemplateItems_EmployeeId",
                table: "RespondentTemplateItems",
                column: "EmployeeId");

            migrationBuilder.CreateIndex(
                name: "IX_RespondentTemplateItems_TemplateId",
                table: "RespondentTemplateItems",
                column: "TemplateId");

            migrationBuilder.InsertData(
                table: "RespondentTemplates",
                columns: new[] { "Id", "CreatedAt", "Description", "Name" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Самооценка + руководитель + два коллеги", "Классическая 360" },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Горизонтальная оценка без руководителя", "Только коллеги" }
                });

            migrationBuilder.InsertData(
                table: "RespondentTemplateItems",
                columns: new[] { "Id", "CreatedAt", "EmployeeId", "Role", "TemplateId" },
                values: new object[,]
                {
                    { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null, 0, 1 },
                    { 2, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, 1, 1 },
                    { 3, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 2, 2, 1 },
                    { 4, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 3, 2, 1 },
                    { 5, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 2, 2, 2 },
                    { 6, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 3, 2, 2 },
                    { 7, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 4, 2, 2 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "RespondentTemplateItems");
            migrationBuilder.DropTable(name: "RespondentTemplates");
        }
    }
}
