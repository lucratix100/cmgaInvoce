
export function calculateQuantityDifferences(hasBL: boolean, oldBlProducts: any, currentBlProducts: any) {
    // Créer un nouveau tableau avec les différences

    const differences = oldBlProducts.map(oldProduct => {
        // Trouver le produit correspondant dans currentArray
        if (hasBL) {
            let currentProducts = currentBlProducts.find(p => p.reference === oldProduct.reference);
            return {
                designation: oldProduct.designation,
                reference: oldProduct.reference,
                montantHT: oldProduct.montantHT,
                quantite: currentProducts.quantite,
                remainingQty: oldProduct.remainingQty - currentProducts.quantite
            };
        } else {
            let currentProducts = currentBlProducts.find(p => p.reference === oldProduct.reference);
            return {
                designation: currentProducts.designation,
                reference: currentProducts.reference,
                montantHT: currentProducts.montantHT,
                quantite: parseInt(currentProducts.quantite),
                remainingQty: parseInt(oldProduct.quantite) - currentProducts.quantite
            };
        }

    });




    return differences;
}