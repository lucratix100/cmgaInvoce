import { DateTime } from 'luxon'
import { CommercialExecutionStatus, CommercialPlanningDay } from '../enum/index.js'

/**
 * Offsets depuis le lundi de la semaine ISO (lundi = 0 … dimanche = 6).
 * Chaque jour de tournée (LUNDI–SAMEDI) ne considère que les logs de son occurrence
 * dans la semaine calendaire en cours (lundi → dimanche).
 */
const PLANNING_DAY_OFFSETS: Record<CommercialPlanningDay, number> = {
  [CommercialPlanningDay.LUNDI]: 0,
  [CommercialPlanningDay.MARDI]: 1,
  [CommercialPlanningDay.MERCREDI]: 2,
  [CommercialPlanningDay.JEUDI]: 3,
  [CommercialPlanningDay.VENDREDI]: 4,
  [CommercialPlanningDay.SAMEDI]: 5,
  [CommercialPlanningDay.DIMANCHE]: 6,
}

export function getCurrentWeekPlanningDayRange(
  day: CommercialPlanningDay,
  referenceDate: DateTime = DateTime.local()
) {
  const today = referenceDate.startOf('day')
  const weekStartMonday = today.minus({ days: today.weekday - 1 }).startOf('day')
  const start = weekStartMonday.plus({ days: PLANNING_DAY_OFFSETS[day] ?? 0 }).startOf('day')

  return {
    start,
    end: start.endOf('day'),
  }
}

export function isTourItemCompleted(latestLogStatus?: CommercialExecutionStatus | null) {
  if (!latestLogStatus) {
    return false
  }

  return [CommercialExecutionStatus.APPELE, CommercialExecutionStatus.COMMANDE_PRISE].includes(
    latestLogStatus
  )
}
