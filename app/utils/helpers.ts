export function calculateQuantityDifferences(hasBL: boolean, oldBlProducts: any, currentBlProducts: any) {
    // Créer un nouveau tableau avec les différences

    console.log("oldBlProducts", oldBlProducts, "currentBlProducts", currentBlProducts)
    const differences = oldBlProducts.map((oldProduct: any) => {
        let currentProduct = currentBlProducts.find((p: any) => p.reference === oldProduct.reference);
        let previousRemaining = hasBL ? Number(oldProduct.remainingQty ?? oldProduct.quantite) : Number(oldProduct.quantite);
        let delivered = currentProduct ? Number(currentProduct.quantite) : 0;
        let newRemaining = previousRemaining - delivered;
        if (newRemaining < 0) newRemaining = 0;

        return {
            designation: oldProduct.designation,
            reference: oldProduct.reference,
            montantHT: oldProduct.montantHT,
            prixUnitaire: oldProduct.prixUnitaire,
            total: (currentProduct ? currentProduct.prixUnitaire : oldProduct.prixUnitaire) * delivered,
            quantite: delivered,
            remainingQty: newRemaining
        };
        // Trouver le produit correspondant dans currentArray
        if (hasBL) {
            let currentProduct = currentBlProducts.find((p: any) => p.reference === oldProduct.reference);
            if (!currentProduct) {
                return {
                    designation: oldProduct.designation,
                    reference: oldProduct.reference,
                    montantHT: oldProduct.montantHT,
                    prixUnitaire: oldProduct.prixUnitaire,
                    quantite: 0,
                    remainingQty: oldProduct.remainingQty
                };
            }

            return {
                designation: oldProduct.designation,
                reference: oldProduct.reference,
                montantHT: oldProduct.montantHT,
                prixUnitaire: oldProduct.prixUnitaire,
                total: currentProduct.prixUnitaire * currentProduct.quantite,
                quantite: currentProduct.quantite,
                remainingQty: oldProduct.remainingQty - currentProduct.quantite
            };
        } else {
            let currentProduct = currentBlProducts.find((p: any) => p.reference === oldProduct.reference);

            // Vérifier si currentProduct existe
            if (!currentProduct) {
                return {
                    designation: oldProduct.designation,
                    reference: oldProduct.reference,
                    montantHT: oldProduct.montantHT,
                    prixUnitaire: oldProduct.prixUnitaire,
                    total: oldProduct.prixUnitaire * oldProduct.quantite,
                    quantite: 0,
                    remainingQty: oldProduct.quantite
                };
            }

            return {
                designation: currentProduct.designation,
                reference: currentProduct.reference,
                montantHT: currentProduct.montantHT,
                prixUnitaire: currentProduct.prixUnitaire,
                total: currentProduct.prixUnitaire * currentProduct.quantite,
                quantite: oldBlProducts.quantite,
                remainingQty: oldProduct.quantite - currentProduct.quantite
            };
        }
    });
    // ... existing code ...
    return differences;
} 