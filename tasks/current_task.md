# Task 7: Update Revenue Aggregation

**Status:** Complete

## Description
Renamed `buildCancelledExcludedMatch()` to `buildRevenueMatch()` with updated filter requiring both `status: 'completed'` and `paymentStatus: 'paid'`. Updated all consumers.

## Changes Made
- `backend/src/lib/aggregation.ts` — Renamed function, returns `{ status: 'completed', paymentStatus: 'paid' }`
- `backend/src/modules/dashboard/dashboard.service.ts` — Replaced hardcoded `{ status: 'completed' }` with `buildRevenueMatch()` in `getMetrics` and `getTopItems`
- `backend/src/modules/reports/reports.helper.ts` — Updated import and usage

## Verification
- ✅ Backend typecheck passes
- ✅ All 82 orders tests pass
