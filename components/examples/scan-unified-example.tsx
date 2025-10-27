'use client'

import ScanUnified from '../scan-unified'

export default function ScanUnifiedExample() {
    return (
        <div className="space-y-8 p-6">
            <h1 className="text-2xl font-bold">Exemples d'utilisation du composant ScanUnified</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Chef de dépôt */}
                <div className="border rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-4">Chef de Dépôt</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Scanne les factures non réceptionnées pour les mettre en attente de livraison
                    </p>
                    <ScanUnified 
                        role="chef-depot"
                        onScan={(result) => console.log('Facture scannée:', result)}
                    />
                </div>

                {/* Magasinier */}
                <div className="border rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-4">Magasinier</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Gère les factures en attente ou en cours de livraison
                    </p>
                    <ScanUnified 
                        role="magasinier"
                        onScan={(result) => console.log('Facture scannée:', result)}
                    />
                </div>

                {/* Superviseur Magasin */}
                <div className="border rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-4">Superviseur Magasin</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Gère les factures avec sélection du chauffeur et magasinier
                    </p>
                    <ScanUnified 
                        role="superviseur-magasin"
                        onScan={(result) => console.log('Facture scannée:', result)}
                    />
                </div>

                {/* Controller */}
                <div className="border rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-4">Controller</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        Confirme les BLs des factures en cours de livraison
                    </p>
                    <ScanUnified 
                        role="controller"
                        onScan={(result) => console.log('Facture scannée:', result)}
                    />
                </div>
            </div>

            {/* Exemple avec contrôle externe */}
            <div className="border rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-4">Contrôle externe du dialogue</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Le dialogue peut être contrôlé depuis l'extérieur avec les props isOpen et onClose
                </p>
                <ScanUnified 
                    role="magasinier"
                    isOpen={false}
                    onClose={() => console.log('Dialogue fermé')}
                    onScan={(result) => console.log('Facture scannée:', result)}
                />
            </div>
        </div>
    )
} 