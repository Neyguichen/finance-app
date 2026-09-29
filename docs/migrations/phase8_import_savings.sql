-- Phase 8 — Import CSV / épargne
-- Applied to Supabase production project on 2026-09-29.
-- Extends import batch item natures so CSV rows can create or match savings deposits/withdrawals.

alter table public.import_batch_items
  drop constraint if exists import_batch_items_nature_check;

alter table public.import_batch_items
  add constraint import_batch_items_nature_check
  check (nature in (
    'expense',
    'income',
    'savings_deposit',
    'savings_withdrawal',
    'savings_internal',
    'ignore'
  ));
