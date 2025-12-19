# 562 Tyres – Getting Started

This app is deployed at `https://neon-speculoos-4ec750.netlify.app`. Keep the browser tab open while working with inventory and sales.

## 1) Initial setup
- Environment: `DATABASE_URL` is already set in Netlify (Neon).
- No auth yet: anyone with the URL can access. Keep the link private or add auth later.

## 2) Inventory import (CSV/XLSX)
- Go to **Inventory → Import**.
- Template columns (header row required, order as below):
  - `sku`, `name`, `brand`, `size`, `quantity`, `costPrice`, `sellingPrice`, `perItemTax`
- `perItemTax` supports per-unit taxes (e.g., 1.73 for $1.73 per tire).
- Preview checks the first 5 rows; full import will insert/update by SKU.

## 3) Manual inventory entry
- **Inventory → Add Product**.
- Required: SKU, Name, Quantity, Cost Price, Selling Price.
- Optional: Brand, Size, Per Item Tax, Min Stock Level, Location.
- Edits and deletes are available per row; deletes just mark inactive.

## 4) Recording a sale
- **Sales → New Sale**.
- Customer/Vehicle: name, phone, vehicle make/model/year, plate, mileage.
- Items: select product, set quantity, unit price, and per-item tax (for $1.73/tire, enter 1.73).
- Global tax: set in Settings (defaults to 9.5%); applied to subtotal.
- Discount: optional.
- Saving a sale:
  - Deducts quantities from inventory.
  - Generates an invoice number and stores line items.
  - Triggers cache refresh for dashboard, inventory, and sales lists.

## 5) Invoice PDF
- **Sales → History → View** on a sale, then **Download Invoice**.
- Includes shop header (“562 Tyres”), customer + vehicle details, line items, per-item tax, global tax, discounts, and totals.

## 6) Analytics
- **Analytics** shows revenue and counts (daily/weekly/monthly), payment mix, and top products.
- Exports:
  - Sales CSV/XLSX: `/api/sales/export?format=csv` or `format=xlsx`.
  - Analytics XLSX: `/api/analytics/export`.

## 7) Settings
- **Settings → Tax** to change the global tax rate; per-item tax remains per line item.
- Categories can be added/renamed/deleted; products can reference categories.

## 8) Backups (manual)
- Periodically export:
  - Sales: `/api/sales/export?format=xlsx`
  - Inventory: `/api/analytics/export` (Inventory sheet inside)
- Store exports in Google Drive or another safe location.

## 9) Operational notes
- Free tiers (Netlify + Neon free) may cold-start; a few seconds delay on the first request is normal.
- Connection limits: avoid opening many browser tabs doing heavy imports simultaneously.
- If builds fail, ensure `DATABASE_URL` is set in Netlify env vars.

## 10) Future hardening (optional)
- Add auth (e.g., Netlify Identity or simple password gate).
- Add scheduled exports to cloud storage.
- Add role-based access (cashier vs admin) and audit logs.

