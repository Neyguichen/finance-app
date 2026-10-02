-- Phase 12 — Imported expense reimbursements
-- Applied to production on 2026-10-02.
-- savings_internal remains accepted in the constraint only for historical compatibility.
-- New imports no longer expose or create that value.

alter table public.import_batch_items
  drop constraint if exists import_batch_items_nature_check;

alter table public.import_batch_items
  add constraint import_batch_items_nature_check
  check (nature in (
    'expense',
    'income',
    'savings_deposit',
    'savings_withdrawal',
    'expense_reimbursement',
    'savings_internal',
    'ignore'
  ));

update public.import_batch_items
set
  nature = case
    when coalesce((raw->>'amount')::numeric, 0) >= 0 then 'income'
    else 'expense'
  end,
  raw = jsonb_set(
    raw,
    '{nature}',
    to_jsonb(case
      when coalesce((raw->>'amount')::numeric, 0) >= 0 then 'income'
      else 'expense'
    end)
  )
where action = 'pending'
  and nature = 'savings_internal';
