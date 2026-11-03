using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Gastos.Api.Data;

/// <summary>
/// Lo usa `dotnet ef migrations add` para crear el DbContext sin levantar toda la app
/// (así no exige tener configurados los secretos de login para generar una migración).
/// Generar una migración no se conecta a la base, por eso alcanza con una conexión ficticia.
/// </summary>
public class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=gastos;Username=gastos;Password=gastos")
            .Options;
        return new AppDbContext(options);
    }
}
