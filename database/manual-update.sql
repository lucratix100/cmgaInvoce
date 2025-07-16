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
-- add new value invoice status
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('non réceptionnée', 'en attente de livraison', 'en cours de livraison', 'livrée', 'retour', 'régule'));