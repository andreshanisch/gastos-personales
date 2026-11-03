using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Gastos.Api.Auth;

public class TokenService(IOptions<AuthOptions> opciones)
{
    public const string Emisor = "gastos-api";

    private readonly AuthOptions _opciones = opciones.Value;

    public static SymmetricSecurityKey CrearClave(string jwtKey) =>
        new(Encoding.UTF8.GetBytes(jwtKey));

    public (string Token, DateTime Expira) Generar()
    {
        var expira = DateTime.UtcNow.AddDays(_opciones.DiasSesion);
        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = Emisor,
            Audience = Emisor,
            Subject = new ClaimsIdentity([new Claim(ClaimTypes.Name, _opciones.Usuario)]),
            Expires = expira,
            SigningCredentials = new SigningCredentials(
                CrearClave(_opciones.JwtKey), SecurityAlgorithms.HmacSha256)
        };

        var token = new JsonWebTokenHandler().CreateToken(descriptor);
        return (token, expira);
    }
}
