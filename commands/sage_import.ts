import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import SageInvoiceImportService from '#services/sage_invoice_import_service'

export default class SageImport extends BaseCommand {
    static commandName = 'sage:import'
    static description = 'Importer les factures Sage (SQL Server ou fichier XML) dans la base'

    static options: CommandOptions = {
        startApp: true,
    }

    @flags.string({ description: 'Importer depuis un fichier XML au lieu de SQL Server' })
    declare file?: string

    @flags.number({ description: 'Nombre de jours à remonter en plus d\'aujourd\'hui (SQL Server)' })
    declare days?: number

    async run() {
        const result = await SageInvoiceImportService.run({
            source: this.file ? 'file' : 'mssql',
            file: this.file,
            days: this.days,
        })
        this.logger.success(`Import terminé : ${JSON.stringify(result)}`)
    }
}
