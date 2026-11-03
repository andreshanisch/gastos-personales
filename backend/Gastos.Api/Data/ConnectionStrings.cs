using Npgsql;

namespace Gastos.Api.Data;

public static class ConnectionStrings
{
    /// <summary>
    /// Neon y otros proveedores suelen dar la conexión como URL (postgresql://usuario:clave@host/base).
    /// Npgsql espera formato "Host=...;Username=...", así que se convierte si hace falta.
    /// También tolera errores comunes al pegar el valor: espacios, comillas o el prefijo "DATABASE_URL=".
    /// </summary>
    public static string Normalizar(string valor)
    {
        valor = valor.Trim().Trim('"', '\'').Trim();

        // Si se pegó la línea entera del .env (DATABASE_URL_UNPOOLED=postgresql://...), se toma solo la URL
        var inicioUrl = valor.IndexOf("postgres", StringComparison.OrdinalIgnoreCase);
        if (inicioUrl > 0 && valor.IndexOf("://", inicioUrl, StringComparison.Ordinal) > inicioUrl)
            valor = valor[inicioUrl..].Trim('"', '\'');

        var resultado = EsUrl(valor) ? DesdeUrl(valor) : valor;

        // Se valida acá para dar un error claro al arrancar, sin mostrar el valor (contiene la contraseña)
        try
        {
            _ = new NpgsqlConnectionStringBuilder(resultado);
        }
        catch (ArgumentException)
        {
            throw new InvalidOperationException(
                "La conexión a la base tiene un formato inválido. Debe ser la URL de Neon " +
                "(postgresql://usuario:clave@host/base), sin comillas ni espacios.");
        }
        return resultado;
    }

    private static bool EsUrl(string valor) =>
        valor.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        valor.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase);

    private static string DesdeUrl(string valor)
    {
        var uri = new Uri(valor);
        var credenciales = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort || uri.Port <= 0 ? 5432 : uri.Port,
            Username = Uri.UnescapeDataString(credenciales[0]),
            Password = credenciales.Length > 1 ? Uri.UnescapeDataString(credenciales[1]) : null,
            Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')),
            // Neon exige SSL; Npgsql envía el nombre del host (SNI), así que no hace falta el parámetro "options=endpoint"
            SslMode = SslMode.Require
        };
        if (uri.Host.Contains("-pooler"))
        {
            // El pooler de Neon (PgBouncer en modo transacción) no admite estado de sesión
            builder.NoResetOnClose = true;
        }
        return builder.ConnectionString;
    }
}
