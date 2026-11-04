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

    private const int MaximoResultados = 2000;

    /// <summary>
    /// Busca gastos por texto (en la descripción o el nombre de la categoría), categoría,
    /// rango de fechas y moneda. Todos los filtros son opcionales. Del más reciente al más viejo.
    /// </summary>
    [HttpGet("buscar")]
    public async Task<ActionResult<ResultadoBusquedaDto>> Buscar(
        [FromQuery] string? texto,
        [FromQuery] int? categoriaId,
        [FromQuery] DateOnly? desde,
        [FromQuery] DateOnly? hasta,
        [FromQuery] Moneda? moneda)
    {
        if (desde is not null && hasta is not null && desde > hasta)
            return BadRequest(new { mensaje = "La fecha \"desde\" no puede ser posterior a \"hasta\"." });

        var consulta = db.Gastos.AsQueryable();

        if (!string.IsNullOrWhiteSpace(texto))
        {
            // Se escapan los comodines de LIKE para buscar el texto tal cual
            var patron = "%" + texto.Trim().Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_") + "%";
            consulta = consulta.Where(g =>
                EF.Functions.ILike(g.Descripcion, patron, "\\") ||
                EF.Functions.ILike(g.Categoria!.Nombre, patron, "\\"));
        }
        if (categoriaId is not null) consulta = consulta.Where(g => g.CategoriaId == categoriaId);
        if (desde is not null) consulta = consulta.Where(g => g.Fecha >= desde);
        if (hasta is not null) consulta = consulta.Where(g => g.Fecha <= hasta);
        if (moneda is not null) consulta = consulta.Where(g => g.Moneda == moneda);

        var gastos = await consulta
            .OrderByDescending(g => g.Fecha)
            .ThenByDescending(g => g.Id)
            .Take(MaximoResultados + 1)
            .Select(g => new GastoDto(
                g.Id, g.Fecha, g.Monto, g.Moneda, g.Descripcion,
                g.CategoriaId, g.Categoria!.Nombre, g.Categoria!.Color))
            .ToListAsync();

        var recortado = gastos.Count > MaximoResultados;
        if (recortado) gastos.RemoveAt(gastos.Count - 1);
        return new ResultadoBusquedaDto(gastos, recortado);
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
            Descripcion = request.Descripcion?.Trim() ?? "",
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
        gasto.Descripcion = request.Descripcion?.Trim() ?? "";
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
