using System.Text.Json.Serialization;
using Gastos.Api.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

var builder = WebApplication.CreateBuilder(args);

// ---------- Base de datos (PostgreSQL en Docker, ver docker-compose.yml) ----------
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Falta ConnectionStrings:Default en appsettings.json.");
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(connectionString));

builder.Services
    .AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

// La app escucha solo en esta computadora (localhost): nadie de la red puede conectarse.
// La dirección está en Properties/launchSettings.json.

var app = builder.Build();

// Aplica migraciones pendientes y carga las categorías iniciales.
// Si Docker recién arranca, la base puede tardar unos segundos en aceptar conexiones: se reintenta.
for (var intento = 1; ; intento++)
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.MigrateAsync();
        await SeedData.CargarAsync(db);
        break;
    }
    catch (Exception ex) when (intento < 20 && ex is NpgsqlException or TimeoutException)
    {
        app.Logger.LogWarning("La base todavía no responde (intento {Intento} de 20). Reintentando...", intento);
        await Task.Delay(TimeSpan.FromSeconds(3));
    }
}

// La página (React compilado en wwwroot) se sirve desde la misma dirección que la API
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/health", () => Results.Ok(new { estado = "ok" }));
app.MapControllers();

app.Run();
