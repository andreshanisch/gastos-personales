namespace Gastos.Api.Models;

/// <summary>Monto estimado para una categoría obligatoria en un mes (en pesos).</summary>
public class Presupuesto
{
    public int Id { get; set; }

    public int CategoriaId { get; set; }

    public Categoria? Categoria { get; set; }

    public int Anio { get; set; }

    public int Mes { get; set; }

    public decimal Monto { get; set; }
}
