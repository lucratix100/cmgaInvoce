-- Vérification
SELECT id, invoice_number, date, status, total_ttc
FROM invoices 
WHERE date BETWEEN '2025-07-01' AND '2025-07-15'
  AND UPPER(invoice_number) LIKE '%R%';

-- Mise à jour
UPDATE invoices 
SET status = 'retour', total_ttc = -ABS(total_ttc), updated_at = NOW()
WHERE date BETWEEN '2025-07-01' AND '2025-07-15'
  AND UPPER(invoice_number) LIKE '%R%';