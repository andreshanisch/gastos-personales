using System.Text.Json.Serialization;
using Gastos.Api.Auth;
using Gastos.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

// Utilidad para generar el hash de la contraseña: dotnet run -- hash-password
if (args.Length > 0 && args[0] == "hash-password")
{
    var password = PasswordHasher.LeerPasswordDeConsola("Contraseña: ");
    var confirmacion = PasswordHasher.LeerPasswordDeConsola("Repetila: ");
    if (password != confirmacion)
    {
        Console.WriteLine("Las contraseñas no coinciden.");
        return 1;
    }
    if (password.Length < 10)
    {
        Console.WriteLine("Usá al menos 10 caracteres: la app va a estar expuesta en internet.");
        return 1;
    }
    Console.WriteLine();
    Console.WriteLine("Guardá este valor en Auth__PasswordHash (variable de entorno o user-secrets):");
    Console.WriteLine(PasswordHasher.Hashear(password));
    return 0;
}

var builder = WebApplication.CreateBuilder(args);

// Algunos hostings (Render, Railway) indican el puerto con la variable PORT
var puerto = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(puerto))
    builder.WebHost.UseUrls($"http://0.0.0.0:{puerto}");

// ---------- Configuración de login (desde variables de entorno / user-secrets) ----------
var authOptions = builder.Configuration.GetSection(AuthOptions.Seccion).Get<AuthOptions>() ?? new AuthOptions();
authOptions.Validar();
builder.Services.Configure<AuthOptions>(builder.Configuration.GetSection(AuthOptions.Seccion));
builder.Services.AddSingleton<TokenService>();

// ---------- Base de datos ----------
// Orden: ConnectionStrings__Default (local / Render) y, si no está, las variables que escribe `neon env pull`.
// Se prefiere DATABASE_URL_UNPOOLED (conexión directa) porque la app aplica migraciones al arrancar y
// eso no funciona bien a través del pooler de Neon (PgBouncer en modo transacción). Al ser un servidor
// de larga duración, Npgsql ya mantiene su propio pool de conexiones.
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? builder.Configuration["DATABASE_URL_UNPOOLED"]
    ?? builder.Configuration["DATABASE_URL"]
    ?? throw new InvalidOperationException(
        "Falta configurar la base: ConnectionStrings__Default o DATABASE_URL_UNPOOLED. Ver README.");
builder.Services.AddDbContext<AppDbContext>(o => o.UseNpgsql(ConnectionStrings.Normalizar(connectionString)));

// ---------- Autenticación: todo requiere login salvo lo marcado con [AllowAnonymous] ----------
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = TokenService.Emisor,
            ValidAudience = TokenService.Emisor,
            IssuerSigningKey = TokenService.CrearClave(authOptions.JwtKey),
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization(o =>
{
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});

// ---------- Límite de intentos de login (protege contra fuerza bruta) ----------
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddFixedWindowLimiter(Program.PoliticaLogin, l =>
    {
        l.PermitLimit = 5;
        l.Window = TimeSpan.FromMinutes(1);
        l.QueueLimit = 0;
    });
});

// ---------- CORS: solo el front autorizado puede llamar a la API ----------
var origenes = (builder.Configuration["Cors:Origenes"] ?? "http://localhost:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(origenes).AllowAnyHeader().AllowAnyMethod()));

builder.Services
    .AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

var app = builder.Build();

// Aplica migraciones pendientes y carga las categorías iniciales
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await SeedData.CargarAsync(db);
}

app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/health", () => Results.Ok(new { estado = "ok" })).AllowAnonymous();
app.MapControllers();

app.Run();
return 0;

public partial class Program
{
    public const string PoliticaLogin = "login";
}
