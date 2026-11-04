using Gastos.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Gastos.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Gasto> Gastos => Set<Gasto>();
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<Ingreso> Ingresos => Set<Ingreso>();
    public DbSet<Presupuesto> Presupuestos => Set<Presupuesto>();
    public DbSet<CierreSemana> CierresSemana => Set<CierreSemana>();

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

        modelBuilder.Entity<Ingreso>(e =>
        {
            e.Property(i => i.Descripcion).HasMaxLength(100);
            e.Property(i => i.Monto).HasPrecision(14, 2);
            e.Property(i => i.Moneda).HasConversion<string>().HasMaxLength(3);
            e.HasIndex(i => i.Fecha);
        });

        modelBuilder.Entity<Presupuesto>(e =>
        {
            e.Property(p => p.Monto).HasPrecision(14, 2);
            // Un monto por categoría y mes. El índice empieza por CategoriaId, así también sirve para la clave foránea
            e.HasIndex(p => new { p.CategoriaId, p.Anio, p.Mes }).IsUnique();
            e.HasOne(p => p.Categoria)
                .WithMany()
                .HasForeignKey(p => p.CategoriaId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CierreSemana>(e =>
        {
            e.Property(c => c.Decision).HasConversion<string>().HasMaxLength(10);
            e.HasIndex(c => new { c.Anio, c.Mes, c.Semana }).IsUnique();
        });
    }
}
