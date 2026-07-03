/**
 * Servicio de proyección de gasto (forecast). Lógica pura sobre los insights
 * mensuales ya cargados. Fuente: docs/features/analytics/analytics-functional-specs.md
 * (§Proyección).
 *
 * Estima el gasto de los próximos `days` días mediante regresión lineal sobre
 * el total mensual (`total_spent`) de los meses cargados, escalando a `days`.
 * La confianza (0-1) surge de la cantidad de meses y de la variabilidad de la
 * serie. Requiere ≥2 meses de historial; si no, devuelve null.
 */
import type { Forecast, MonthlyInsight } from '@/types/analytics';

export class ForecastService {
  static getSpendingForecast(
    monthlyInsights: MonthlyInsight[],
    days: number
  ): Forecast | null {
    const spends = monthlyInsights.map((m) => Number(m.total_spent) || 0);
    if (spends.length < 2) return null;

    // Serie en orden cronológico (los RPC devuelven el mes más reciente primero).
    const series = [...spends].reverse();
    const n = series.length;
    const xs = series.map((_, i) => i);
    const meanX = (n - 1) / 2;
    const meanY = series.reduce((s, v) => s + v, 0) / n;

    // Regresión lineal: pendiente e intercepto.
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - meanX) * (series[i] - meanY);
      den += (xs[i] - meanX) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;

    // Proyección del próximo mes (x = n) acotada a valores no negativos.
    const predictedMonthly = Math.max(0, meanY + slope * (n - meanX));
    const predictedAmount = Math.round(predictedMonthly * (days / 30));

    // Tendencia según la pendiente relativa al promedio.
    const relSlope = meanY > 0 ? slope / meanY : 0;
    let trend: Forecast['trend'] = 'stable';
    if (relSlope > 0.05) trend = 'up';
    else if (relSlope < -0.05) trend = 'down';

    // Confianza: más meses y menor variabilidad → mayor confianza.
    const variance = series.reduce((s, v) => s + (v - meanY) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    const cv = meanY > 0 ? std / meanY : 1;

    let confidence = 0.4;
    if (n >= 6) confidence += 0.3;
    else if (n >= 4) confidence += 0.2;
    else if (n >= 3) confidence += 0.1;
    else confidence += 0.05;
    confidence += 0.3 * (1 - Math.min(cv, 1));
    confidence = Math.min(0.95, Math.max(0.1, confidence));
    confidence = Math.round(confidence * 100) / 100;

    return { predicted_amount: predictedAmount, confidence, trend };
  }
}
