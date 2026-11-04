using System.ComponentModel.DataAnnotations;
using Gastos.Api.Models;

namespace Gastos.Api.Dtos;

// ---------- Categorías ----------

public class CategoriaRequest
{
    [Required, StringLength(60, MinimumLength = 1)]
    public string Nombre { get; set; } = "";

    [Required, RegularExpression("^#[0-9a-fA-F]{6}$", ErrorMessage = "El color debe tener formato #RRGGBB.")]
    public string Color { get; set; } = "#64748b";

    public bool Archivada { get; set; }
}

public record CategoriaDto(int Id, string Nombre, string Color, bool Archivada, bool Obligatoria);

public class ObligatoriaRequest
{
    public bool Obligatoria { get; set; }
}

// ---------- Gastos ----------

public class GastoRequest
{
    [Required] public DateOnly? Fecha { get; set; }

    [Required]
    [Range(typeof(decimal), "0.01", "999999999999",
        ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true,
        ErrorMessage = "El monto debe ser mayor a cero.")]
    public decimal? Monto { get; set; }

    public Moneda Moneda { get; set; } = Moneda.ARS;

    /// <summary>Opcional: si no se escribe, en la lista se muestra el nombre de la categoría.</summary>
    [StringLength(200)]
    public string? Descripcion { get; set; }

    [Required] public int? CategoriaId { get; set; }
}

public record GastoDto(
    int Id,
    DateOnly Fecha,
    decimal Monto,
    Moneda Moneda,
    string Descripcion,
    int CategoriaId,
    string CategoriaNombre,
    string CategoriaColor);

// ---------- Ingresos ----------

public class IngresoRequest
{
    [Required] public DateOnly? Fecha { get; set; }

    [Required]
    [Range(typeof(decimal), "0.01", "999999999999",
        ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true,
        ErrorMessage = "El monto debe ser mayor a cero.")]
    public decimal? Monto { get; set; }

    public Moneda Moneda { get; set; } = Moneda.ARS;

    [Required, StringLength(100, MinimumLength = 1)]
    public string Descripcion { get; set; } = "";
}

public record IngresoDto(int Id, DateOnly Fecha, decimal Monto, Moneda Moneda, string Descripcion);

// ---------- Resumen ----------

public record TotalPorCategoriaDto(
    int CategoriaId,
    string Nombre,
    string Color,
    decimal TotalARS,
    decimal TotalUSD,
    int Cantidad);

public record ResumenMensualDto(
    int Anio,
    int Mes,
    decimal TotalARS,
    decimal TotalUSD,
    int CantidadGastos,
    decimal TotalARSMesAnterior,
    decimal IngresosARS,
    decimal IngresosUSD,
    List<TotalPorCategoriaDto> PorCategoria);

// ---------- Plan semanal ----------

public record PresupuestoDto(int CategoriaId, decimal Monto);

public record DecisionDto(int Semana, DecisionSobrante Decision);

public record PlanMesDto(int Anio, int Mes, List<PresupuestoDto> Presupuestos, List<DecisionDto> Decisiones);

public class PresupuestoRequest
{
    [Required] public int? CategoriaId { get; set; }

    [Required]
    [Range(typeof(decimal), "0", "999999999999",
        ParseLimitsInInvariantCulture = true, ConvertValueInInvariantCulture = true,
        ErrorMessage = "El monto no puede ser negativo.")]
    public decimal? Monto { get; set; }
}

public class DecisionRequest
{
    [Range(1, 4)] public int Semana { get; set; }

    /// <summary>null borra la decisión y la semana vuelve a quedar pendiente.</summary>
    public DecisionSobrante? Decision { get; set; }
}
