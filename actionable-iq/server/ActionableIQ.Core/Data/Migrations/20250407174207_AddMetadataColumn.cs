﻿using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ActionableIQ.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMetadataColumn : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Metadata",
                table: "UserAuthProviders",
                type: "character varying(2048)",
                maxLength: 2048,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Metadata",
                table: "UserAuthProviders");
        }
    }
}
