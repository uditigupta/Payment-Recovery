# Payment Failure Recovery Tool

## Overview
A SaaS MVP that helps subscription businesses recover failed payments. Users can upload failed payment records via CSV, analyze failure reasons, get retry recommendations, and generate customer email templates.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js with in-memory storage
- **Routing**: wouter (frontend), Express (API)
- **State**: TanStack React Query for server state management

## Key Features
1. CSV upload and parsing of failed payment records
2. Failure classification (insufficient_funds, expired_card, do_not_honor, authentication_required, generic_decline)
3. Retry strategy recommendations per failure type
4. Customer email template generation
5. Dashboard summary with totals, breakdown, and estimated recoverable revenue
6. Mark payments as recovered
7. Filter by failure reason, status; search by name/email/invoice
8. Sort by amount, date, customer name
9. Export filtered results as CSV
10. Seeded with 12 demo payment records

## File Structure
- `shared/schema.ts` - Zod schemas and TypeScript types
- `server/storage.ts` - In-memory storage with seed data
- `server/routes.ts` - API endpoints (GET/POST payments, upload CSV, dashboard)
- `client/src/pages/home.tsx` - Main dashboard page
- `client/src/components/summary-cards.tsx` - Dashboard metric cards
- `client/src/components/failure-breakdown.tsx` - Failure reason breakdown chart
- `client/src/components/csv-upload.tsx` - CSV file upload with drag & drop
- `client/src/components/payments-table.tsx` - Filterable/sortable payments table
- `client/src/components/payment-detail-dialog.tsx` - Payment detail modal with email template
- `client/src/lib/payment-utils.ts` - Failure labels, retry logic, email templates, formatting

## API Endpoints
- `GET /api/payments` - List all failed payments
- `GET /api/payments/:id` - Get single payment
- `GET /api/dashboard` - Dashboard summary stats
- `POST /api/upload` - Upload CSV file (multipart/form-data)
- `POST /api/payments/:id/recover` - Mark payment as recovered
- `POST /api/payments/clear` - Clear all payments

## Dependencies
- multer - CSV file upload handling
- All other deps from template (React, Express, TanStack Query, shadcn/ui, etc.)
