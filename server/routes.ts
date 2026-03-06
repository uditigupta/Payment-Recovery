import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPaymentSchema, failureCodeEnum } from "@shared/schema";
import { z } from "zod";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

function parseCSV(content: string) {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  return lines.slice(1).map((line) => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });
}

const validFailureCodes = new Set([
  "insufficient_funds",
  "expired_card",
  "do_not_honor",
  "authentication_required",
  "generic_decline",
]);

function normalizeFailureCode(code: string): string {
  const cleaned = code.toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (validFailureCodes.has(cleaned)) return cleaned;
  return "generic_decline";
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/payments", async (_req, res) => {
    const payments = await storage.getPayments();
    res.json(payments);
  });

  app.get("/api/payments/:id", async (req, res) => {
    const payment = await storage.getPayment(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json(payment);
  });

  app.get("/api/dashboard", async (_req, res) => {
    const summary = await storage.getDashboardSummary();
    res.json(summary);
  });

  app.post("/api/payments/:id/recover", async (req, res) => {
    const payment = await storage.markRecovered(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    res.json(payment);
  });

  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      if (!req.file.originalname.endsWith(".csv")) {
        return res.status(400).json({ message: "Only CSV files are accepted" });
      }

      if (req.file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ message: "File size must be under 5MB" });
      }

      const content = req.file.buffer.toString("utf-8");
      const rows = parseCSV(content);

      if (rows.length === 0) {
        return res.status(400).json({ message: "CSV file is empty or has no data rows" });
      }

      const payments = rows.map((row) => ({
        customer_name: row.customer_name || row.name || "Unknown",
        customer_email: row.customer_email || row.email || "unknown@example.com",
        amount: parseFloat(row.amount) || 0,
        currency: (row.currency || "USD").toUpperCase(),
        invoice_id: row.invoice_id || row.invoice || `INV-${Date.now()}`,
        failure_code: normalizeFailureCode(row.failure_code || row.reason || "generic_decline"),
        payment_date: row.payment_date || row.date || new Date().toISOString().split("T")[0],
      }));

      const validPayments = [];
      const errors: string[] = [];

      for (let i = 0; i < payments.length; i++) {
        const parsed = insertPaymentSchema.safeParse(payments[i]);
        if (parsed.success) {
          validPayments.push(parsed.data);
        } else {
          errors.push(`Row ${i + 1}: ${parsed.error.issues.map(e => e.message).join(", ")}`);
        }
      }

      if (validPayments.length === 0) {
        return res.status(400).json({
          message: "No valid payment records found in CSV",
          errors: errors.slice(0, 5),
        });
      }

      const added = await storage.addPayments(validPayments);
      res.json({ count: added.length, payments: added });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Failed to process CSV" });
    }
  });

  app.post("/api/payments/clear", async (_req, res) => {
    await storage.clearPayments();
    res.json({ message: "All payments cleared" });
  });

  return httpServer;
}
