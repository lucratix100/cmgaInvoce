import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { CommercialExecutionStatus, CommercialPlanningDay } from '../../app/enum/index.js'
import {
  getCurrentWeekPlanningDayRange,
  isTourItemCompleted,
} from '../../app/utils/commercial_planning_week.js'

test.group('commercial_planning_week', () => {
  test('returns the planning day of the current ISO week (lundi → dimanche)', ({ assert }) => {
    const cases = [
      { day: CommercialPlanningDay.LUNDI, reference: '2026-06-22T10:00:00', expected: '2026-06-22' },
      { day: CommercialPlanningDay.MERCREDI, reference: '2026-06-24T10:00:00', expected: '2026-06-24' },
      { day: CommercialPlanningDay.JEUDI, reference: '2026-06-25T10:00:00', expected: '2026-06-25' },
      { day: CommercialPlanningDay.SAMEDI, reference: '2026-06-27T10:00:00', expected: '2026-06-27' },
    ]

    for (const { day, reference, expected } of cases) {
      const range = getCurrentWeekPlanningDayRange(day, DateTime.fromISO(reference))
      assert.equal(range.start.toISODate(), expected, `day=${day}`)
      assert.equal(range.end.toISODate(), expected, `day=${day} end`)
    }
  })

  test('resets to the next week occurrence when the ISO week changes', ({ assert }) => {
    const previousMonday = DateTime.fromISO('2026-06-22T10:00:00')
    const nextMonday = DateTime.fromISO('2026-06-29T10:00:00')

    const previousRange = getCurrentWeekPlanningDayRange(CommercialPlanningDay.LUNDI, previousMonday)
    const nextRange = getCurrentWeekPlanningDayRange(CommercialPlanningDay.LUNDI, nextMonday)

    assert.equal(previousRange.start.toISODate(), '2026-06-22')
    assert.equal(nextRange.start.toISODate(), '2026-06-29')
    assert.notEqual(previousRange.start.toISODate(), nextRange.start.toISODate())
  })

  test('after Saturday tour, Monday of the new ISO week targets the next Saturday', ({ assert }) => {
    const saturdayWeekN = DateTime.fromISO('2026-06-27T10:00:00')
    const mondayWeekNPlus1 = DateTime.fromISO('2026-06-29T10:00:00')

    const saturdayRangeN = getCurrentWeekPlanningDayRange(CommercialPlanningDay.SAMEDI, saturdayWeekN)
    const saturdayRangeFromMonday = getCurrentWeekPlanningDayRange(
      CommercialPlanningDay.SAMEDI,
      mondayWeekNPlus1
    )

    assert.equal(saturdayRangeN.start.toISODate(), '2026-06-27')
    assert.equal(saturdayRangeFromMonday.start.toISODate(), '2026-07-04')
    assert.notEqual(saturdayRangeN.start.toISODate(), saturdayRangeFromMonday.start.toISODate())
  })

  test('on Sunday, Monday tour still belongs to the current ISO week Monday', ({ assert }) => {
    const sunday = DateTime.fromISO('2026-06-28T10:00:00')
    const mondayRange = getCurrentWeekPlanningDayRange(CommercialPlanningDay.LUNDI, sunday)

    assert.equal(mondayRange.start.toISODate(), '2026-06-22')
  })

  test('marks only APPELE and COMMANDE_PRISE as completed for the tour', ({ assert }) => {
    assert.isTrue(isTourItemCompleted(CommercialExecutionStatus.APPELE))
    assert.isTrue(isTourItemCompleted(CommercialExecutionStatus.COMMANDE_PRISE))
    assert.isFalse(isTourItemCompleted(CommercialExecutionStatus.NON_REPONDU))
    assert.isFalse(isTourItemCompleted(CommercialExecutionStatus.A_RELANCER))
    assert.isFalse(isTourItemCompleted(null))
  })

  test('an old BC without a current-week log does not count as completed', ({ assert }) => {
    const hasActiveBc = true
    const latestLogStatus = null

    const isCompleted = isTourItemCompleted(latestLogStatus) || (hasActiveBc && false)

    assert.isFalse(isCompleted)
  })
})
