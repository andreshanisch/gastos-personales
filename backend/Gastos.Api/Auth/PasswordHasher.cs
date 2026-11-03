using System.Security.Cryptography;

namespace Gastos.Api.Auth;

/// <summary>
/// Hash de contraseñas con PBKDF2-SHA256 (incluido en .NET, sin paquetes extra).
/// Formato guardado: pbkdf2$iteraciones$salBase64$hashBase64
/// </summary>
public static class PasswordHasher
{
    private const int Iteraciones = 600_000;
    private const int LargoSal = 16;
    private const int LargoHash = 32;

    public static string Hashear(string password)
    {
        var sal = RandomNumberGenerator.GetBytes(LargoSal);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, sal, Iteraciones, HashAlgorithmName.SHA256, LargoHash);
        return $"pbkdf2${Iteraciones}${Convert.ToBase64String(sal)}${Convert.ToBase64String(hash)}";
    }

    public static bool Verificar(string password, string hashGuardado)
    {
        var partes = hashGuardado.Split('$');
        if (partes.Length != 4 || partes[0] != "pbkdf2") return false;
        if (!int.TryParse(partes[1], out var iteraciones)) return false;

        byte[] sal, esperado;
        try
        {
            sal = Convert.FromBase64String(partes[2]);
            esperado = Convert.FromBase64String(partes[3]);
        }
        catch (FormatException)
        {
            return false;
        }

        var calculado = Rfc2898DeriveBytes.Pbkdf2(password, sal, iteraciones, HashAlgorithmName.SHA256, esperado.Length);
        // Comparación en tiempo constante para no filtrar información por timing
        return CryptographicOperations.FixedTimeEquals(calculado, esperado);
    }

    /// <summary>Lee la contraseña de la consola sin mostrarla en pantalla.</summary>
    public static string LeerPasswordDeConsola(string mensaje)
    {
        Console.Write(mensaje);
        var password = new System.Text.StringBuilder();
        while (true)
        {
            var tecla = Console.ReadKey(intercept: true);
            if (tecla.Key == ConsoleKey.Enter) break;
            if (tecla.Key == ConsoleKey.Backspace)
            {
                if (password.Length > 0) password.Length--;
                continue;
            }
            if (!char.IsControl(tecla.KeyChar)) password.Append(tecla.KeyChar);
        }
        Console.WriteLine();
        return password.ToString();
    }
}
