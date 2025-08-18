import { XP_RULES } from './constants';
import type { LevelInfo } from '../types/gamification.types';

/**
 * Calcula XP por contribución monetaria
 * Fórmula: 2 XP por cada $1, máximo 10 XP por evento
 */
export const calculateContributionXP = (amount: number): number => {
  const baseXP = Math.floor(amount) * XP_RULES.CONTRIBUTION_RATE;
  return Math.min(baseXP, XP_RULES.CONTRIBUTION_MAX);
};

/**
 * XP por completar challenge (fijo)
 */
export const calculateChallengeXP = (): number => {
  return XP_RULES.CHALLENGE_COMPLETE;
};

/**
 * XP por racha diaria (fijo)
 */
export const calculateStreakXP = (): number => {
  return XP_RULES.DAILY_STREAK;
};

/**
 * Calcula nivel basado en XP total
 * Fórmula: nivel = floor(sqrt(totalXP)/2)
 * Mínimo nivel 1 para nuevos usuarios
 */
export const calculateLevel = (totalXP: number): number => {
  if (totalXP <= 0) return 1;
  return Math.max(1, Math.floor(Math.sqrt(totalXP) / 2));
};

/**
 * Calcula XP mínimo requerido para un nivel específico
 * Fórmula inversa: XP = (nivel * 2)²
 */
export const getXPForLevel = (level: number): number => {
  if (level <= 1) return 0;
  return Math.pow(level * 2, 2);
};

/**
 * Calcula XP necesario para el siguiente nivel
 */
export const getXPToNextLevel = (currentXP: number): number => {
  const currentLevel = calculateLevel(currentXP);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  return nextLevelXP - currentXP;
};

/**
 * Calcula información completa del nivel actual
 */
export const getLevelInfo = (currentXP: number): LevelInfo => {
  const level = calculateLevel(currentXP);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const xpInCurrentLevel = currentXP - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  
  const progress = xpNeededForLevel > 0 
    ? Math.round((xpInCurrentLevel / xpNeededForLevel) * 100)
    : 100;

  return {
    level,
    progress: Math.max(0, Math.min(100, progress)),
    nextLevelXP,
    currentLevelXP,
  };
};

/**
 * Verifica si una racha debe romperse basado en tiempo transcurrido
 */
export const shouldBreakStreak = (lastActivityAt: Date, currentTime: Date = new Date()): boolean => {
  const hoursDiff = (currentTime.getTime() - lastActivityAt.getTime()) / (1000 * 60 * 60);
  return hoursDiff > 48; // 48 horas
};

/**
 * Calcula el porcentaje de completado de una quest
 */
export const calculateQuestProgress = (
  completedChallengeIds: string[], 
  totalChallengeIds: string[]
): number => {
  if (totalChallengeIds.length === 0) return 100;
  
  const completedCount = completedChallengeIds.filter(id => 
    totalChallengeIds.includes(id)
  ).length;
  
  return Math.round((completedCount / totalChallengeIds.length) * 100);
};

/**
 * Verifica si una quest está completada
 */
export const isQuestCompleted = (
  completedChallengeIds: string[], 
  totalChallengeIds: string[]
): boolean => {
  return calculateQuestProgress(completedChallengeIds, totalChallengeIds) >= 100;
};

/**
 * Calcula fecha de inicio de semana (lunes) para quests semanales
 */
export const getWeekStartDate = (date: Date = new Date()): Date => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Lunes como primer día
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

/**
 * Verifica si una fecha está en la semana actual
 */
export const isCurrentWeek = (date: Date): boolean => {
  const weekStart = getWeekStartDate();
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  return date >= weekStart && date < weekEnd;
};