# Payment Failure Recovery Tool

## Overview
A SaaS MVP that helps subscription businesses recover failed payments. Users can upload failed payment records via CSV, analyze failure patterns with dynamic recovery estimation, get retry recommendations, and generate customer email templates.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js with in-memory storage
- **Routing**: wouter (frontend), Express (API)
- **State**: TanStack React Query for server state management

## Key Features
1. CSV upload and parsing of failed payment records
2. Failure classification (insufficient_funds, expired_card, do_not_honor, authentication_required, generic_decline)
3. **Dynamic recoverable revenue estimation** — analyzes frequency, average amounts, repeated customers, and payment size distribution to estimate recovery potential (no hardcoded rates)
4. Retry strategy recommendations based on failure type AND payment amount
5. Customer email template generation with friendly, professional tone
6. Dashboard summary with totals, breakdown, recoverable revenue range, and plain-language insights
7. Insights panel explaining recoverable revenue in business-friendly language
8. Mark payments as recovered
9. Filter by failure reason, status; search by name/email/invoice
10. Sort by amount, date, customer name
11. Export filtered results as CSV
12. Seeded with 15 realistic demo payment records (EUR currency)

## File Structure
- `shared/schema.ts` - Zod schemas, TypeScript types including FailureTypeAnalysis and expanded DashboardSummary
- `server/storage.ts` - In-memory storage with seed data and dynamic recovery analysis logic
- `server/routes.ts` - API endpoints (GET/POST payments, upload CSV, dashboard)
- `client/src/pages/home.tsx` - Main dashboard page with insights panel
- `client/src/components/summary-cards.tsx` - Dashboard metric cards (shows recoverable range)
- `client/src/components/failure-breakdown.tsx` - Failure distribution with dynamic per-type recovery estimates
- `client/src/components/insights-panel.tsx` - Recoverable revenue insight panel with business-language explanations
- `client/src/components/csv-upload.tsx` - CSV file upload with drag & drop
- `client/src/components/payments-table.tsx` - Filterable/sortable payments table
- `client/src/components/payment-detail-dialog.tsx` - Payment detail modal with retry recommendations and email template
- `client/src/lib/payment-utils.ts` - Failure labels, amount-aware retry logic, email templates, formatting

## API Endpoints
- `GET /api/payments` - List all failed payments
- `GET /api/payments/:id` - Get single payment
- `GET /api/dashboard` - Dashboard summary with dynamic analysis, insights, and failure breakdown
- `POST /api/upload` - Upload CSV file (multipart/form-data)
- `POST /api/payments/:id/recover` - Mark payment as recovered
- `POST /api/payments/clear` - Clear all payments

## Dependencies
- multer - CSV file upload handling
- rollup@4.59.0 - Build tool (updated for security)
- All other deps from template (React, Express, TanStack Query, shadcn/ui, etc.)
