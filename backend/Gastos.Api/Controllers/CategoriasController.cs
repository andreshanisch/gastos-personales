using Gastos.Api.Data;
using Gastos.Api.Dtos;
using Gastos.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Gastos.Api.Controllers;

[ApiController]
[Route("api/categorias")]
public class CategoriasController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<List<CategoriaDto>> Listar([FromQuery] bool incluirArchivadas = false) =>
        await db.Categorias
            .Where(c => incluirArchivadas || !c.Archivada)
            .OrderBy(c => c.Nombre)
            .Select(c => new CategoriaDto(c.Id, c.Nombre, c.Color, c.Archivada))
            .ToListAsync();

    [HttpPost]
    public async Task<ActionResult<CategoriaDto>> Crear(CategoriaRequest request)
    {
        var nombre = request.Nombre.Trim();
        if (await db.Categorias.AnyAsync(c => c.Nombre == nombre))
            return Conflict(new { mensaje = $"Ya existe una categoría llamada '{nombre}'." });

        var categoria = new Categoria { Nombre = nombre, Color = request.Color };
        db.Categorias.Add(categoria);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Listar), ADto(categoria));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<CategoriaDto>> Editar(int id, CategoriaRequest request)
    {
        var categoria = await db.Categorias.FindAsync(id);
        if (categoria is null) return NotFound();

        var nombre = request.Nombre.Trim();
        if (await db.Categorias.AnyAsync(c => c.Id != id && c.Nombre == nombre))
            return Conflict(new { mensaje = $"Ya existe una categoría llamada '{nombre}'." });

        categoria.Nombre = nombre;
        categoria.Color = request.Color;
        categoria.Archivada = request.Archivada;
        await db.SaveChangesAsync();

        return ADto(categoria);
    }

    /// <summary>
    /// Si la categoría no tiene gastos se borra; si tiene, se archiva para conservar el historial.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Eliminar(int id)
    {
        var categoria = await db.Categorias.FindAsync(id);
        if (categoria is null) return NotFound();

        if (await db.Gastos.AnyAsync(g => g.CategoriaId == id))
            categoria.Archivada = true;
        else
            db.Categorias.Remove(categoria);

        await db.SaveChangesAsync();
        return NoContent();
    }

    private static CategoriaDto ADto(Categoria c) => new(c.Id, c.Nombre, c.Color, c.Archivada);
}
