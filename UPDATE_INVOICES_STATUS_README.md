# Mise à jour du statut des factures

Cette fonctionnalité permet de mettre à jour automatiquement le statut des factures qui contiennent la lettre "R" dans leur référence, pour un intervalle de dates donné.

## Fonctionnalités

- **Sélection d'intervalle de dates** : Choisissez une période pour analyser les factures
- **Détection automatique** : Recherche automatique des références contenant "R"
- **Mise à jour en masse** : Met à jour le statut et le montant des factures concernées
- **Interface utilisateur** : Interface moderne et intuitive avec feedback en temps réel

## Comment ça fonctionne

1. **Récupération des factures** : Le système récupère toutes les factures dans l'intervalle de dates spécifié
2. **Analyse des numéros de facture** : Pour chaque facture, il vérifie si le numéro de facture contient la lettre "R"
3. **Mise à jour** : Si le numéro de facture contient "R" :
   - Le statut passe à "retour"
   - Le montant total (totalTTC) devient négatif

## Utilisation

### Via l'interface web

1. Accédez à la page `/update-invoices`
2. Sélectionnez la date de début et la date de fin
3. Cliquez sur "Mettre à jour les factures"
4. Attendez le résultat de l'opération

### Via l'API

```bash
POST /api/update-invoices-status
Content-Type: application/json

{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

### Via le script de test

```bash
cd cmgaInvoce-main
node ace run scripts/update-invoices-test.ts
```

## Structure des fichiers

### Frontend
- `app/update-invoices-status.tsx` : Composant React principal
- `app/update-invoices/page.tsx` : Page dédiée
- `app/api/update-invoices-status/route.ts` : Route API Next.js

### Backend
- `app/controllers/update_invoices_status_controller.ts` : Contrôleur AdonisJS
- `scripts/update-invoices-test.ts` : Script de test
- `start/routes.ts` : Configuration des routes

## Réponse de l'API

### Succès
```json
{
  "success": true,
  "message": "Mise à jour terminée. 5 facture(s) mise(s) à jour.",
  "updatedCount": 5,
  "updatedInvoices": [
    {
      "id": 123,
      "invoiceNumber": "F2024001",
      "oldStatus": "livrée",
      "newStatus": "retour",
      "oldTotalTTC": 1500,
      "newTotalTTC": -1500
    }
  ]
}
```

### Erreur
```json
{
  "success": false,
  "message": "Erreur lors de la mise à jour",
  "error": "Détails de l'erreur"
}
```

## Validation

- Les dates doivent être au format YYYY-MM-DD
- La date de début doit être antérieure à la date de fin
- Les deux dates sont requises

## Sécurité

- L'endpoint nécessite une authentification
- Validation des données côté serveur
- Gestion des erreurs robuste
- Logs détaillés pour le debugging

## Logs

Le système génère des logs détaillés :
- Nombre de factures analysées
- Factures mises à jour
- Erreurs rencontrées
- Détails des modifications

## Exemple d'utilisation

```typescript
// Exemple d'appel API
const response = await fetch('/api/update-invoices-status', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    startDate: '2024-01-01',
    endDate: '2024-01-31'
  })
})

const result = await response.json()
console.log(`Mise à jour terminée: ${result.updatedCount} factures modifiées`)
```

## Notes importantes

- Cette opération est **irréversible** - assurez-vous de faire une sauvegarde avant
- Seules les factures avec un numéro de facture contenant "R" sont modifiées
- Le montant devient toujours négatif (même s'il était déjà négatif)
- L'opération peut prendre du temps selon le nombre de factures 