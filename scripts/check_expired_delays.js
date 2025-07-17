#!/usr/bin/env node

/**
 * Script pour vérifier et supprimer les délais personnalisés expirés
 * À exécuter quotidiennement via cron
 */

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

async function runCheckExpiredDelays() {
  try {
    console.log('🕐 Début de la vérification des délais personnalisés expirés...')
    console.log(`📅 Date: ${new Date().toISOString()}`)
    
    // Exécuter la commande Ace
    const { stdout, stderr } = await execAsync('node ace check:expired-custom-delays')
    
    if (stdout) {
      console.log('✅ Sortie de la commande:')
      console.log(stdout)
    }
    
    if (stderr) {
      console.error('⚠️ Erreurs de la commande:')
      console.error(stderr)
    }
    
    console.log('✅ Vérification terminée avec succès')
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'exécution de la vérification:', error)
    process.exit(1)
  }
}

// Exécuter le script
runCheckExpiredDelays() 