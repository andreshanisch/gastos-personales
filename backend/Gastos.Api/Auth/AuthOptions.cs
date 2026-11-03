namespace Gastos.Api.Auth;

/// <summary>
/// Configuración del login de un único usuario.
/// Todos estos valores se cargan desde variables de entorno o user-secrets, NUNCA desde el repo.
/// </summary>
public class AuthOptions
{
    public const string Seccion = "Auth";

    /// <summary>Nombre de usuario para iniciar sesión.</summary>
    public string Usuario { get; set; } = "";

    /// <summary>Hash de la contraseña. Se genera con: dotnet run -- hash-password</summary>
    public string PasswordHash { get; set; } = "";

    /// <summary>Clave secreta para firmar los tokens. Mínimo 32 caracteres.</summary>
    public string JwtKey { get; set; } = "";

    /// <summary>Cuántos días dura la sesión antes de pedir login de nuevo.</summary>
    public int DiasSesion { get; set; } = 14;

    public void Validar()
    {
        var faltantes = new List<string>();
        if (string.IsNullOrWhiteSpace(Usuario)) faltantes.Add("Auth__Usuario");
        if (string.IsNullOrWhiteSpace(PasswordHash)) faltantes.Add("Auth__PasswordHash");
        if (string.IsNullOrWhiteSpace(JwtKey)) faltantes.Add("Auth__JwtKey");

        if (faltantes.Count > 0)
            throw new InvalidOperationException(
                $"Falta configurar: {string.Join(", ", faltantes)}. Ver README, sección 'Configuración'.");

        if (JwtKey.Length < 32)
            throw new InvalidOperationException("Auth__JwtKey debe tener al menos 32 caracteres.");
    }
}
