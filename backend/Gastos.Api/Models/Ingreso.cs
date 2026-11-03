namespace Gastos.Api.Models;

/// <summary>Un ingreso del mes: sueldo, aguinaldo, un trabajo extra, etc.</summary>
public class Ingreso
{
    public int Id { get; set; }

    public DateOnly Fecha { get; set; }

    public decimal Monto { get; set; }

    public Moneda Moneda { get; set; } = Moneda.ARS;

    public required string Descripcion { get; set; }

    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
}
