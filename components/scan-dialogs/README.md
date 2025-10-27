# Refactorisation des Dialogues de Scan

## Vue d'ensemble

Le composant `ScanUnified` a été refactorisé pour extraire les dialogues dans des composants séparés, améliorant ainsi la maintenabilité, la testabilité et la réutilisabilité du code.

## Structure des fichiers

```
scan-dialogs/
├── index.ts                    # Export centralisé
├── scan-main-dialog.tsx        # Dialogue principal réutilisable
├── controller-dialog.tsx       # Dialogue spécifique au controller
└── README.md                   # Documentation
```

## Composants extraits

### 1. ScanMainDialog

**Fichier :** `scan-main-dialog.tsx`

**Responsabilité :** Dialogue principal réutilisable pour tous les rôles sauf controller.

**Props :**
```typescript
interface ScanMainDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    scannedValue: string
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
    onTestMode: () => void
    errorMessage: string
    loading: boolean
    isTestMode: boolean
    title: string
    description: string
    buttonText: string
    placeholder: string
    inputRef: React.RefObject<HTMLInputElement | null>
    children?: React.ReactNode
}
```

**Utilisation :**
```tsx
<ScanMainDialog
    isOpen={isOpen}
    onOpenChange={setIsOpen}
    scannedValue={scannedValue}
    onInputChange={handleInputChange}
    onKeyDown={handleKeyDown}
    onTestMode={handleTestMode}
    errorMessage={errorMessage}
    loading={loading}
    isTestMode={isTestMode}
    title="Scanner le numéro de facture"
    description="Scannez le code-barres de la facture"
    buttonText="Scanner la facture"
    placeholder="En attente du scan..."
    inputRef={inputRef}
/>
```

### 2. ControllerDialog

**Fichier :** `controller-dialog.tsx`

**Responsabilité :** Dialogue spécialisé pour le rôle controller avec affichage des détails de facture et BLs.

**Props :**
```typescript
interface ControllerDialogProps {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    scannedValue: string
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
    onTestMode: () => void
    errorMessage: string
    loading: boolean
    isTestMode: boolean
    inputRef: React.RefObject<HTMLInputElement | null>
    invoiceData: Invoice | null
    pendingBls: Bl[]
    confirmingBl: boolean
    onConfirmBl: (blId: number) => void
    onClose: () => void
    formatAmount: (amount: number) => string
}
```

**Fonctionnalités :**
- Affichage des détails complets de la facture
- Liste des produits commandés
- Gestion des BLs en attente de confirmation
- Interface adaptée pour les controllers

## Avantages de la refactorisation

### 1. **Séparation des responsabilités**
- Chaque dialogue a une responsabilité claire
- Code plus facile à comprendre et maintenir

### 2. **Réutilisabilité**
- `ScanMainDialog` peut être réutilisé pour d'autres rôles
- Interface cohérente entre les dialogues

### 3. **Testabilité**
- Chaque dialogue peut être testé indépendamment
- Tests plus ciblés et spécifiques

### 4. **Maintenabilité**
- Modifications isolées par composant
- Moins de code dupliqué

### 5. **Performance**
- Rendu conditionnel optimisé
- Chargement des composants à la demande

## Utilisation dans ScanUnified

Le composant principal `ScanUnified` utilise maintenant un rendu conditionnel :

```tsx
// Rendu conditionnel selon le rôle
if (role === 'controller') {
    return (
        <ControllerDialog
            // ... props spécifiques au controller
        />
    )
}

return (
    <>
        <ScanMainDialog
            // ... props communes
        />
        
        {/* Composants conditionnels selon le rôle */}
        {(role === 'magasinier' || role === 'superviseur-magasin') && (
            <GestionFacture />
        )}

        {role === 'chef-depot' && (
            <InvoiceConfirmationDialog />
        )}
    </>
)
```

## Tests

Un fichier de test complet a été créé : `scan-unified.test.tsx`

**Tests couverts :**
- Rendu du bouton pour chaque rôle
- Ouverture du dialogue
- Saisie manuelle
- Validation des rôles
- Gestion des erreurs
- Affichage des composants conditionnels
- Callback onScan

## Migration

### Avant (monolithique)
```tsx
// Un seul fichier avec toute la logique
<Dialog>
    {/* 200+ lignes de JSX */}
</Dialog>
```

### Après (modulaire)
```tsx
// Composants séparés et réutilisables
<ScanMainDialog />
<ControllerDialog />
```

## Extensibilité

Pour ajouter un nouveau rôle ou dialogue :

1. **Créer un nouveau dialogue** dans `scan-dialogs/`
2. **Ajouter la logique conditionnelle** dans `ScanUnified`
3. **Mettre à jour les tests** si nécessaire
4. **Documenter** dans ce README

## Bonnes pratiques

1. **Props typées** : Toutes les props sont typées avec TypeScript
2. **Composants purs** : Les dialogues sont des composants de présentation
3. **Gestion d'état centralisée** : La logique reste dans `ScanUnified`
4. **Tests unitaires** : Chaque composant peut être testé indépendamment
5. **Documentation** : Interface et utilisation documentées 