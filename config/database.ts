import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
    // Base Sage (SQL Server 2012) : lecture seule, utilisée par l'import des factures
    mssql: {
      client: 'mssql',
      connection: {
        server: env.get('SAGE_DB_HOST', ''),
        // Ignoré par knex si une instance nommée est définie (résolue via SQL Browser)
        port: env.get('SAGE_DB_PORT', 1433),
        user: env.get('SAGE_DB_USER'),
        password: env.get('SAGE_DB_PASSWORD'),
        database: env.get('SAGE_DB_DATABASE'),
        requestTimeout: 120000,
        options: {
          instanceName: env.get('SAGE_DB_INSTANCE'),
          encrypt: env.get('SAGE_DB_ENCRYPT', false),
          trustServerCertificate: true,
          // SQL Server 2012 non patché ne parle que TLS 1.0, refusé par défaut par Node 20
          ...(env.get('SAGE_DB_LEGACY_TLS', false)
            ? { cryptoCredentialsDetails: { minVersion: 'TLSv1', ciphers: 'DEFAULT@SECLEVEL=0' } }
            : {}),
        },
      },
    },
  },
})
export default dbConfig
