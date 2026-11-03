using Gastos.Api.Auth;
using Gastos.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace Gastos.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IOptions<AuthOptions> opciones, TokenService tokens) : ControllerBase
{
    private readonly AuthOptions _opciones = opciones.Value;

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(Program.PoliticaLogin)]
    public ActionResult<LoginResponse> Login(LoginRequest request)
    {
        // Se verifican ambas cosas siempre, para no revelar cuál de las dos falló
        var usuarioOk = string.Equals(request.Usuario.Trim(), _opciones.Usuario, StringComparison.OrdinalIgnoreCase);
        var passwordOk = PasswordHasher.Verificar(request.Password, _opciones.PasswordHash);

        if (!usuarioOk || !passwordOk)
            return Unauthorized(new { mensaje = "Usuario o contraseña incorrectos." });

        var (token, expira) = tokens.Generar();
        return new LoginResponse(token, expira);
    }
}
