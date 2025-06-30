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
    });
    // ... existing code ...
    return differences;
} 