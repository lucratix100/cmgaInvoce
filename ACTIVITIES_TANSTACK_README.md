# TanStack Query pour les Activités Récentes

## 🎯 Objectif
Implémenter TanStack Query pour gérer le refresh automatique des activités récentes avec une gestion optimisée du cache et des performances.

## 🔧 Implémentation

### 1. **Hook `useRecentActivities`**
```typescript
// hooks/useRecentActivities.ts
export function useRecentActivities() {
    const {
        data: activities = [],
        isLoading,
        error,
        refetch,
        isFetching
    } = useQuery({
        queryKey: ['recent-activities'],
        queryFn: getRecentActivities,
        retry: 2,
        refetchInterval: 30 * 1000, // Refresh toutes les 30 secondes
        refetchIntervalInBackground: true,
        staleTime: 15 * 1000, // Données fraîches pendant 15 secondes
        gcTime: 5 * 60 * 1000, // Cache pendant 5 minutes
        refetchOnWindowFocus: true,
        refetchOnMount: true,
    });
}
```

### 2. **Hook `useActivityInvalidation`**
```typescript
// hooks/useActivityInvalidation.ts
export function useActivityInvalidation() {
    const queryClient = useQueryClient();

    const invalidateRecentActivities = () => {
        queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
    };

    const invalidateAfterAction = (actionType: string) => {
        console.log(`Invalidation des activités après action: ${actionType}`);
        invalidateRecentActivities();
    };
}
```

### 3. **Composant `RecentActivities` mis à jour**
- ✅ Utilisation du hook TanStack Query
- ✅ Gestion d'erreurs robuste
- ✅ Bouton de refresh manuel
- ✅ Indicateur de chargement
- ✅ Compteur d'activités récentes
- ✅ Refresh automatique toutes les 30 secondes

## 📋 Fonctionnalités

### 🔄 **Refresh Automatique**
- **Intervalle** : Toutes les 30 secondes
- **Background** : Continue même quand l'onglet n'est pas actif
- **Window Focus** : Refresh quand l'utilisateur revient sur l'onglet
- **Mount** : Refresh à chaque montage du composant

### 🎯 **Gestion du Cache**
- **Stale Time** : 15 secondes (données considérées comme fraîches)
- **GC Time** : 5 minutes (garde en cache)
- **Retry** : 2 tentatives en cas d'échec
- **Optimistic Updates** : Mise à jour immédiate du cache

### 🚀 **Invalidation Automatique**
- **Après actions** : Scan, confirmation, livraison, etc.
- **Manuel** : Bouton refresh dans l'interface
- **Programmatique** : Via `invalidateAfterAction()`

### 📊 **Indicateurs Visuels**
- **Badge** : Nombre d'activités récentes (< 1 heure)
- **Loading** : Spinner pendant le chargement
- **Error** : Message d'erreur avec bouton retry
- **Fetching** : Indicateur de refresh en cours

## 🔧 Utilisation

### Dans un composant :
```typescript
import { useRecentActivities } from '@/hooks/useRecentActivities';

function MyComponent() {
    const { activities, isLoading, error, refetch, recentCount } = useRecentActivities();
    
    // Utilisation des données...
}
```

### Pour invalider après une action :
```typescript
import { useActivityInvalidation } from '@/hooks/useActivityInvalidation';

function ActionComponent() {
    const { invalidateAfterAction } = useActivityInvalidation();
    
    const handleAction = async () => {
        // Effectuer l'action...
        await performAction();
        
        // Invalider automatiquement les activités
        invalidateAfterAction('nom_de_l_action');
    };
}
```

## 🎨 Interface Utilisateur

### **États du composant** :
1. **Loading** : Skeleton loader avec 5 éléments
2. **Error** : Message d'erreur avec bouton "Réessayer"
3. **Empty** : Message "Aucune activité récente"
4. **Success** : Liste des activités avec badge de comptage

### **Bouton Refresh** :
- Icône de refresh avec animation
- Désactivé pendant le fetch
- Positionné en haut à droite du header

## 📈 Avantages

### **Performance** :
- ✅ Cache intelligent avec TanStack Query
- ✅ Refresh automatique en arrière-plan
- ✅ Optimistic updates pour une UX fluide
- ✅ Gestion efficace de la mémoire

### **UX** :
- ✅ Données toujours à jour
- ✅ Feedback visuel en temps réel
- ✅ Gestion d'erreurs gracieuse
- ✅ Refresh manuel disponible

### **Maintenabilité** :
- ✅ Code modulaire et réutilisable
- ✅ Hooks séparés pour chaque responsabilité
- ✅ Types TypeScript complets
- ✅ Documentation claire

## 🔄 Cycle de Vie

1. **Montage** : Chargement initial des activités
2. **Background** : Refresh automatique toutes les 30s
3. **Action** : Invalidation après action utilisateur
4. **Focus** : Refresh quand l'utilisateur revient
5. **Error** : Retry automatique en cas d'échec

## 🛠️ Configuration

### **Intervalles** :
- `refetchInterval` : 30 secondes
- `staleTime` : 15 secondes
- `gcTime` : 5 minutes

### **Retry** :
- `retry` : 2 tentatives
- `retryDelay` : Délai exponentiel par défaut

### **Cache** :
- `refetchOnWindowFocus` : true
- `refetchOnMount` : true
- `refetchIntervalInBackground` : true

## 📝 Notes Techniques

- **TanStack Query v5** : Utilisation des dernières fonctionnalités
- **TypeScript** : Types complets pour toutes les données
- **Error Boundaries** : Gestion d'erreurs robuste
- **Optimistic Updates** : Mise à jour immédiate du cache
- **Background Sync** : Synchronisation en arrière-plan 