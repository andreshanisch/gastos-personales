using Gastos.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Gastos.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Gasto> Gastos => Set<Gasto>();
    public DbSet<Categoria> Categorias => Set<Categoria>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Categoria>(e =>
        {
            e.Property(c => c.Nombre).HasMaxLength(60);
            e.Property(c => c.Color).HasMaxLength(7);
            e.HasIndex(c => c.Nombre).IsUnique();
        });

        modelBuilder.Entity<Gasto>(e =>
        {
            e.Property(g => g.Descripcion).HasMaxLength(200);
            e.Property(g => g.Monto).HasPrecision(14, 2);
            e.Property(g => g.Moneda).HasConversion<string>().HasMaxLength(3);
            e.HasIndex(g => g.Fecha);
            e.HasOne(g => g.Categoria)
                .WithMany(c => c.Gastos)
                .HasForeignKey(g => g.CategoriaId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
