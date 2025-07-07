# Composant ScanUnified

Un composant unifié pour gérer le scan de factures selon différents rôles, sans utiliser `useEffect` pour une meilleure performance et contrôle.

## Avantages

- **Un seul composant** pour tous les rôles
- **Pas d'useEffect** - détection automatique du scan via `onChange`
- **Gestion des rôles** avec validation appropriée
- **Réutilisable** et configurable
- **Performance optimisée** avec `useCallback`

## Utilisation

### Props

```typescript
interface ScanUnifiedProps {
    role: 'chef-depot' | 'magasinier' | 'superviseur-magasin' | 'controller'
    onScan?: (result: string) => void
    isOpen?: boolean
    onClose?: () => void
}
```

### Exemples d'utilisation

#### Chef de Dépôt
```tsx
<ScanUnified 
    role="chef-depot"
    onScan={(result) => console.log('Facture scannée:', result)}
/>
```

#### Magasinier
```tsx
<ScanUnified 
    role="magasinier"
    onScan={(result) => console.log('Facture scannée:', result)}
/>
```

#### Superviseur Magasin
```tsx
<ScanUnified 
    role="superviseur-magasin"
    onScan={(result) => console.log('Facture scannée:', result)}
/>
```

#### Controller
```tsx
<ScanUnified 
    role="controller"
    onScan={(result) => console.log('Facture scannée:', result)}
/>
```

#### Contrôle externe du dialogue
```tsx
const [isOpen, setIsOpen] = useState(false)

<ScanUnified 
    role="magasinier"
    isOpen={isOpen}
    onClose={() => setIsOpen(false)}
    onScan={(result) => {
        console.log('Facture scannée:', result)
        setIsOpen(false)
    }}
/>
```

## Fonctionnalités par rôle

### Chef de Dépôt
- Scanne les factures avec statut "non réceptionnée"
- Affiche un dialogue de confirmation
- Met à jour le statut vers "en attente de livraison"

### Magasinier
- Scanne les factures "en attente" ou "en cours de livraison"
- Ouvre directement le dialogue de gestion des factures
- Permet de gérer les quantités livrées

### Superviseur Magasin
- Même fonctionnalité que le magasinier
- Avec option pour sélectionner chauffeur et magasinier
- Interface adaptée aux superviseurs

### Controller
- Scanne les factures "en cours de livraison"
- Affiche les détails complets de la facture
- Permet de confirmer les BLs en attente
- Interface détaillée avec informations client et produits

## Détection automatique du scan

Le composant détecte automatiquement quand un scan est complet via l'événement `onChange` :

```tsx
const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setScannedValue(value)
    
    // Détection automatique du scan complet (sans useEffect)
    if (value.trim() && !loading && !showGestion && !showConfirmation) {
        setTimeout(() => {
            if (value.trim() === scannedValue && value.trim()) {
                handleScan()
            }
        }, 100)
    }
}, [loading, showGestion, showConfirmation, scannedValue])
```

## Validation des statuts

Chaque rôle a ses propres règles de validation :

```tsx
switch (role) {
    case 'chef-depot':
        if (invoice.status !== InvoiceStatus.NON_RECEPTIONNEE) {
            setErrorMessage("Cette facture a déjà été scannée")
            return
        }
        break

    case 'magasinier':
    case 'superviseur-magasin':
        if (invoice.status !== InvoiceStatus.EN_ATTENTE && invoice.status !== InvoiceStatus.EN_COURS) {
            setErrorMessage("Cette facture n'est pas en attente de livraison ou en cours de livraison")
            return
        }
        break

    case 'controller':
        if (invoice.status !== InvoiceStatus.EN_COURS) {
            setErrorMessage("Cette facture n'est pas en cours de livraison")
            return
        }
        break
}
```

## Migration depuis les anciens composants

### Avant (4 composants séparés)
```tsx
// Chef de dépôt
<ScanChefDepot isOpen={isOpen} onClose={handleClose} />

// Magasinier
<ScanDialog onScan={handleScan} />

// Superviseur magasin
<ScanSuperviseurMagasin onScan={handleScan} />

// Controller
<ScanController onScan={handleScan} />
```

### Après (1 composant unifié)
```tsx
// Chef de dépôt
<ScanUnified role="chef-depot" isOpen={isOpen} onClose={handleClose} />

// Magasinier
<ScanUnified role="magasinier" onScan={handleScan} />

// Superviseur magasin
<ScanUnified role="superviseur-magasin" onScan={handleScan} />

// Controller
<ScanUnified role="controller" onScan={handleScan} />
```

## Avantages de la migration

1. **Moins de code** - Un seul composant au lieu de 4
2. **Maintenance simplifiée** - Modifications centralisées
3. **Cohérence** - Interface uniforme pour tous les rôles
4. **Performance** - Pas d'useEffect, détection directe
5. **Flexibilité** - Contrôle externe possible du dialogue
6. **Réutilisabilité** - Facile à intégrer dans d'autres contextes 