namespace Gastos.Api.Models;

public class Categoria
{
    public int Id { get; set; }

    public required string Nombre { get; set; }

    /// <summary>Color en formato hex (#RRGGBB) para mostrar en la app.</summary>
    public string Color { get; set; } = "#64748b";

    /// <summary>
    /// Las categorías con gastos no se borran: se archivan para no perder el historial.
    /// </summary>
    public bool Archivada { get; set; }

    public List<Gasto> Gastos { get; set; } = [];
}
