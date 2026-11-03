using Gastos.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Gastos.Api.Data;

public static class SeedData
{
    private static readonly (string Nombre, string Color)[] CategoriasIniciales =
    [
        ("Supermercado", "#16a34a"),
        ("Alquiler y expensas", "#0f766e"),
        ("Servicios", "#0284c7"),
        ("Transporte", "#ca8a04"),
        ("Salidas y comida", "#ea580c"),
        ("Suscripciones", "#7c3aed"),
        ("Salud", "#dc2626"),
        ("Ropa", "#db2777"),
        ("Educación", "#4f46e5"),
        ("Otros", "#64748b"),
    ];

    /// <summary>Carga categorías por defecto solo si la tabla está vacía.</summary>
    public static async Task CargarAsync(AppDbContext db)
    {
        if (await db.Categorias.AnyAsync()) return;

        db.Categorias.AddRange(CategoriasIniciales.Select(c => new Categoria
        {
            Nombre = c.Nombre,
            Color = c.Color
        }));
        await db.SaveChangesAsync();
    }
}
