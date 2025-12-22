import type { Express } from "express";
import { storage } from "./storage";
import multer from "multer";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { insertProductSchema, insertCategorySchema, saleFormSchema } from "@shared/schema";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

const DEFAULT_TIRE_FEE = 1.75;

function detectPerItemTax(product: any, category?: any) {
  const explicit = product?.perItemTax ? parseFloat(product.perItemTax) : 0;
  if (explicit > 0) return explicit;

  const catName = category?.name?.toLowerCase?.() || "";
  const isTireCategory = catName.includes("tire");
  const isTireName = (product?.name || "").toLowerCase().includes("tire");

  if (isTireCategory || isTireName) {
    return DEFAULT_TIRE_FEE;
  }
  return 0;
}

export async function registerRoutes(app: Express): Promise<void> {
  
  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const data = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(data);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create category" });
      }
    }
  });

  app.patch("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertCategorySchema.partial().parse(req.body);
      const category = await storage.updateCategory(id, validated);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update category" });
      }
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCategory(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/low-stock", async (req, res) => {
    try {
      const products = await storage.getLowStockProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch low stock products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const product = await storage.getProduct(id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const validated = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validated);
      res.status(201).json(product);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else if (error.code === '23505') {
        res.status(400).json({ message: "A product with this SKU already exists" });
      } else {
        res.status(500).json({ message: "Failed to create product" });
      }
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validated = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, validated);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else if (error.code === '23505') {
        res.status(400).json({ message: "A product with this SKU already exists" });
      } else {
        res.status(500).json({ message: "Failed to update product" });
      }
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProduct(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Product Import
  app.post("/api/products/import/preview", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      // Skip header row, get first 5 data rows
      const rows = data.slice(1, 6).map((row) => ({
        sku: row[0] || "",
        name: row[1] || "",
        brand: row[2] || "",
        size: row[3] || "",
        quantity: row[4] || "0",
        costPrice: row[5] || "0",
        sellingPrice: row[6] || "0",
        perItemTax: row[7] || "0",
      }));

      res.json({ rows });
    } catch (error) {
      res.status(500).json({ message: "Failed to parse file" });
    }
  });

  app.post("/api/products/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      let imported = 0;
      // Skip header row
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0] || !row[1]) continue; // Skip rows without SKU or name

        const productData = {
          sku: String(row[0]),
          name: String(row[1]),
          brand: row[2] ? String(row[2]) : undefined,
          size: row[3] ? String(row[3]) : undefined,
          quantity: parseInt(row[4]) || 0,
          costPrice: String(parseFloat(row[5]) || 0),
          sellingPrice: String(parseFloat(row[6]) || 0),
          perItemTax: String(parseFloat(row[7]) || 0),
          minStockLevel: 5,
          isActive: true,
        };

        try {
          // Check if product exists by SKU
          const existing = await storage.getProductBySku(productData.sku);
          if (existing) {
            await storage.updateProduct(existing.id, productData);
          } else {
            await storage.createProduct(productData);
          }
          imported++;
        } catch (e) {
          console.error(`Failed to import row ${i}:`, e);
        }
      }

      res.json({ imported, message: `${imported} products imported successfully` });
    } catch (error) {
      res.status(500).json({ message: "Failed to import products" });
    }
  });

  // Sales
  app.get("/api/sales", async (req, res) => {
    try {
      const sales = await storage.getSales();
      res.json(sales);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sales" });
    }
  });

  app.get("/api/sales/recent", async (req, res) => {
    try {
      const sales = await storage.getRecentSales(10);
      res.json(sales);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent sales" });
    }
  });

  app.get("/api/sales/export", async (req, res) => {
    try {
      const format = req.query.format as string || "csv";
      const sales = await storage.getSales();

      const data = sales.map((s) => ({
        "Invoice #": s.invoiceNumber,
        "Date": new Date(s.saleDate!).toLocaleDateString(),
        "Customer": s.customerName,
        "Phone": s.customerPhone || "",
        "Vehicle": `${s.vehicleYear || ""} ${s.vehicleMake || ""} ${s.vehicleModel || ""}`.trim(),
        "Payment": s.paymentMethod,
        "Subtotal": parseFloat(s.subtotal).toFixed(2),
        "Tax": parseFloat(s.globalTaxAmount).toFixed(2),
        "Total": parseFloat(s.grandTotal).toFixed(2),
      }));

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");

      const buffer = XLSX.write(workbook, { 
        type: "buffer", 
        bookType: format === "xlsx" ? "xlsx" : "csv" 
      });

      res.setHeader(
        "Content-Type",
        format === "xlsx"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "text/csv"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=sales-report.${format}`
      );
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to export sales" });
    }
  });

  app.get("/api/sales/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sale = await storage.getSaleWithItems(id);
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }
      res.json(sale);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sale" });
    }
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const { items, ...saleData } = req.body;

      // Validate stock availability
      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        if (!product) {
          return res.status(400).json({ message: `Product not found: ${item.productId}` });
        }
        if (product.quantity < item.quantity) {
          return res.status(400).json({ 
            message: `Insufficient stock for ${product.name}. Available: ${product.quantity}` 
          });
        }
      }

      const saleItems = [];
      let perItemTaxTotal = 0;

      for (const item of items) {
        const product = await storage.getProduct(item.productId);
        const category = product?.categoryId ? await storage.getCategory(product.categoryId) : undefined;
        const perItemTax = item.perItemTax && item.perItemTax !== ""
          ? parseFloat(item.perItemTax)
          : detectPerItemTax(product, category);
        const lineTotal = parseFloat(item.unitPrice) * item.quantity;
        const lineTaxTotal = perItemTax * item.quantity;
        perItemTaxTotal += lineTaxTotal;

        saleItems.push({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          perItemTax: perItemTax.toFixed(2),
          lineTotal: lineTotal.toFixed(2),
        });
      }

      const laborCost = parseFloat(saleData.laborCost || "0");

      const sale = await storage.createSale({
        ...saleData,
        paymentStatus: "paid",
        saleDate: new Date(),
        laborCost: laborCost.toFixed(2),
        perItemTaxTotal: perItemTaxTotal.toFixed(2),
      }, saleItems);

      res.status(201).json(sale);
    } catch (error) {
      console.error("Sale creation error:", error);
      res.status(500).json({ message: "Failed to create sale" });
    }
  });

  // Invoice PDF generation
  app.get("/api/sales/:id/invoice", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const sale = await storage.getSaleWithItems(id);
      
      if (!sale) {
        return res.status(404).json({ message: "Sale not found" });
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("562 Tires", 20, 25);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("13441 Imperial Hwy, Whittier, CA 90605", 20, 32);
      doc.text("Phone: (562) 469-1064", 20, 38);
      doc.text("Mon-Fri 8am-7pm • Sat 8am-5pm • Sun 8am-3pm", 20, 44);

      // Invoice number and date
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`Invoice: ${sale.invoiceNumber}`, pageWidth - 20, 25, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Date: ${new Date(sale.saleDate!).toLocaleDateString()}`, pageWidth - 20, 32, { align: "right" });
      doc.text(`Status: ${sale.paymentStatus.toUpperCase()}`, pageWidth - 20, 38, { align: "right" });

      // Customer info
      doc.setDrawColor(200);
      doc.line(20, 50, pageWidth - 20, 50);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", 20, 60);
      doc.setFont("helvetica", "normal");
      doc.text(sale.customerName, 20, 67);
      if (sale.customerPhone) doc.text(sale.customerPhone, 20, 73);
      if (sale.customerAddress) doc.text(sale.customerAddress, 20, 79);

      // Vehicle info
      if (sale.vehicleMake || sale.vehicleModel) {
        doc.setFont("helvetica", "bold");
        doc.text("Vehicle:", pageWidth / 2, 60);
        doc.setFont("helvetica", "normal");
        doc.text(`${sale.vehicleYear || ""} ${sale.vehicleMake || ""} ${sale.vehicleModel || ""}`.trim(), pageWidth / 2, 67);
        if (sale.licensePlate) doc.text(`Plate: ${sale.licensePlate}`, pageWidth / 2, 73);
        if (sale.mileage) doc.text(`Mileage: ${sale.mileage}`, pageWidth / 2, 79);
      }

      // Items table
      const tableData = sale.items.map((item) => [
        item.productName,
        item.productSku,
        item.quantity.toString(),
        `$${parseFloat(item.unitPrice).toFixed(2)}`,
        `$${(parseFloat(item.perItemTax || "0") * item.quantity).toFixed(2)}`,
        `$${parseFloat(item.lineTotal).toFixed(2)}`,
      ]);

      autoTable(doc, {
        startY: 90,
        head: [["Item", "SKU", "Qty", "Unit Price", "Item Tax", "Total"]],
        body: tableData,
        theme: "striped",
        headStyles: { fillColor: [51, 51, 51] },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30 },
          2: { cellWidth: 15, halign: "center" },
          3: { cellWidth: 25, halign: "right" },
          4: { cellWidth: 25, halign: "right" },
          5: { cellWidth: 25, halign: "right" },
        },
      });

      // Totals
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      const totalsX = pageWidth - 70;

      doc.setFontSize(10);
      doc.text("Subtotal:", totalsX, finalY);
      doc.text(`$${parseFloat(sale.subtotal).toFixed(2)}`, pageWidth - 20, finalY, { align: "right" });

      if (parseFloat(sale.laborCost || "0") > 0) {
        doc.text("Labor:", totalsX, finalY + 6);
        doc.text(`$${parseFloat(sale.laborCost || "0").toFixed(2)}`, pageWidth - 20, finalY + 6, { align: "right" });
      }

      if (parseFloat(sale.discount || "0") > 0) {
        doc.text("Discount:", totalsX, finalY + 12);
        doc.text(`-$${parseFloat(sale.discount || "0").toFixed(2)}`, pageWidth - 20, finalY + 12, { align: "right" });
      }

      const discountOffset = parseFloat(sale.discount || "0") > 0 ? 6 : 0;
      const laborOffset = parseFloat(sale.laborCost || "0") > 0 ? 6 : 0;

      doc.text(
        `Sales Tax (${parseFloat(sale.globalTaxRate).toFixed(1)}%):`,
        totalsX,
        finalY + 12 + laborOffset + discountOffset,
      );
      doc.text(
        `$${parseFloat(sale.globalTaxAmount).toFixed(2)}`,
        pageWidth - 20,
        finalY + 12 + laborOffset + discountOffset,
        { align: "right" },
      );

      const perItemOffset = parseFloat(sale.perItemTaxTotal || "0") > 0 ? 6 : 0;
      if (parseFloat(sale.perItemTaxTotal || "0") > 0) {
        doc.text("Per-Item Taxes:", totalsX, finalY + 18 + laborOffset + discountOffset);
        doc.text(
          `$${parseFloat(sale.perItemTaxTotal || "0").toFixed(2)}`,
          pageWidth - 20,
          finalY + 18 + laborOffset + discountOffset,
          { align: "right" },
        );
      }

      const baseOffset = 22 + laborOffset + discountOffset + perItemOffset;
      doc.setDrawColor(100);
      doc.line(totalsX, finalY + baseOffset, pageWidth - 20, finalY + baseOffset);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Total:", totalsX, finalY + baseOffset + 8);
      doc.text(`$${parseFloat(sale.grandTotal).toFixed(2)}`, pageWidth - 20, finalY + baseOffset + 8, { align: "right" });

      // Payment method
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Payment Method: ${sale.paymentMethod.toUpperCase()}`, 20, finalY + baseOffset + 8);

      // Notes
      if (sale.notes) {
        doc.text("Notes:", 20, finalY + baseOffset + 20);
        doc.text(sale.notes, 20, finalY + baseOffset + 26);
      }

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(128);
      doc.text("Thank you for choosing 562 Tires!", pageWidth / 2, doc.internal.pageSize.getHeight() - 20, { align: "center" });

      const pdfBuffer = doc.output("arraybuffer");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=invoice-${sale.invoiceNumber}.pdf`);
      res.send(Buffer.from(pdfBuffer));
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ message: "Failed to generate invoice" });
    }
  });

  // Settings
  app.get("/api/settings/tax", async (req, res) => {
    try {
      const setting = await storage.getSetting("globalTaxRate");
      res.json({ globalTaxRate: setting?.value || "9.5" });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tax settings" });
    }
  });

  app.post("/api/settings/tax", async (req, res) => {
    try {
      const { globalTaxRate } = req.body;
      await storage.setSetting("globalTaxRate", String(globalTaxRate));
      res.json({ globalTaxRate });
    } catch (error) {
      res.status(500).json({ message: "Failed to update tax settings" });
    }
  });

  // Analytics
  app.get("/api/analytics/sales", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const allSales = await storage.getSales();
      
      // Calculate daily sales for last 30 days
      const dailySales: Record<string, { total: number; count: number }> = {};
      const weeklySales: Record<string, { total: number; count: number }> = {};
      const monthlySales: Record<string, { total: number; count: number }> = {};
      const paymentMethods: Record<string, { count: number; total: number }> = {};
      const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
      
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      for (const sale of allSales) {
        const saleDate = new Date(sale.saleDate!);
        const dateKey = saleDate.toISOString().split('T')[0];
        const weekKey = `Week ${Math.ceil((saleDate.getDate()) / 7)}`;
        const monthKey = saleDate.toLocaleString('default', { month: 'short' });
        const total = parseFloat(sale.grandTotal);
        
        // Daily
        if (saleDate >= thirtyDaysAgo) {
          if (!dailySales[dateKey]) dailySales[dateKey] = { total: 0, count: 0 };
          dailySales[dateKey].total += total;
          dailySales[dateKey].count++;
        }
        
        // Weekly
        if (!weeklySales[weekKey]) weeklySales[weekKey] = { total: 0, count: 0 };
        weeklySales[weekKey].total += total;
        weeklySales[weekKey].count++;
        
        // Monthly
        if (!monthlySales[monthKey]) monthlySales[monthKey] = { total: 0, count: 0 };
        monthlySales[monthKey].total += total;
        monthlySales[monthKey].count++;
        
        // Payment methods
        if (!paymentMethods[sale.paymentMethod]) {
          paymentMethods[sale.paymentMethod] = { count: 0, total: 0 };
        }
        paymentMethods[sale.paymentMethod].count++;
        paymentMethods[sale.paymentMethod].total += total;

        // Get sale items for product tracking
        const saleWithItems = await storage.getSaleWithItems(sale.id);
        if (saleWithItems) {
          for (const item of saleWithItems.items) {
            if (!productSales[item.productSku]) {
              productSales[item.productSku] = { 
                name: item.productName, 
                quantity: 0, 
                revenue: 0 
              };
            }
            productSales[item.productSku].quantity += item.quantity;
            productSales[item.productSku].revenue += parseFloat(item.lineTotal);
          }
        }
      }
      
      // Calculate average order value
      const avgOrderValue = allSales.length > 0
        ? (allSales.reduce((sum, s) => sum + parseFloat(s.grandTotal), 0) / allSales.length).toFixed(2)
        : "0";
      
      res.json({
        dailySales: Object.entries(dailySales)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        weeklySales: Object.entries(weeklySales)
          .map(([week, data]) => ({ week, ...data })),
        monthlySales: Object.entries(monthlySales)
          .map(([month, data]) => ({ month, ...data })),
        paymentMethods: Object.entries(paymentMethods)
          .map(([method, data]) => ({ method, ...data })),
        topProducts: Object.values(productSales)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
        categoryBreakdown: [],
        summary: {
          ...stats,
          weekSales: allSales.filter(s => {
            const d = new Date(s.saleDate!);
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            return d >= startOfWeek;
          }).length,
          monthSales: allSales.filter(s => {
            const d = new Date(s.saleDate!);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          }).length,
          avgOrderValue,
        },
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/export", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      const sales = await storage.getSales();
      const products = await storage.getProducts();

      const workbook = XLSX.utils.book_new();

      // Sales summary sheet
      const summaryData = [
        { Metric: "Today's Revenue", Value: `$${stats.todayRevenue}` },
        { Metric: "Today's Sales", Value: stats.todaySales },
        { Metric: "Week Revenue", Value: `$${stats.weekRevenue}` },
        { Metric: "Month Revenue", Value: `$${stats.monthRevenue}` },
        { Metric: "Total Products", Value: stats.totalProducts },
        { Metric: "Low Stock Items", Value: stats.lowStockCount },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      // Sales details sheet
      const salesData = sales.map((s) => ({
        Invoice: s.invoiceNumber,
        Date: new Date(s.saleDate!).toLocaleDateString(),
        Customer: s.customerName,
        Payment: s.paymentMethod,
        Subtotal: parseFloat(s.subtotal).toFixed(2),
        Tax: parseFloat(s.globalTaxAmount).toFixed(2),
        Total: parseFloat(s.grandTotal).toFixed(2),
      }));
      const salesSheet = XLSX.utils.json_to_sheet(salesData);
      XLSX.utils.book_append_sheet(workbook, salesSheet, "Sales");

      // Inventory sheet
      const inventoryData = products.map((p) => ({
        SKU: p.sku,
        Name: p.name,
        Brand: p.brand || "",
        Size: p.size || "",
        Quantity: p.quantity,
        "Min Stock": p.minStockLevel,
        "Cost Price": parseFloat(p.costPrice).toFixed(2),
        "Selling Price": parseFloat(p.sellingPrice).toFixed(2),
      }));
      const inventorySheet = XLSX.utils.json_to_sheet(inventoryData);
      XLSX.utils.book_append_sheet(workbook, inventorySheet, "Inventory");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=analytics-report.xlsx");
      res.send(buffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to export analytics" });
    }
  });

  return;
}
