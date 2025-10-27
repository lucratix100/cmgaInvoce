# Guide de Dépannage PWA - CMGA Delivery

## Problèmes identifiés et résolus

### 1. Icônes manquantes ✅ RÉSOLU
**Problème** : Le manifest.json référençait des icônes inexistantes
**Solution** : Création du dossier `/public/icons/` avec les icônes requises

### 2. Manifest non référencé ✅ RÉSOLU
**Problème** : Le manifest.json n'était pas référencé dans le layout
**Solution** : Ajout de `manifest: '/manifest.json'` dans les métadonnées

### 3. Métadonnées PWA incomplètes ✅ RÉSOLU
**Problème** : Métadonnées viewport et themeColor dans le mauvais endroit
**Solution** : Séparation en `metadata` et `viewport` exports

## Comment tester le PWA

### 1. Test en mode développement
```bash
pnpm dev
```
⚠️ **Note** : Le PWA est désactivé en mode développement par configuration

### 2. Test en mode production
```bash
pnpm build
pnpm start
```

### 3. Page de test
Accédez à `http://localhost:3000/pwa-test.html` pour tester tous les composants PWA

## Vérifications manuelles

### 1. Service Worker
- Ouvrez les DevTools (F12)
- Allez dans l'onglet "Application" > "Service Workers"
- Vérifiez que le service worker est actif

### 2. Manifest
- Dans les DevTools > "Application" > "Manifest"
- Vérifiez que le manifest est chargé correctement

### 3. Cache
- Dans les DevTools > "Application" > "Storage" > "Cache Storage"
- Vérifiez que les caches sont créés

### 4. Installation PWA
- Sur mobile : l'icône d'installation devrait apparaître
- Sur desktop : vérifiez dans la barre d'adresse (icône +)

## Problèmes courants

### PWA ne s'installe pas
1. Vérifiez que vous êtes en HTTPS (ou localhost)
2. Assurez-vous que le manifest.json est accessible
3. Vérifiez que les icônes existent
4. Testez sur un navigateur compatible (Chrome, Edge, Firefox)

### Service Worker ne se charge pas
1. Vérifiez la console pour les erreurs
2. Assurez-vous que le fichier sw.js existe dans `/public/`
3. Vérifiez que `next-pwa` est correctement configuré

### Cache ne fonctionne pas
1. Vérifiez la configuration `runtimeCaching` dans `next.config.ts`
2. Assurez-vous que les patterns de cache sont corrects
3. Vérifiez les DevTools > "Network" pour voir les requêtes mises en cache

## Configuration actuelle

### next.config.ts
```typescript
export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Configuration du cache pour les polices, images, etc.
  ],
})(nextConfig as any);
```

### manifest.json
```json
{
  "name": "CMGA Delivery",
  "short_name": "CMGA",
  "description": "Application de suivi des livraisons CMGA",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait",
  "scope": "/",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

## Commandes utiles

### Reconstruire le PWA
```bash
# Supprimer les anciens fichiers
rm -rf .next public/sw.js public/workbox-*.js

# Reconstruire
pnpm build
```

### Vérifier les fichiers générés
```bash
ls -la public/sw.js public/workbox-*.js public/icons/
```

### Tester en production locale
```bash
pnpm build && pnpm start
```

## Support navigateur

- ✅ Chrome 67+
- ✅ Edge 79+
- ✅ Firefox 67+
- ✅ Safari 11.1+ (iOS 11.3+)
- ❌ Internet Explorer (non supporté)

## Ressources utiles

- [Documentation next-pwa](https://github.com/shadowwalker/next-pwa)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Lighthouse PWA Audit](https://developers.google.com/web/tools/lighthouse) 