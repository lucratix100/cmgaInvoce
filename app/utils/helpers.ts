export function calculateQuantityDifferences(hasBL: boolean, oldBlProducts: any, currentBlProducts: any) {
    // Créer un nouveau tableau avec les différences

    const differences = oldBlProducts.map(oldProduct => {
        // Trouver le produit correspondant dans currentArray
        if (hasBL) {
            console.log(currentBlProducts, 'currentBlProducts');

            let currentProduct = currentBlProducts.find(p => p.reference === oldProduct.reference);

            // Vérifier si currentProduct existe
            if (!currentProduct) {
                return {
                    designation: oldProduct.designation,
                    reference: oldProduct.reference,
                    montantHT: oldProduct.montantHT,
                    quantite: 0,
                    remainingQty: oldProduct.remainingQty
                };
            }

            return {
                designation: oldProduct.designation,
                reference: oldProduct.reference,
                montantHT: oldProduct.montantHT,
                quantite: currentProduct.quantite,
                remainingQty: oldProduct.remainingQty - currentProduct.quantite
            };
        } else {
            let currentProduct = currentBlProducts.find(p => p.reference === oldProduct.reference);

            // Vérifier si currentProduct existe
            if (!currentProduct) {
                return {
                    designation: oldProduct.designation,
                    reference: oldProduct.reference,
                    montantHT: oldProduct.montantHT,
                    quantite: 0,
                    remainingQty: parseInt(oldProduct.quantite)
                };
            }

            return {
                designation: currentProduct.designation,
                reference: currentProduct.reference,
                montantHT: currentProduct.montantHT,
                quantite: parseInt(currentProduct.quantite),
                remainingQty: parseInt(oldProduct.quantite) - currentProduct.quantite
            };
        }
    });
    // ... existing code ...
    return differences;
} 