namespace Gastos.Api.Models;

public class Gasto
{
    public int Id { get; set; }

    public DateOnly Fecha { get; set; }

    public decimal Monto { get; set; }

    public Moneda Moneda { get; set; } = Moneda.ARS;

    public required string Descripcion { get; set; }

    public int CategoriaId { get; set; }

    public Categoria? Categoria { get; set; }

    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
}

public enum Moneda
{
    ARS,
    USD
}
