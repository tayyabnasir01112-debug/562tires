import { 
  type User, type InsertUser,
  type Product, type InsertProduct,
  type Category, type InsertCategory,
  type Sale, type InsertSale,
  type SaleItem, type InsertSaleItem,
  type Settings, type InsertSettings,
  type Expense, type InsertExpense,
  type SaleWithItems,
  users, products, categories, sales, saleItems, settings, expenses
} from "@shared/schema";
import { db } from "./db";
import { eq, and, lte, gte, desc, sql, asc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  getLowStockProducts(): Promise<Product[]>;
  updateProductQuantity(id: number, quantityChange: number): Promise<Product | undefined>;
  
  // Sales
  getSales(): Promise<Sale[]>;
  getSale(id: number): Promise<Sale | undefined>;
  getSaleWithItems(id: number): Promise<SaleWithItems | undefined>;
  createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<Sale>;
  updateSale(id: number, sale: Partial<InsertSale>): Promise<Sale | undefined>;
  getRecentSales(limit: number): Promise<Sale[]>;
  getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]>;
  
  // Settings
  getSetting(key: string): Promise<Settings | undefined>;
  setSetting(key: string, value: string): Promise<Settings>;
  
  // Analytics
  getDashboardStats(): Promise<{
    totalProducts: number;
    lowStockCount: number;
    todaySales: number;
    todayRevenue: string;
    weekRevenue: string;
    monthRevenue: string;
  }>;
  
  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: number): Promise<boolean>;
  getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]>;
  
  // Analytics
  getTodayActivity(): Promise<{
    sales: SaleWithItems[];
    expenses: Expense[];
    revenue: number;
    expensesTotal: number;
    cogs: number;
    profit: number;
  }>;
  getComparisonData(targetDate: Date): Promise<{
    sales: SaleWithItems[];
    expenses: Expense[];
    revenue: number;
    expensesTotal: number;
    cogs: number;
    profit: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(asc(categories.name));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category as any).returning();
    return created;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.isActive, true)).orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product as any).returning();
    return created;
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set(product)
      .where(eq(products.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteProduct(id: number): Promise<boolean> {
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
    return true;
  }

  async getLowStockProducts(): Promise<Product[]> {
    return db.select().from(products)
      .where(and(
        eq(products.isActive, true),
        sql`${products.quantity} <= ${products.minStockLevel}`
      ))
      .orderBy(asc(products.quantity));
  }

  async updateProductQuantity(id: number, quantityChange: number): Promise<Product | undefined> {
    const [updated] = await db.update(products)
      .set({ quantity: sql`${products.quantity} + ${quantityChange}` })
      .where(eq(products.id, id))
      .returning();
    return updated || undefined;
  }

  // Sales
  async getSales(): Promise<Sale[]> {
    return db.select().from(sales).orderBy(desc(sales.saleDate));
  }

  async getSale(id: number): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale || undefined;
  }

  async getSaleWithItems(id: number): Promise<SaleWithItems | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    if (!sale) return undefined;
    
    const items = await db.select().from(saleItems).where(eq(saleItems.saleId, id));
    return { ...sale, items };
  }

  async createSale(saleData: InsertSale, items: InsertSaleItem[]): Promise<Sale> {
    // Generate invoice number
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

    const [sale] = await db.insert(sales)
      .values({ ...saleData, invoiceNumber } as any)
      .returning();

    // Insert sale items
    for (const item of items) {
      await db.insert(saleItems).values({ ...item, saleId: sale.id } as any);
      // Deduct inventory (skip for custom items where productId is null)
      if (item.productId !== null && item.productId !== undefined) {
        await this.updateProductQuantity(item.productId, -item.quantity);
      }
    }

    return sale;
  }

  async updateSale(id: number, saleData: Partial<InsertSale>): Promise<Sale | undefined> {
    const [updated] = await db.update(sales)
      .set(saleData as any)
      .where(eq(sales.id, id))
      .returning();
    return updated || undefined;
  }

  async getRecentSales(limit: number): Promise<Sale[]> {
    return db.select().from(sales)
      .orderBy(desc(sales.saleDate))
      .limit(limit);
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    return db.select().from(sales)
      .where(and(
        gte(sales.saleDate, startDate),
        lte(sales.saleDate, endDate)
      ))
      .orderBy(desc(sales.saleDate));
  }

  // Settings
  async getSetting(key: string): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting || undefined;
  }

  async setSetting(key: string, value: string): Promise<Settings> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db.update(settings)
        .set({ value })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(settings).values({ key, value }).returning();
    return created;
  }

  // Analytics
  async getDashboardStats(): Promise<{
    totalProducts: number;
    lowStockCount: number;
    todaySales: number;
    todayRevenue: string;
    weekRevenue: string;
    monthRevenue: string;
  }> {
    const allProducts = await db.select().from(products).where(eq(products.isActive, true));
    const lowStockProducts = await this.getLowStockProducts();
    
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const todaySalesData = await db.select().from(sales)
      .where(gte(sales.saleDate, startOfToday));
    
    const weekSalesData = await db.select().from(sales)
      .where(gte(sales.saleDate, startOfWeek));
    
    const monthSalesData = await db.select().from(sales)
      .where(gte(sales.saleDate, startOfMonth));
    
    const todayRevenue = todaySalesData.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);
    const weekRevenue = weekSalesData.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);
    const monthRevenue = monthSalesData.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0);
    
    return {
      totalProducts: allProducts.length,
      lowStockCount: lowStockProducts.length,
      todaySales: todaySalesData.length,
      todayRevenue: todayRevenue.toFixed(2),
      weekRevenue: weekRevenue.toFixed(2),
      monthRevenue: monthRevenue.toFixed(2),
    };
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return db.select().from(expenses).orderBy(desc(expenses.expenseDate));
  }

  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense as any).returning();
    return created;
  }

  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    return db.select()
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, startDate),
          lte(expenses.expenseDate, endDate)
        )
      )
      .orderBy(desc(expenses.expenseDate));
  }

  // Analytics - Get today's activity
  async getTodayActivity(): Promise<{
    sales: SaleWithItems[];
    expenses: Expense[];
    revenue: number;
    expensesTotal: number;
    cogs: number;
    profit: number;
  }> {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    // Get today's sales
    const todaySales = await db.select()
      .from(sales)
      .where(
        and(
          gte(sales.saleDate, startOfToday),
          lte(sales.saleDate, endOfToday)
        )
      )
      .orderBy(desc(sales.saleDate));

    // Get sales with items
    const salesWithItems: SaleWithItems[] = [];
    let revenue = 0;
    let cogs = 0;

    for (const sale of todaySales) {
      const items = await db.select()
        .from(saleItems)
        .where(eq(saleItems.saleId, sale.id));
      
      salesWithItems.push({ ...sale, items });

      revenue += parseFloat(sale.grandTotal);

      // Calculate COGS (Cost of Goods Sold) - use stored costPrice from saleItems
      for (const item of items) {
        const itemCostPrice = parseFloat(item.costPrice || "0");
        cogs += itemCostPrice * item.quantity;
      }
    }

    // Get today's expenses
    const todayExpenses = await db.select()
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, startOfToday),
          lte(expenses.expenseDate, endOfToday)
        )
      )
      .orderBy(desc(expenses.expenseDate));

    const expensesTotal = todayExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const profit = revenue - cogs - expensesTotal;

    return {
      sales: salesWithItems,
      expenses: todayExpenses,
      revenue,
      expensesTotal,
      cogs,
      profit,
    };
  }

  // Analytics - Get comparison data for a specific date
  async getComparisonData(targetDate: Date): Promise<{
    sales: SaleWithItems[];
    expenses: Expense[];
    revenue: number;
    expensesTotal: number;
    cogs: number;
    profit: number;
  }> {
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Get sales for the target date
    const daySales = await db.select()
      .from(sales)
      .where(
        and(
          gte(sales.saleDate, startOfDay),
          lte(sales.saleDate, endOfDay)
        )
      )
      .orderBy(desc(sales.saleDate));

    // Get sales with items
    const salesWithItems: SaleWithItems[] = [];
    let revenue = 0;
    let cogs = 0;

    for (const sale of daySales) {
      const items = await db.select()
        .from(saleItems)
        .where(eq(saleItems.saleId, sale.id));
      
      salesWithItems.push({ ...sale, items });

      revenue += parseFloat(sale.grandTotal);

      // Calculate COGS - use stored costPrice from saleItems
      for (const item of items) {
        const itemCostPrice = parseFloat(item.costPrice || "0");
        cogs += itemCostPrice * item.quantity;
      }
    }

    // Get expenses for the target date
    const dayExpenses = await db.select()
      .from(expenses)
      .where(
        and(
          gte(expenses.expenseDate, startOfDay),
          lte(expenses.expenseDate, endOfDay)
        )
      )
      .orderBy(desc(expenses.expenseDate));

    const expensesTotal = dayExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const profit = revenue - cogs - expensesTotal;

    return {
      sales: salesWithItems,
      expenses: dayExpenses,
      revenue,
      expensesTotal,
      cogs,
      profit,
    };
  }
}

export const storage = new DatabaseStorage();
