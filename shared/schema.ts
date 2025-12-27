import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Categories for organizing products
export const categories = pgTable("categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  description: text("description"),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Products (inventory items)
export const products = pgTable("products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: integer("category_id").references(() => categories.id),
  brand: text("brand"),
  size: text("size"), // e.g., "225/65R17" for tires
  quantity: integer("quantity").notNull().default(0),
  minStockLevel: integer("min_stock_level").notNull().default(5),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull(),
  sellingPrice: decimal("selling_price", { precision: 10, scale: 2 }).notNull(),
  perItemTax: decimal("per_item_tax", { precision: 10, scale: 2 }).default("0"), // Fixed tax per item (e.g., $1.73/tire)
  location: text("location"), // Warehouse location
  condition: text("condition").notNull().default("new"), // new, used, refurbished
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  saleItems: many(saleItems),
}));

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Sales
export const sales = pgTable("sales", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  // Customer info
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  customerAddress: text("customer_address"),
  // Vehicle info (important for tyre shop)
  vehicleMake: text("vehicle_make"),
  vehicleModel: text("vehicle_model"),
  vehicleYear: text("vehicle_year"),
  licensePlate: text("license_plate"),
  mileage: text("mileage"),
  // Pricing
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  globalTaxRate: decimal("global_tax_rate", { precision: 5, scale: 2 }).notNull().default("9.5"), // CA sales tax
  globalTaxAmount: decimal("global_tax_amount", { precision: 10, scale: 2 }).notNull(),
  perItemTaxTotal: decimal("per_item_tax_total", { precision: 10, scale: 2 }).notNull().default("0"),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  laborCost: decimal("labor_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  grandTotal: decimal("grand_total", { precision: 10, scale: 2 }).notNull(),
  // Payment
  paymentMethod: text("payment_method").notNull(), // cash, card, check
  paymentStatus: text("payment_status").notNull().default("paid"), // paid, pending
  // Notes
  notes: text("notes"),
  // Timestamps
  saleDate: timestamp("sale_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const salesRelations = relations(sales, ({ many }) => ({
  items: many(saleItems),
}));

export const insertSaleSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;

// Sale Items (line items in a sale)
export const saleItems = pgTable("sale_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  productId: integer("product_id").references(() => products.id), // Nullable for custom items
  productName: text("product_name").notNull(), // Snapshot at time of sale
  productSku: text("product_sku").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  perItemTax: decimal("per_item_tax", { precision: 10, scale: 2 }).default("0"),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
});

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true });
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type SaleItem = typeof saleItems.$inferSelect;

// Store settings
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Types for frontend use
export type ProductWithCategory = Product & { category?: Category | null };
export type SaleWithItems = Sale & { items: (SaleItem & { product?: Product })[] };

// Form schemas with validation
export const productFormSchema = insertProductSchema.extend({
  sku: z.string().min(1, "SKU is required"),
  name: z.string().min(1, "Product name is required"),
  costPrice: z.string().min(1, "Cost price is required"),
  sellingPrice: z.string().min(1, "Selling price is required"),
  quantity: z.number().min(0, "Quantity must be 0 or more"),
  minStockLevel: z.number().min(0, "Min stock level must be 0 or more"),
});

export const saleFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleYear: z.string().optional(),
  licensePlate: z.string().optional(),
  mileage: z.string().optional(),
  paymentMethod: z.enum(["cash", "card", "check"]),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number(),
    quantity: z.number().min(1),
    unitPrice: z.string(),
    perItemTax: z.string(),
  })).min(1, "At least one item is required"),
  discount: z.string().optional(),
});

export type SaleFormData = z.infer<typeof saleFormSchema>;

// Legacy user table (keeping for compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Expenses (daily store expenses)
export const expenses = pgTable("expenses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: text("category"), // e.g., "Supplies", "Utilities", "Rent", "Other"
  paymentMethod: text("payment_method"), // cash, card, check
  notes: text("notes"),
  expenseDate: timestamp("expense_date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
