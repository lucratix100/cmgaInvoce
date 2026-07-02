import cron from 'node-cron'
import CommercialFollowUpService from '#services/commercial_follow_up_service'

cron.schedule('0 7 * * *', async () => {
  console.log('[Cron] Vérification des relances commerciales...')
  try {
    const result = await CommercialFollowUpService.processDailyReminders()
    console.log(
      `[Cron] Relances traitées — total: ${result.total}, aujourd'hui: ${result.dueToday}, en retard: ${result.overdue} ✅`
    )
  } catch (error) {
    console.error('[Cron] Erreur lors du traitement des relances commerciales ❌', error)
  }
})
