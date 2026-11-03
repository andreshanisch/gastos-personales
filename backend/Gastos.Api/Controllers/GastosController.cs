using Gastos.Api.Data;
using Gastos.Api.Dtos;
using Gastos.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gastos.Api.Controllers;

[ApiController]
[Route("api/gastos")]
public class GastosController(AppDbContext db) : ControllerBase
{
    /// <summary>Gastos de un mes, del más reciente al más viejo.</summary>
    [HttpGet]
    public async Task<ActionResult<List<GastoDto>>> Listar([FromQuery] int anio, [FromQuery] int mes)
    {
        if (mes is < 1 or > 12 || anio is < 2000 or > 2100)
            return BadRequest(new { mensaje = "Año o mes inválido." });

        var desde = new DateOnly(anio, mes, 1);
        var hasta = desde.AddMonths(1);

        return await db.Gastos
            .Where(g => g.Fecha >= desde && g.Fecha < hasta)
            .OrderByDescending(g => g.Fecha)
            .ThenByDescending(g => g.Id)
            .Select(g => new GastoDto(
                g.Id, g.Fecha, g.Monto, g.Moneda, g.Descripcion,
                g.CategoriaId, g.Categoria!.Nombre, g.Categoria!.Color))
            .ToListAsync();
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<GastoDto>> Obtener(int id)
    {
        var gasto = await db.Gastos.Include(g => g.Categoria).FirstOrDefaultAsync(g => g.Id == id);
        return gasto is null ? NotFound() : ADto(gasto);
    }

    [HttpPost]
    public async Task<ActionResult<GastoDto>> Crear(GastoRequest request)
    {
        var categoria = await db.Categorias.FindAsync(request.CategoriaId!.Value);
        if (categoria is null || categoria.Archivada)
            return BadRequest(new { mensaje = "La categoría no existe o está archivada." });

        var gasto = new Gasto
        {
            Fecha = request.Fecha!.Value,
            Monto = request.Monto!.Value,
            Moneda = request.Moneda,
            Descripcion = request.Descripcion.Trim(),
            CategoriaId = categoria.Id,
            Categoria = categoria
        };
        db.Gastos.Add(gasto);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Obtener), new { id = gasto.Id }, ADto(gasto));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<GastoDto>> Editar(int id, GastoRequest request)
    {
        var gasto = await db.Gastos.FindAsync(id);
        if (gasto is null) return NotFound();

        var categoria = await db.Categorias.FindAsync(request.CategoriaId!.Value);
        if (categoria is null)
            return BadRequest(new { mensaje = "La categoría no existe." });
        // Se permite mantener una categoría archivada si el gasto ya la tenía
        if (categoria.Archivada && categoria.Id != gasto.CategoriaId)
            return BadRequest(new { mensaje = "No se puede mover un gasto a una categoría archivada." });

        gasto.Fecha = request.Fecha!.Value;
        gasto.Monto = request.Monto!.Value;
        gasto.Moneda = request.Moneda;
        gasto.Descripcion = request.Descripcion.Trim();
        gasto.CategoriaId = categoria.Id;
        gasto.Categoria = categoria;
        await db.SaveChangesAsync();

        return ADto(gasto);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var borrados = await db.Gastos.Where(g => g.Id == id).ExecuteDeleteAsync();
        return borrados == 0 ? NotFound() : NoContent();
    }

    private static GastoDto ADto(Gasto g) => new(
        g.Id, g.Fecha, g.Monto, g.Moneda, g.Descripcion,
        g.CategoriaId, g.Categoria!.Nombre, g.Categoria!.Color);
}
