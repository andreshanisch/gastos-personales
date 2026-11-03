using Npgsql;

namespace Gastos.Api.Data;

public static class ConnectionStrings
{
    /// <summary>
    /// Neon y otros proveedores suelen dar la conexión como URL (postgresql://usuario:clave@host/base).
    /// Npgsql espera formato "Host=...;Username=...", así que se convierte si hace falta.
    /// </summary>
    public static string Normalizar(string valor)
    {
        if (!valor.StartsWith("postgres://") && !valor.StartsWith("postgresql://"))
            return valor;

        var uri = new Uri(valor);
        var credenciales = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort || uri.Port <= 0 ? 5432 : uri.Port,
            Username = Uri.UnescapeDataString(credenciales[0]),
            Password = credenciales.Length > 1 ? Uri.UnescapeDataString(credenciales[1]) : null,
            Database = uri.AbsolutePath.TrimStart('/'),
            SslMode = SslMode.Require
        };
        return builder.ConnectionString;
    }
}
