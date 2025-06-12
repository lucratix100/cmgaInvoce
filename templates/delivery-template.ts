export const getDeliveryTemplate = (data: {
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryDate: string;
  driverName: string;
  driverPhone: string;
  products: any[];
}) => `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bon de Livraison - CMGA</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      height: 100%;
      font-family: Arial, sans-serif;
    }

    body {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      line-height: 1.6;
      color: #333;
      font-size: 12px;
      padding: 20px;
    }

    .page-container {
      flex: 1 0 auto;
      max-width: 800px;
      margin: 0 auto;
      width: 100%;
    }

    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #007bff;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }

    .company-info {
      text-align: right;
    }

    .company-name {
      font-size: 18px;
      font-weight: bold;
      color: #007bff;
      margin-bottom: 5px;
    }

    .document-title {
      text-align: center;
      background-color: #f8f9fa;
      padding: 10px;
      margin-bottom: 20px;
      border-radius: 5px;
    }

    .client-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
    }

    .info-section {
      width: 48%;
    }

    .info-section h3 {
      border-bottom: 1px solid #dee2e6;
      padding-bottom: 5px;
      margin-bottom: 10px;
      color: #007bff;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    th, td {
      border: 1px solid #dee2e6;
      padding: 8px;
      text-align: left;
    }

    th {
      background-color: #f8f9fa;
      font-weight: bold;
      color: #007bff;
    }

    .signature-area {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
    }

    .signature-box {
      width: 45%;
      text-align: center;
    }

    .signature-line {
      border-top: 1px solid #333;
      margin-top: 50px;
      padding-top: 5px;
    }

    .footer-notes {
      flex-shrink: 0;
      background-color: #f8f9fa;
      padding: 15px;
      text-align: center;
      border-top: 1px solid #dee2e6;
      margin-top: 20px;
    }

    .footer-notes p {
      margin: 5px 0;
      color: #666;
    }

    .footer-notes .policy-text {
      font-weight: bold;
      color: #007bff;
      margin-bottom: 10px;
    }

    .footer-notes .contact {
      font-weight: bold;
      color: #333;
    }

    @media print {
      body {
        padding: 0;
      }
      .footer-notes {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <div class="header">
      <div>
        <p>Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
      </div>
      <div class="company-info">
        <div class="company-name">CMGA</div>
        <p>SODIDA LOT 37638 - BP: 17439</p>
        <p>DAKAR - SENEGAL</p>
        <p>TEL: +221 33 869 37 89</p>
      </div>
    </div>

    <div class="document-title">
      <h2>Bon de Livraison Partiel - Facture #${data.invoiceNumber}</h2>
    </div>

    <div class="client-info">
      <div class="info-section">
        <h3>Informations Client</h3>
        <p><strong>Nom:</strong> ${data.customerName}</p>
        <p><strong>Téléphone:</strong> ${data.customerPhone}</p>
        <p><strong>Date de Livraison:</strong> ${data.deliveryDate}</p>
      </div>
      <div class="info-section">
        <h3>Informations Chauffeur</h3>
        <p><strong>Nom:</strong> ${data.driverName}</p>
        <p><strong>Téléphone:</strong> ${data.driverPhone}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Désignation</th>
          <th>Qté livrée</th>
          <th>Qté restante</th>
        </tr>
      </thead>
      <tbody>
        ${data.products.map(product => `
          <tr>
            <td>${product.designation || 'N/A'}</td>
            <td>${product.quantite}</td>
            <td>${product.remainingQty}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="signature-area">
      <div class="signature-box">
        <p>Signature et cachet (CMGA)</p>
        <div class="signature-line"></div>
      </div>
      <div class="signature-box">
        <p>Signature du client</p>
        <div class="signature-line"></div>
      </div>
    </div>
  </div>

  <div class="footer-notes">
    <p class="policy-text">COMPAGNIE MAMADOU NGONE AGRO-INDUSTRIES</p>
    <p>La signature de ce bon de livraison atteste de la réception conforme des marchandises.</p>
    <p>🚨 <strong>Attention :</strong> Aucune réclamation ne sera acceptée après signature.</p>
    <p class="contact">Contact: +221 33 869 37 89</p>
  </div>
</body>
</html>
`