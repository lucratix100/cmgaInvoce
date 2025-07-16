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
    // mssql: {
    //   client: 'mssql',
    //   connection: {
    //     host: env.get('DB_MSSQL_HOST'),
    //     port: env.get('DB_MSSQL_PORT') ? parseInt(env.get('DB_MSSQL_PORT') as string) : undefined,
    //     user: env.get('DB_MSSQL_USER'),
    //     server: env.get('DB_MSSQL_SERVER') || '',
    //     password: env.get('DB_MSSQL_PASSWORD'),
    //     database: env.get('DB_MSSQL_DATABASE'),
    //     options: {
    //       encrypt: true,
    //       trustServerCertificate: true,
    //     },
    //   },
    // },
  },
})
export default dbConfig
