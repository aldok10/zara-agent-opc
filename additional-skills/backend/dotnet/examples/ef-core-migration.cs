// EF Core Migration: Expand-Contract Pattern
// Demonstrates safe, zero-downtime schema evolution

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;

// --- Phase 1: EXPAND (deploy first) ---
// Add new column alongside old one. Both coexist.

public partial class AddProductSlugColumn : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Add new nullable column (non-breaking)
        migrationBuilder.AddColumn<string>(
            name: "Slug",
            table: "Products",
            type: "character varying(250)",
            maxLength: 250,
            nullable: true);

        // Create index for slug lookups
        migrationBuilder.CreateIndex(
            name: "IX_Products_Slug",
            table: "Products",
            column: "Slug",
            unique: true,
            filter: "\"Slug\" IS NOT NULL");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex("IX_Products_Slug", "Products");
        migrationBuilder.DropColumn("Slug", "Products");
    }
}

// --- Phase 2: BACKFILL (run as background job or separate migration) ---

public partial class BackfillProductSlugs : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Idempotent: only updates rows without slug
        migrationBuilder.Sql("""
            UPDATE "Products"
            SET "Slug" = LOWER(REGEXP_REPLACE("Name", '[^a-zA-Z0-9]+', '-', 'g'))
            WHERE "Slug" IS NULL;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Backfill is reversible by nulling out
        migrationBuilder.Sql("""
            UPDATE "Products" SET "Slug" = NULL;
            """);
    }
}

// --- Phase 3: CONTRACT (deploy after all instances use new column) ---

public partial class MakeProductSlugRequired : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Now safe to enforce NOT NULL — all rows have values
        migrationBuilder.AlterColumn<string>(
            name: "Slug",
            table: "Products",
            type: "character varying(250)",
            maxLength: 250,
            nullable: false,
            defaultValue: "",
            oldClrType: typeof(string),
            oldType: "character varying(250)",
            oldMaxLength: 250,
            oldNullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<string>(
            name: "Slug",
            table: "Products",
            type: "character varying(250)",
            maxLength: 250,
            nullable: true,
            oldClrType: typeof(string),
            oldType: "character varying(250)",
            oldMaxLength: 250,
            oldNullable: false);
    }
}

// --- Entity Configuration (after contract phase) ---

public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.Name).HasMaxLength(200).IsRequired();
        builder.Property(p => p.Slug).HasMaxLength(250).IsRequired();
        builder.HasIndex(p => p.Slug).IsUnique();
        builder.Property(p => p.Price).HasPrecision(10, 2);
    }
}

// --- DbContext with Interceptor for auto-generating slugs ---

public sealed class SlugGenerationInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken ct = default)
    {
        var context = eventData.Context!;

        foreach (var entry in context.ChangeTracker.Entries<Product>())
        {
            if (entry.State is EntityState.Added or EntityState.Modified)
            {
                if (string.IsNullOrEmpty(entry.Entity.Slug))
                {
                    entry.Entity.Slug = GenerateSlug(entry.Entity.Name);
                }
            }
        }

        return base.SavingChangesAsync(eventData, result, ct);
    }

    private static string GenerateSlug(string name) =>
        System.Text.RegularExpressions.Regex
            .Replace(name.ToLowerInvariant(), @"[^a-z0-9]+", "-")
            .Trim('-');
}
