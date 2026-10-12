#!/bin/sh
set -e

# Applique les migrations en attente avant de démarrer l'API
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "▶ Exécution des migrations..."
  node ace migration:run --force
fi

exec "$@"
