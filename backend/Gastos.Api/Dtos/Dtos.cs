using System.ComponentModel.DataAnnotations;
using Gastos.Api.Models;

namespace Gastos.Api.Dtos;

// ---------- Auth ----------

public class LoginRequest
{
    [Required] public string Usuario { get; set; } = "";
    [Required] public string Password { get; set; } = "";
}

public record LoginResponse(string Token, DateTime Expira);

// ---------- Categorías ----------

public class CategoriaRequest
{
    [Required, StringLength(60, MinimumLength = 1)]
    public string Nombre { get; set; } = "";

    [Required, RegularExpression("^#[0-9a-fA-F]{6}$", ErrorMessage = "El color debe tener formato #RRGGBB.")]
    public string Color { get; set; } = "#64748b";

    public bool Archivada { get; set; }
}

public record CategoriaDto(int Id, string Nombre, string Color, bool Archivada);

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

    [Required, StringLength(200, MinimumLength = 1)]
    public string Descripcion { get; set; } = "";

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
    List<TotalPorCategoriaDto> PorCategoria);
