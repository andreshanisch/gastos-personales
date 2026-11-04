using Gastos.Api.Data;
using Gastos.Api.Dtos;
using Gastos.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gastos.Api.Controllers;

/// <summary>
/// Datos guardados del plan semanal: qué hacer con el sobrante de cada semana.
/// El cálculo de las semanas se hace en la página, a partir de ingresos, gastos y categorías obligatorias.
/// </summary>
[ApiController]
[Route("api/plan")]
public class PlanController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<PlanMesDto>> Obtener([FromQuery] int anio, [FromQuery] int mes)
    {
        if (!MesValido(anio, mes)) return BadRequest(new { mensaje = "Año o mes inválido." });

        var decisiones = await db.CierresSemana
            .Where(c => c.Anio == anio && c.Mes == mes)
            .OrderBy(c => c.Semana)
            .Select(c => new DecisionDto(c.Semana, c.Decision))
            .ToListAsync();

        return new PlanMesDto(anio, mes, decisiones);
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
