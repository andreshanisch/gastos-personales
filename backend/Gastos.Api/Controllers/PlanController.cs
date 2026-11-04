using Gastos.Api.Data;
using Gastos.Api.Dtos;
using Gastos.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gastos.Api.Controllers;

/// <summary>
/// Datos guardados del plan semanal: montos estimados de las categorías obligatorias y
/// qué hacer con el sobrante de cada semana. El cálculo de las semanas se hace en la página.
/// </summary>
[ApiController]
[Route("api/plan")]
public class PlanController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PlanMesDto>> Obtener([FromQuery] int anio, [FromQuery] int mes)
    {
        if (!MesValido(anio, mes)) return BadRequest(new { mensaje = "Año o mes inválido." });

        var presupuestos = await db.Presupuestos
            .Where(p => p.Anio == anio && p.Mes == mes)
            .Select(p => new PresupuestoDto(p.CategoriaId, p.Monto))
            .ToListAsync();

        var decisiones = await db.CierresSemana
            .Where(c => c.Anio == anio && c.Mes == mes)
            .OrderBy(c => c.Semana)
            .Select(c => new DecisionDto(c.Semana, c.Decision))
            .ToListAsync();

        return new PlanMesDto(anio, mes, presupuestos, decisiones);
    }

    /// <summary>Reemplaza los montos estimados de las categorías obligatorias del mes.</summary>
    [HttpPut("presupuestos")]
    public async Task<ActionResult<PlanMesDto>> GuardarPresupuestos(
        [FromQuery] int anio, [FromQuery] int mes, List<PresupuestoRequest> montos)
    {
        if (!MesValido(anio, mes)) return BadRequest(new { mensaje = "Año o mes inválido." });

        var ids = montos.Select(m => m.CategoriaId!.Value).Distinct().ToList();
        var existentes = await db.Categorias.Where(c => ids.Contains(c.Id)).Select(c => c.Id).ToListAsync();
        if (existentes.Count != ids.Count)
            return BadRequest(new { mensaje = "Alguna de las categorías no existe." });

        await db.Presupuestos.Where(p => p.Anio == anio && p.Mes == mes).ExecuteDeleteAsync();
        db.Presupuestos.AddRange(montos
            .GroupBy(m => m.CategoriaId!.Value)
            .Select(g => new Presupuesto
            {
                CategoriaId = g.Key,
                Anio = anio,
                Mes = mes,
                Monto = g.Last().Monto!.Value
            }));
        await db.SaveChangesAsync();

        return await Obtener(anio, mes);
    }

    /// <summary>Guarda qué hacer con el sobrante de una semana (o lo borra si Decision es null).</summary>
    [HttpPut("decisiones")]
    public async Task<ActionResult<PlanMesDto>> GuardarDecision(
        [FromQuery] int anio, [FromQuery] int mes, DecisionRequest request)
    {
        if (!MesValido(anio, mes)) return BadRequest(new { mensaje = "Año o mes inválido." });
        if (request.Semana == 4 && request.Decision == DecisionSobrante.Repartir)
            return BadRequest(new { mensaje = "La última semana no tiene semanas siguientes para repartir el sobrante." });

        var cierre = await db.CierresSemana
            .FirstOrDefaultAsync(c => c.Anio == anio && c.Mes == mes && c.Semana == request.Semana);

        if (request.Decision is null)
        {
            if (cierre is not null) db.CierresSemana.Remove(cierre);
        }
        else if (cierre is null)
        {
            db.CierresSemana.Add(new CierreSemana
            {
                Anio = anio, Mes = mes, Semana = request.Semana, Decision = request.Decision.Value
            });
        }
        else
        {
            cierre.Decision = request.Decision.Value;
        }
        await db.SaveChangesAsync();

        return await Obtener(anio, mes);
    }

    private static bool MesValido(int anio, int mes) => mes is >= 1 and <= 12 && anio is >= 2000 and <= 2100;
}
