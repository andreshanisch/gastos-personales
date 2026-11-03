using Gastos.Api.Data;
using Gastos.Api.Dtos;
using Gastos.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gastos.Api.Controllers;

[ApiController]
[Route("api/ingresos")]
public class IngresosController(AppDbContext db) : ControllerBase
{
    /// <summary>Ingresos de un mes, del más reciente al más viejo.</summary>
    [HttpGet]
    public async Task<ActionResult<List<IngresoDto>>> Listar([FromQuery] int anio, [FromQuery] int mes)
    {
        if (mes is < 1 or > 12 || anio is < 2000 or > 2100)
            return BadRequest(new { mensaje = "Año o mes inválido." });

        var desde = new DateOnly(anio, mes, 1);
        var hasta = desde.AddMonths(1);

        return await db.Ingresos
            .Where(i => i.Fecha >= desde && i.Fecha < hasta)
            .OrderByDescending(i => i.Fecha)
            .ThenByDescending(i => i.Id)
            .Select(i => new IngresoDto(i.Id, i.Fecha, i.Monto, i.Moneda, i.Descripcion))
            .ToListAsync();
    }

    [HttpPost]
    public async Task<ActionResult<IngresoDto>> Crear(IngresoRequest request)
    {
        var ingreso = new Ingreso
        {
            Fecha = request.Fecha!.Value,
            Monto = request.Monto!.Value,
            Moneda = request.Moneda,
            Descripcion = request.Descripcion.Trim()
        };
        db.Ingresos.Add(ingreso);
        await db.SaveChangesAsync();

        return Created($"/api/ingresos/{ingreso.Id}", ADto(ingreso));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<IngresoDto>> Editar(int id, IngresoRequest request)
    {
        var ingreso = await db.Ingresos.FindAsync(id);
        if (ingreso is null) return NotFound();

        ingreso.Fecha = request.Fecha!.Value;
        ingreso.Monto = request.Monto!.Value;
        ingreso.Moneda = request.Moneda;
        ingreso.Descripcion = request.Descripcion.Trim();
        await db.SaveChangesAsync();

        return ADto(ingreso);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var borrados = await db.Ingresos.Where(i => i.Id == id).ExecuteDeleteAsync();
        return borrados == 0 ? NotFound() : NoContent();
    }

    /// <summary>
    /// Copia los ingresos del mes anterior al mes indicado (mismo día, ajustado si el mes es más corto).
    /// Sirve para no cargar el sueldo a mano cada mes. Solo copia si el mes destino no tiene ingresos.
    /// </summary>
    [HttpPost("copiar-mes-anterior")]
    public async Task<ActionResult<List<IngresoDto>>> CopiarMesAnterior([FromQuery] int anio, [FromQuery] int mes)
    {
        if (mes is < 1 or > 12 || anio is < 2000 or > 2100)
            return BadRequest(new { mensaje = "Año o mes inválido." });

        var desde = new DateOnly(anio, mes, 1);
        var hasta = desde.AddMonths(1);
        var desdeAnterior = desde.AddMonths(-1);

        if (await db.Ingresos.AnyAsync(i => i.Fecha >= desde && i.Fecha < hasta))
            return Conflict(new { mensaje = "Este mes ya tiene ingresos cargados." });

        var anteriores = await db.Ingresos
            .Where(i => i.Fecha >= desdeAnterior && i.Fecha < desde)
            .OrderBy(i => i.Fecha)
            .ToListAsync();
        if (anteriores.Count == 0)
            return BadRequest(new { mensaje = "El mes anterior no tiene ingresos para copiar." });

        var ultimoDia = DateTime.DaysInMonth(anio, mes);
        var copias = anteriores.Select(i => new Ingreso
        {
            Fecha = new DateOnly(anio, mes, Math.Min(i.Fecha.Day, ultimoDia)),
            Monto = i.Monto,
            Moneda = i.Moneda,
            Descripcion = i.Descripcion
        }).ToList();
        db.Ingresos.AddRange(copias);
        await db.SaveChangesAsync();

        return copias.Select(ADto).ToList();
    }

    private static IngresoDto ADto(Ingreso i) => new(i.Id, i.Fecha, i.Monto, i.Moneda, i.Descripcion);
}
