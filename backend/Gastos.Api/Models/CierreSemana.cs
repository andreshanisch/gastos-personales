namespace Gastos.Api.Models;

/// <summary>Qué hacer con lo que sobró de una semana del plan.</summary>
public class CierreSemana
{
    public int Id { get; set; }

    public int Anio { get; set; }

    public int Mes { get; set; }

    /// <summary>Semana del mes: 1 (días 1-7), 2 (8-14), 3 (15-21) o 4 (22 a fin de mes).</summary>
    public int Semana { get; set; }

    public DecisionSobrante Decision { get; set; }
}

public enum DecisionSobrante
{
    /// <summary>El sobrante se guarda como ahorro y no se gasta este mes.</summary>
    Ahorrar,

    /// <summary>El sobrante se suma, en partes iguales, a las semanas que quedan.</summary>
    Repartir
}
