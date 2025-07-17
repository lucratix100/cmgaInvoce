# Gestion des Délais Personnalisés Expirés

## 🎯 Objectif

Ce système automatise la gestion des délais personnalisés expirés pour les factures :

1. **Détection automatique** des délais expirés
2. **Suppression automatique** des délais expirés de l'affichage
3. **Notifications urgentes** aux utilisateurs concernés
4. **Notifications aux administrateurs**

## 🔧 Configuration

### 1. Tâche Programmée (Cron)

Pour exécuter automatiquement la vérification quotidienne, ajoutez cette ligne à votre crontab :

```bash
# Vérifier les délais expirés tous les jours à 8h00
0 8 * * * cd /chemin/vers/votre/projet/server && node scripts/check_expired_delays.js >> /var/log/expired_delays.log 2>&1
```

### 2. Exécution Manuelle

Vous pouvez aussi exécuter la vérification manuellement :

```bash
# Via la commande Ace
node ace check:expired-custom-delays

# Via le script
node scripts/check_expired_delays.js

# Via l'interface web (bouton "Vérifier les délais expirés")
```

## 📋 Fonctionnement

### Détection des Délais Expirés

Un délai personnalisé est considéré comme expiré si :

1. **Date de référence** = Date du dernier paiement OU date de livraison
2. **Date limite** = Date de référence + délai personnalisé (en jours)
3. **Expiration** = Date actuelle > Date limite

### Actions Automatiques

Quand un délai expire :

1. ✅ **Suppression** du délai personnalisé de la base de données
2. 🔔 **Notification admin** avec les détails de l'expiration
3. 📢 **Notification recouvrement** aux utilisateurs affectés à la facture
4. 🗑️ **Retrait de l'affichage** dans l'interface de gestion

### Notifications

#### Pour les Administrateurs
- **Type** : Notification urgente
- **Contenu** : Détails de la facture, délai expiré, nombre de jours d'expiration
- **Action** : Lien direct vers la facture

#### Pour les Utilisateurs de Recouvrement
- **Cible** : Utilisateurs affectés à la facture (par dépôt ou racine)
- **Type** : Notification urgente
- **Contenu** : Information sur l'expiration du délai personnalisé
- **Action** : Lien direct vers la facture

## 🎨 Interface Utilisateur

### Affichage des Délais

- ✅ **Délais actifs** : Affichés normalement dans "Gérer les Délais"
- ❌ **Délais expirés** : Automatiquement supprimés de l'affichage
- 🔄 **Bouton de vérification** : Permet l'exécution manuelle

### Statistiques

L'API retourne :
- `total` : Nombre de délais actifs
- `expiredCount` : Nombre de délais expirés supprimés

## 🔍 Logs et Monitoring

### Logs de la Tâche

```bash
# Voir les logs de la tâche programmée
tail -f /var/log/expired_delays.log

# Logs détaillés dans la console
node ace check:expired-custom-delays
```

### Exemple de Log

```
🔍 Début de la vérification des délais personnalisés expirés...
📊 3 délai(s) personnalisé(s) expiré(s) trouvé(s)
🗑️ Délai personnalisé supprimé pour la facture FD0040117
📢 Notification envoyée à l'utilisateur de recouvrement Mamadou Diallo
✅ Vérification terminée. 3 délai(s) personnalisé(s) supprimé(s)
```

## 🚨 Gestion des Erreurs

### Erreurs Possibles

1. **Erreur de base de données** : Log détaillé, notification admin
2. **Erreur de notification** : Log détaillé, continuation du processus
3. **Erreur de permission** : Vérification des droits utilisateur

### Récupération

- **Automatique** : La tâche continue même en cas d'erreur partielle
- **Manuelle** : Bouton de vérification dans l'interface
- **Logs** : Traçabilité complète des actions

## 📊 Métriques

### Suivi des Performances

- **Temps d'exécution** : Mesuré et loggé
- **Nombre de délais traités** : Statistiques détaillées
- **Taux de succès** : Monitoring des erreurs

### Alertes

- **Échec de la tâche** : Notification admin immédiate
- **Nombre élevé d'expirations** : Alerte si > 10 délais expirés
- **Erreurs répétées** : Escalade automatique

## 🔐 Sécurité

### Permissions

- **Exécution** : Administrateurs uniquement
- **Notifications** : Utilisateurs affectés uniquement
- **Logs** : Accès restreint aux administrateurs

### Validation

- **Données** : Validation des dates et délais
- **Permissions** : Vérification des droits utilisateur
- **Intégrité** : Vérification de la cohérence des données 