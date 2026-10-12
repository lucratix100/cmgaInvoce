/*
|--------------------------------------------------------------------------
| Environment variables service
|--------------------------------------------------------------------------
|
| The `Env.create` method creates an instance of the Env service. The
| service validates the environment variables and also cast values
| to JavaScript data types.
|
*/

import { Env } from '@adonisjs/core/env'

export default await Env.create(new URL('../', import.meta.url), {
  NODE_ENV: Env.schema.enum(['development', 'production', 'test'] as const),
  PORT: Env.schema.number(),
  APP_KEY: Env.schema.string(),
  HOST: Env.schema.string({ format: 'host' }),
  LOG_LEVEL: Env.schema.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']),

  /*
  |----------------------------------------------------------
  | Variables for configuring database connection
  |----------------------------------------------------------
  */
  DB_HOST: Env.schema.string({ format: 'host' }),
  DB_PORT: Env.schema.number(),
  DB_USER: Env.schema.string(),
  DB_PASSWORD: Env.schema.string.optional(),
  DB_DATABASE: Env.schema.string(),

  /*
  |----------------------------------------------------------
  | Connexion Sage (SQL Server) et import des factures
  |----------------------------------------------------------
  */
  SAGE_DB_HOST: Env.schema.string.optional(),
  SAGE_DB_PORT: Env.schema.number.optional(),
  SAGE_DB_INSTANCE: Env.schema.string.optional(),
  SAGE_DB_USER: Env.schema.string.optional(),
  SAGE_DB_PASSWORD: Env.schema.string.optional(),
  SAGE_DB_DATABASE: Env.schema.string.optional(),
  SAGE_DB_ENCRYPT: Env.schema.boolean.optional(),
  SAGE_DB_LEGACY_TLS: Env.schema.boolean.optional(),
  SAGE_COMPTA_DATABASE: Env.schema.string.optional(),
  SAGE_GESTION_DATABASES: Env.schema.string.optional(),
  SAGE_IMPORT_ENABLED: Env.schema.boolean.optional(),
  SAGE_IMPORT_SOURCE: Env.schema.enum.optional(['mssql', 'file'] as const),
  SAGE_IMPORT_FILE: Env.schema.string.optional(),
  SAGE_IMPORT_CRON: Env.schema.string.optional(),
  SAGE_IMPORT_DAYS: Env.schema.number.optional(),
})
