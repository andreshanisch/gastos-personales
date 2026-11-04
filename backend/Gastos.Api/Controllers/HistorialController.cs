using Gastos.Api.Data;
using Gastos.Api.Dtos;
using Gastos.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gastos.Api.Controllers;

/// <summary>Ingresos y gastos en pesos de los últimos meses, para ver la evolución.</summary>
[ApiController]
[Route("api/historial")]
public class HistorialController(AppDbContext db) : ControllerBase
{
    /// <param name="meses">Cuántos meses mirar hacia atrás, incluido el actual (1 a 24).</param>
    [HttpGet]
    public async Task<ActionResult<HistorialDto>> Obtener([FromQuery] int meses = 12)
    {
        if (meses is < 1 or > 24) return BadRequest(new { mensaje = "Se pueden ver entre 1 y 24 meses." });

        var hoy = DateOnly.FromDateTime(DateTime.Today);
        var hasta = new DateOnly(hoy.Year, hoy.Month, 1).AddMonths(1);
        var desde = hasta.AddMonths(-meses);

        var gastos = await db.Gastos
            .Where(g => g.Fecha >= desde && g.Fecha < hasta && g.Moneda == Moneda.ARS)
            .GroupBy(g => new { g.Fecha.Year, g.Fecha.Month, g.CategoriaId })
            .Select(x => new { x.Key.Year, x.Key.Month, x.Key.CategoriaId, Total = x.Sum(g => g.Monto) })
            .ToListAsync();

        var ingresos = await db.Ingresos
            .Where(i => i.Fecha >= desde && i.Fecha < hasta && i.Moneda == Moneda.ARS)
            .GroupBy(i => new { i.Fecha.Year, i.Fecha.Month })
            .Select(x => new { x.Key.Year, x.Key.Month, Total = x.Sum(i => i.Monto) })
            .ToListAsync();

        // Todos los meses del rango, aunque no tengan movimientos, del más viejo al más nuevo
        var lista = new List<MesHistorialDto>();
        for (var m = desde; m < hasta; m = m.AddMonths(1))
        {
            var delMes = gastos.Where(g => g.Year == m.Year && g.Month == m.Month).ToList();
            lista.Add(new MesHistorialDto(
                m.Year,
                m.Month,
                ingresos.Where(i => i.Year == m.Year && i.Month == m.Month).Sum(i => i.Total),
                delMes.Sum(g => g.Total),
                delMes.OrderByDescending(g => g.Total).Select(g => new TotalCategoriaMesDto(g.CategoriaId, g.Total)).ToList()));
        }

        // Incluye las archivadas, porque pueden tener gastos en meses anteriores
        var categorias = await db.Categorias
            .OrderBy(c => c.Nombre)
            .Select(c => new CategoriaDto(c.Id, c.Nombre, c.Color, c.Archivada, c.Obligatoria))
            .ToListAsync();

        return new HistorialDto(lista, categorias);
    }
}
