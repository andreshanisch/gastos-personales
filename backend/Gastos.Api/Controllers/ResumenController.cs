using Gastos.Api.Data;
using Gastos.Api.Dtos;
using Gastos.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gastos.Api.Controllers;

[ApiController]
[Route("api/resumen")]
public class ResumenController(AppDbContext db) : ControllerBase
{
    /// <summary>
    /// Totales del mes (separados por moneda, sin convertir todavía),
    /// desglose por categoría y total en pesos del mes anterior para comparar.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ResumenMensualDto>> Mensual([FromQuery] int anio, [FromQuery] int mes)
    {
        if (mes is < 1 or > 12 || anio is < 2000 or > 2100)
            return BadRequest(new { mensaje = "Año o mes inválido." });

        var desde = new DateOnly(anio, mes, 1);
        var hasta = desde.AddMonths(1);
        var desdeAnterior = desde.AddMonths(-1);

        var porCategoria = await db.Gastos
            .Where(g => g.Fecha >= desde && g.Fecha < hasta)
            .GroupBy(g => new { g.CategoriaId, g.Categoria!.Nombre, g.Categoria!.Color })
            .Select(grupo => new TotalPorCategoriaDto(
                grupo.Key.CategoriaId,
                grupo.Key.Nombre,
                grupo.Key.Color,
                grupo.Sum(g => g.Moneda == Moneda.ARS ? g.Monto : 0m),
                grupo.Sum(g => g.Moneda == Moneda.USD ? g.Monto : 0m),
                grupo.Count()))
            .ToListAsync();

        porCategoria = porCategoria
            .OrderByDescending(c => c.TotalARS)
            .ThenByDescending(c => c.TotalUSD)
            .ToList();

        var totalAnterior = await db.Gastos
            .Where(g => g.Fecha >= desdeAnterior && g.Fecha < desde && g.Moneda == Moneda.ARS)
            .SumAsync(g => g.Monto);

        return new ResumenMensualDto(
            anio,
            mes,
            porCategoria.Sum(c => c.TotalARS),
            porCategoria.Sum(c => c.TotalUSD),
            porCategoria.Sum(c => c.Cantidad),
            totalAnterior,
            porCategoria);
    }
}
