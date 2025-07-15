// // import type { HttpContext } from '@adonisjs/core/http'
// import Customer from '#models/customer'
// import Invoice from '#models/invoice'
// import db from '@adonisjs/lucid/services/db'
// import xmljs from 'xml-js'
// import { InvoiceStatus } from '../enum/index.js'
// import Depot from '#models/depot'
// export default class SageInvoicesController {
//     async invoice_xml_to_json() {
//         try {
//             const result = await db.connection('mssql').rawQuery(`
//             DECLARE @dateDebut smalldatetime
//             DECLARE @dateFin smalldatetime

//             -- Date du jour -1 (hier)
//             SET @dateDebut = CAST(DATEADD(DAY, -1, GETDATE()) AS smalldatetime)

//             -- Date du jour actuel
//             SET @dateFin = CAST(GETDATE() AS smalldatetime)

//             -- Liste des bases à interroger
//             DECLARE @bases TABLE (NomBase NVARCHAR(100))
//             INSERT INTO @bases (NomBase)
//             VALUES 
//                 ('GESTION_ZIGUINCHOR'),
//                 ('GESTION_PIKINE'),
//                 ('GESTION_CMGA_TH2021'),
//                 ('GESTION_CMGA_KH2021'),
//                 ('GESTION_CMGA_FD2021'),
//                 ('GESTION_CMGA_KLK2023'),
//                 ('GESTION_CMGA_2020')

//             DECLARE @sql NVARCHAR(MAX) = ''
//             DECLARE @baseName NVARCHAR(100)
//             DECLARE @isFirst BIT = 1

//             DECLARE base_cursor CURSOR FOR 
//             SELECT NomBase FROM @bases

//             OPEN base_cursor
//             FETCH NEXT FROM base_cursor INTO @baseName

//             WHILE @@FETCH_STATUS = 0
//             BEGIN
//                 IF @isFirst = 0
//                     SET @sql += 'UNION ALL' + CHAR(13)

//                 SET @sql += '
//                 SELECT
//                     ''' + @baseName + ''' AS ''@nomBase'',
//                     entete.DO_Piece AS ''@numeroFacture'',
//                     entete.DO_Date AS ''@dateFacture'',
//                     client.CT_Num AS ''@codeClient'',
//                     (
//                         SELECT
//                             client.CT_Telephone AS ''telephone'',
//                             client.CT_Intitule AS ''nom'',
//                             client.CT_Num AS ''code''
//                         FOR XML PATH(''client''), TYPE
//                     ),
//                     (
//                         SELECT
//                             l.AR_Ref AS ''@reference'',
//                             l.DL_Design AS ''@designation'',
//                             CAST(l.DL_Qte AS INT) AS ''@quantite'',
//                             l.DL_PrixUnitaire AS ''@prixUnitaire'',
//                             l.DL_MontantHT AS ''@montantHT'',
//                             l.DL_Taxe1 AS ''@tva'',
// 				            l.DL_Taxe2 AS ''@tva2'',
// 				            l.DL_Remise01REM_Valeur  AS ''@remise''
//                         FROM ' + @baseName + '.dbo.F_DOCLIGNE l
//                         WHERE l.DO_Piece = entete.DO_Piece
//                           AND l.DO_Type = entete.DO_Type
//                         FOR XML PATH(''produit''), ROOT(''orders''), TYPE
//                     )
//                 FROM
//                     ' + @baseName + '.dbo.F_DOCENTETE entete
//                 INNER JOIN
//                     COMPTA_CMGA_2021.dbo.F_COMPTET client 
//                     ON entete.DO_Tiers = client.CT_Num
//                 WHERE
//                     entete.DO_Type IN (1,2,3,4,5,6,7,8,9,17)
//                     AND CAST(entete.DO_Date AS date) IN (CAST(@dateDebut AS date), CAST(@dateFin AS date))
//                 ' + CHAR(13)

//                 SET @isFirst = 0
//                 FETCH NEXT FROM base_cursor INTO @baseName
//             END

//             CLOSE base_cursor
//             DEALLOCATE base_cursor

//             -- Ajouter la sortie XML finale
//             SET @sql += '
//             FOR XML PATH(''facture''), ROOT(''factures'')
//             '

//             -- Exécuter la requête XML
//             EXEC sp_executesql @sql, 
//                 N'@dateDebut smalldatetime, @dateFin smalldatetime', 
//                 @dateDebut, @dateFin
//             `)
//             await db.manager.close('mssql')

//             const xmlString = result.reduce((xml: string, row: any) => {
//                 return xml + row['XML_F52E2B61-18A1-11d1-B105-00805F49916B']
//             }, '')
//             const invoiceJson = xmljs.xml2js(xmlString, { compact: true }) as any


//             const depots = await Depot.all()

//             // Vérifier que factures existe et est un tableau
//             if (!invoiceJson.factures?.facture) {
//                 console.log('Aucune facture trouvée dans le XML')
//                 return { success: true, message: 'Aucune facture à traiter' }
//             }

//             const factures = Array.isArray(invoiceJson.factures.facture)
//                 ? invoiceJson.factures.facture
//                 : [invoiceJson.factures.facture]

//             // Utiliser Promise.all pour traiter les factures en parallèle
//             await Promise.all(factures.map(async (invoice: any) => {

//                 // Vérifier que la facture a un numéro valide
//                 if (!invoice._attributes?.numeroFacture) {
//                     console.log('Facture ignorée: numéro de facture manquant')
//                     return
//                 }

//                 const isInvoiceExist = await Invoice.findBy('invoice_number', invoice._attributes.numeroFacture)
//                 console.log(isInvoiceExist, 'isInvoiceExist xml');
//                 if (!invoice.orders || (invoice?._attributes?.numeroFacture[0]?.toUpperCase() !== "F")) return // Ignorer si pas d'orders ou ne commence pas par F

//                 // Extraire les données client
//                 const customerData = {
//                     accountNumber: invoice.client.code._text,
//                     name: invoice.client.nom._text,
//                     phone: invoice.client?.telephone?._text?.replace(/\s+/g, ''),
//                 }
//                 const isCustomerExist = await Customer.findBy('account_number', customerData.accountNumber)
//                 let customerId = null
//                 if (isCustomerExist) {
//                     customerId = isCustomerExist.id
//                 } else {
//                     const { id } = await Customer.create(customerData)
//                     customerId = id
//                 }

//                 // Normaliser les produits en tableau
//                 let products = invoice?.orders ? invoice?.orders?.produit : null
//                 if (products && !Array.isArray(products)) {
//                     products = [products];
//                 }

//                 if (!products || !invoice.orders) return // Ignorer si pas de produits

//                 // Formater les produits avec validation des nombres
//                 const formattedProducts = products.map((product: any) => {
//                     // Validation et parsing sécurisé des nombres
//                     const tva = Math.abs(parseInt(product._attributes.tva) || 0)
//                     const tva2 = Math.abs(parseInt(product._attributes.tva2) || 0)
//                     const tvaMax = Math.max(tva, tva2) // Prendre la TVA la plus élevée
//                     const remise = Math.abs(parseInt(product._attributes.remise) || 0) // Convertir la remise en pourcentage

//                     const prixUnitaire = Math.abs(parseFloat(product._attributes.prixUnitaire) || 0)
//                     const montantTva = Math.abs((tvaMax / 100) * prixUnitaire)
//                     const prixUnitaireTva = Math.round(prixUnitaire + montantTva)
//                     const quantite = Math.abs(parseInt(product._attributes.quantite, 10) || 0)

//                     // Appliquer la remise si elle existe
//                     const prixAvecRemise = remise > 0 ? Math.abs((prixUnitaireTva * quantite) * (1 - remise / 100)) : prixUnitaireTva * quantite

//                     // Si la référence contient "FRAIS", le prix unitaire doit être négatif
//                     const prixFinal = product?._attributes?.reference?.toUpperCase().includes('FRAIS')
//                         ? -prixAvecRemise
//                         : prixAvecRemise

//                     return {
//                         reference: product._attributes.reference,
//                         designation: product._attributes.designation,
//                         quantite: quantite,
//                         tva: montantTva,
//                         remise: remise,
//                         prixUnitaire: prixUnitaireTva,
//                         total: Math.round(prixFinal), // Arrondir pour éviter les décimales
//                     }
//                 })

//                 // Validation du totalTTC
//                 const totalTTC = Math.round(formattedProducts.reduce((acc: number, product: any) => {
//                     const productTotal = product.total || 0
//                     return acc + productTotal
//                 }, 0))

//                 // Vérifier que totalTTC est un nombre valide
//                 if (isNaN(totalTTC)) {
//                     console.log(`Facture ${invoice._attributes.numeroFacture} ignorée: totalTTC invalide`)
//                     return
//                 }

//                 const depot = depots.find((depot: any) => depot.name === invoice._attributes.nomBase)

//                 // Préparer les données de la facture
//                 const invoiceData = {
//                     customerId: customerId,
//                     accountNumber: invoice._attributes.codeClient,
//                     depotId: depot?.id,
//                     invoiceNumber: invoice._attributes.numeroFacture,
//                     date: invoice._attributes.dateFacture,
//                     order: JSON.stringify(formattedProducts),
//                     totalTTC: totalTTC,
//                     status: InvoiceStatus.NON_RECEPTIONNEE,
//                     isCompleteDelivery: true
//                 }

//                 if (!isInvoiceExist) await Invoice.create(invoiceData)

//             }))

//             return { success: true, message: 'Importation des factures terminée' }
//         } catch (error) {
//             console.error('Erreur lors de l\'importation des factures:', error)
//             return { success: false, message: 'Erreur lors de l\'importation des factures', error }
//         }
//     }
// }

// import type { HttpContext } from '@adonisjs/core/http'
import Customer from '#models/customer'
import Invoice from '#models/invoice'
import db from '@adonisjs/lucid/services/db'
import xmljs from 'xml-js'
import { InvoiceStatus } from '../enum/index.js'
import Depot from '#models/depot'
export default class SageInvoicesController {
    async invoice_xml_to_json() {
        try {
            const result = await db.connection('mssql').rawQuery(`
            DECLARE @dateDebut smalldatetime
            DECLARE @dateFin smalldatetime
            
            -- Date du jour -1 (hier)
            SET @dateDebut = CAST(DATEADD(DAY, -1, GETDATE()) AS smalldatetime)
            
            -- Date du jour actuel
            SET @dateFin = CAST(GETDATE() AS smalldatetime)
            
            -- Liste des bases à interroger
            DECLARE @bases TABLE (NomBase NVARCHAR(100))
            INSERT INTO @bases (NomBase)
            VALUES 
                ('GESTION_ZIGUINCHOR'),
                ('GESTION_PIKINE'),
                ('GESTION_CMGA_TH2021'),
                ('GESTION_CMGA_KH2021'),
                ('GESTION_CMGA_FD2021'),
                ('GESTION_CMGA_KLK2023'),
                ('GESTION_CMGA_2020')
            
            DECLARE @sql NVARCHAR(MAX) = ''
            DECLARE @baseName NVARCHAR(100)
            DECLARE @isFirst BIT = 1
            
            DECLARE base_cursor CURSOR FOR 
            SELECT NomBase FROM @bases
            
            OPEN base_cursor
            FETCH NEXT FROM base_cursor INTO @baseName
            
            WHILE @@FETCH_STATUS = 0
            BEGIN
                IF @isFirst = 0
                    SET @sql += 'UNION ALL' + CHAR(13)
            
                SET @sql += '
                SELECT
                    ''' + @baseName + ''' AS ''@nomBase'',
                    entete.DO_Piece AS ''@numeroFacture'',
                    entete.DO_Date AS ''@dateFacture'',
                    client.CT_Num AS ''@codeClient'',
                    (
                        SELECT
                            client.CT_Telephone AS ''telephone'',
                            client.CT_Intitule AS ''nom'',
                            client.CT_Num AS ''code''
                        FOR XML PATH(''client''), TYPE
                    ),
                    (
                        SELECT
                            l.AR_Ref AS ''@reference'',
                            l.DL_Design AS ''@designation'',
                            CAST(l.DL_Qte AS INT) AS ''@quantite'',
                            l.DL_PrixUnitaire AS ''@prixUnitaire'',
                            l.DL_MontantHT AS ''@montantHT'',
                            l.DL_Taxe1 AS ''@tva'',
				            l.DL_Taxe2 AS ''@tva2'',
				            l.DL_Remise01REM_Valeur  AS ''@remise''
                        FROM ' + @baseName + '.dbo.F_DOCLIGNE l
                        WHERE l.DO_Piece = entete.DO_Piece
                          AND l.DO_Type = entete.DO_Type
                        FOR XML PATH(''produit''), ROOT(''orders''), TYPE
                    )
                FROM
                    ' + @baseName + '.dbo.F_DOCENTETE entete
                INNER JOIN
                    COMPTA_CMGA_2021.dbo.F_COMPTET client 
                    ON entete.DO_Tiers = client.CT_Num
                WHERE
                    entete.DO_Type IN (1,2,3,4,5,6,7,8,9,17)
                    AND CAST(entete.DO_Date AS date) IN (CAST(@dateDebut AS date), CAST(@dateFin AS date))
                ' + CHAR(13)
            
                SET @isFirst = 0
                FETCH NEXT FROM base_cursor INTO @baseName
            END
            
            CLOSE base_cursor
            DEALLOCATE base_cursor
            
            -- Ajouter la sortie XML finale
            SET @sql += '
            FOR XML PATH(''facture''), ROOT(''factures'')
            '
            
            -- Exécuter la requête XML
            EXEC sp_executesql @sql, 
                N'@dateDebut smalldatetime, @dateFin smalldatetime', 
                @dateDebut, @dateFin
            `)
            await db.manager.close('mssql')

            const xmlString = result.reduce((xml: string, row: any) => {
                return xml + row['XML_F52E2B61-18A1-11d1-B105-00805F49916B']
            }, '')
            const invoiceJson = xmljs.xml2js(xmlString, { compact: true }) as any
            const depots = await Depot.all()
            // Vérifier que factures existe et est un tableau
            if (!invoiceJson.factures?.facture) {
                console.log('Aucune facture trouvée dans le XML')
                return { success: true, message: 'Aucune facture à traiter' }
            }

            const factures = Array.isArray(invoiceJson.factures.facture)
                ? invoiceJson.factures.facture
                : [invoiceJson.factures.facture]

            // Utiliser Promise.all pour traiter les factures en parallèle
            await Promise.all(factures.map(async (invoice: any) => {

                // Vérifier que la facture a un numéro valide
                if (!invoice._attributes?.numeroFacture) {
                    console.log('Facture ignorée: numéro de facture manquant')
                    return
                }

                const isInvoiceExist = await Invoice.findBy('invoice_number', invoice._attributes.numeroFacture)
                if (isInvoiceExist) {
                    console.log(`Facture ${invoice._attributes.numeroFacture} existe déjà, ignorée`)
                    return
                }

                if (!invoice.orders || (invoice?._attributes?.numeroFacture[0]?.toUpperCase() !== "F")) return // Ignorer si pas d'orders ou ne commence pas par F

                // Extraire les données client
                const customerData = {
                    accountNumber: invoice.client.code._text,
                    name: invoice.client.nom._text,
                    phone: invoice.client?.telephone?._text?.replace(/\s+/g, ''),
                }
                const isCustomerExist = await Customer.findBy('account_number', customerData.accountNumber)
                let customerId = null
                if (isCustomerExist) {
                    customerId = isCustomerExist.id
                } else {
                    const { id } = await Customer.create(customerData)
                    customerId = id
                }

                // Normaliser les produits en tableau
                let products = invoice?.orders ? invoice?.orders?.produit : null
                if (products && !Array.isArray(products)) {
                    products = [products];
                }

                if (!products || !invoice.orders) return // Ignorer si pas de produits

                // Formater les produits avec validation des nombres
                const formattedProducts = products.map((product: any) => {
                    // Validation et parsing sécurisé des nombres
                    const tva = Math.abs(parseInt(product._attributes.tva) || 0)
                    const tva2 = Math.abs(parseInt(product._attributes.tva2) || 0)
                    const tvaMax = Math.max(tva, tva2) // Prendre la TVA la plus élevée
                    const remise = Math.abs(parseInt(product._attributes.remise) || 0) // Convertir la remise en pourcentage

                    const prixUnitaire = Math.abs(parseFloat(product._attributes.prixUnitaire) || 0)
                    const montantTva = Math.abs((tvaMax / 100) * prixUnitaire)
                    const prixUnitaireTva = Math.round(prixUnitaire + montantTva)
                    const quantite = Math.abs(parseInt(product._attributes.quantite, 10) || 0)

                    // Appliquer la remise si elle existe
                    const prixAvecRemise = remise > 0 ? Math.abs((prixUnitaireTva * quantite) * (1 - remise / 100)) : prixUnitaireTva * quantite

                    // Si la référence contient "FRAIS", le prix unitaire doit être négatif
                    const prixFinal = product?._attributes?.reference?.toUpperCase().includes('FRAIS')
                        ? -prixAvecRemise
                        : prixAvecRemise

                    return {
                        reference: product._attributes.reference,
                        designation: product._attributes.designation,
                        quantite: quantite,
                        tva: `${tvaMax}%`,
                        remise: `${remise}%`,
                        prixUnitaire: prixUnitaireTva,
                        total: Math.round(prixFinal), // Arrondir pour éviter les décimales
                    }
                })

                // Validation du totalTTC
                const totalTTC = Math.round(formattedProducts.reduce((acc: number, product: any) => {
                    const productTotal = product.total || 0
                    return acc + productTotal
                }, 0))

                // Vérifier que totalTTC est un nombre valide
                if (isNaN(totalTTC)) {
                    console.log(`Facture ${invoice._attributes.numeroFacture} ignorée: totalTTC invalide`)
                    return
                }

                const depot = depots.find((depot: any) => depot.name === invoice._attributes.nomBase)

                // Vérifier si la référence contient la lettre "R" pour déterminer le statut et le montant
                const hasReturnReference = formattedProducts.some((product: any) =>
                    product.reference?.toUpperCase().includes('R')
                )

                // Déterminer le statut et le montant total
                let finalStatus = InvoiceStatus.NON_RECEPTIONNEE
                let finalTotalTTC = totalTTC

                if (hasReturnReference) {
                    finalStatus = InvoiceStatus.RETOUR
                    finalTotalTTC = -Math.abs(totalTTC) // Rendre le montant négatif
                }

                // Préparer les données de la facture
                const invoiceData = {
                    customerId: customerId,
                    accountNumber: invoice._attributes.codeClient,
                    depotId: depot?.id,
                    invoiceNumber: invoice._attributes.numeroFacture,
                    date: invoice._attributes.dateFacture,
                    order: JSON.stringify(formattedProducts),
                    totalTTC: finalTotalTTC,
                    status: finalStatus,
                    isCompleteDelivery: true
                }

                // Créer une nouvelle facture
                await Invoice.create(invoiceData)
                console.log(`Nouvelle facture ${invoice._attributes.numeroFacture} créée`)
            }))

            return { success: true, message: 'Importation des factures terminée' }
        } catch (error) {
            console.error('Erreur lors de l\'importation des factures:', error)
            return { success: false, message: 'Erreur lors de l\'importation des factures', error }
        }
    }
}