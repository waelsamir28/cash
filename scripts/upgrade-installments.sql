-- ترقية الأقساط وترقيم الفواتير — لا يحذف أي فاتورة أو صنف أو عميل
BEGIN;

-- الفواتير التجريبية القديمة تأخذ رقماً أرشيفياً منفصلاً، والجديد يبدأ من 1001.
UPDATE invoices SET invoice_no = 'AR-' || invoice_no WHERE invoice_no IN ('1041003847', '1041003848');
UPDATE invoices SET invoice_no = 'PR-' || invoice_no WHERE invoice_no = '2041003849';
UPDATE invoices
SET notes = CASE WHEN notes = '' THEN 'رقم قديم: ' || invoice_no ELSE notes || ' | رقم قديم: ' || invoice_no END,
    invoice_no = 'AR-' || invoice_no
WHERE invoice_no ~ '^[0-9]{7,}$';

-- ربط الدفعة التجريبية القديمة بالفاتورة حتى لا يُخصم المبلغ مرتين.
WITH inserted AS (
  INSERT INTO payment_allocations (payment_id, invoice_id, amount)
  SELECT p.id, i.id, LEAST(p.amount, i.remaining)
  FROM payments p JOIN invoices i ON i.customer_id = p.customer_id
  WHERE p.id = 1 AND i.id = 2 AND i.remaining > 0
    AND NOT EXISTS (SELECT 1 FROM payment_allocations a WHERE a.payment_id = p.id)
  RETURNING invoice_id, amount
)
UPDATE invoices i
SET paid = paid + inserted.amount,
    remaining = remaining - inserted.amount,
    status = CASE WHEN remaining - inserted.amount <= 0 THEN 'مسددة' ELSE 'قسط جزئي' END
FROM inserted WHERE i.id = inserted.invoice_id;

UPDATE customers
SET installment_enabled = true,
    installment_started_at = COALESCE(installment_started_at, created_at)
WHERE balance > 0;

-- مثال متأخر: مدرسة عليها رصيد وآخر سداد منذ حوالي 70 يوماً.
UPDATE invoices SET invoice_date = now() - interval '75 days', payment_type = 'قسط', status = 'قسط جزئي' WHERE id = 2;
UPDATE payments SET payment_date = now() - interval '70 days', note = 'دفعة تجريبية تحت الحساب' WHERE id = 1;
UPDATE customers SET installment_started_at = now() - interval '75 days' WHERE id = 8;

-- مثال منتظم: عميل قسط دفع منذ 20 يوماً، فلا يظهر في تنبيه الشهرين.
INSERT INTO customers (code, name, phone, address, customer_type, balance, opening_balance, installment_enabled, installment_started_at, created_at)
VALUES ('C10006', 'أحمد محمود (قسط تجريبي)', '01222355769', 'القاهرة', 'قسط', 700, 900, true, now() - interval '40 days', now() - interval '40 days')
ON CONFLICT (code) DO NOTHING;

INSERT INTO payments (customer_id, amount, method, note, payment_date, created_at)
SELECT id, 200, 'نقدي', 'دفعة تجريبية منتظمة', now() - interval '20 days', now() - interval '20 days'
FROM customers WHERE code = 'C10006'
  AND NOT EXISTS (SELECT 1 FROM payments WHERE customer_id = customers.id AND note = 'دفعة تجريبية منتظمة');

INSERT INTO settings (key, value) VALUES
('invoiceStartNumber', '1001'),
('installmentAlertMonths', '2')
ON CONFLICT (key) DO NOTHING;

COMMIT;
