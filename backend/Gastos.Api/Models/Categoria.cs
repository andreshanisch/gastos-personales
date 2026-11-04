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

    /// <summary>
    /// Gasto que no se puede evitar (alquiler, servicios, tarjeta...). El plan semanal le reserva
    /// un monto al principio del mes y reparte el resto del ingreso entre las semanas.
    /// </summary>
    public bool Obligatoria { get; set; }

    public List<Gasto> Gastos { get; set; } = [];
}
