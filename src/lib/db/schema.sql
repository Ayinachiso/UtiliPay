-- =========================================================
-- UtiliPay schema — run this in Supabase SQL Editor
-- Drops + recreates all UtiliPay tables. Auth users in
-- auth.users are untouched. If you've created auth users
-- before, their accounts survive — only the linked member
-- rows are wiped.
-- =========================================================

-- ---- Wipe old shape (Paystack-era tables we replaced) ----
drop table if exists public.receipts cascade;
drop table if exists public.payments cascade;
drop table if exists public.payment_attempts cascade;
drop table if exists public.electricity_purchases cascade;
drop table if exists public.bills cascade;
drop table if exists public.members cascade;
drop table if exists public.units cascade;
drop table if exists public.communities cascade;

-- ---- Communities ----
create table public.communities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- ---- Units (houses / flats / apartments) ----
create table public.units (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references public.communities(id) on delete cascade,
  label         text not null,
  created_at    timestamptz not null default now()
);

create index units_community_id_idx on public.units(community_id);

-- ---- Members (residents + admins) ----
create table public.members (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid unique references auth.users(id) on delete set null,
  unit_id       uuid references public.units(id) on delete set null,
  community_id  uuid not null references public.communities(id) on delete cascade,
  role          text not null check (role in ('admin', 'resident')),
  full_name     text not null,
  email         text,
  phone         text,
  created_at    timestamptz not null default now()
);

create index members_user_id_idx     on public.members(user_id);
create index members_unit_id_idx     on public.members(unit_id);
create index members_community_id_idx on public.members(community_id);

-- ---- Bills ----
create table public.bills (
  id           uuid primary key default gen_random_uuid(),
  unit_id      uuid not null references public.units(id) on delete cascade,
  title        text not null,
  description  text,
  amount       numeric(12, 2) not null check (amount > 0),
  due_date     date not null,
  status       text not null default 'open'
    check (status in ('open', 'partial', 'paid', 'overdue')),
  created_by   uuid references public.members(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index bills_unit_id_idx on public.bills(unit_id);
create index bills_status_idx  on public.bills(status);

-- ---- Payment attempts (initialised but unconfirmed) ----
create table public.payment_attempts (
  id          uuid primary key default gen_random_uuid(),
  bill_id     uuid not null references public.bills(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  provider    text not null default 'korapay' check (provider in ('korapay')),
  channel     text not null check (channel in ('web', 'ussd', 'whatsapp')),
  reference   text unique not null,
  status      text not null default 'pending'
    check (status in ('pending', 'expired', 'promoted')),
  created_at  timestamptz not null default now()
);

create index payment_attempts_bill_id_idx   on public.payment_attempts(bill_id);
create index payment_attempts_member_id_idx on public.payment_attempts(member_id);
create index payment_attempts_reference_idx on public.payment_attempts(reference);

-- ---- Payments (confirmed money) ----
create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  bill_id     uuid not null references public.bills(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  provider    text not null
    check (provider in ('korapay', 'manual_cash', 'manual_transfer')),
  channel     text not null
    check (channel in ('web', 'ussd', 'whatsapp', 'admin_logged')),
  reference   text unique not null,
  status      text not null default 'successful' check (status = 'successful'),
  proof_url   text,                  -- Supabase Storage URL for manual cash proof
  paid_at     timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index payments_bill_id_idx    on public.payments(bill_id);
create index payments_member_id_idx  on public.payments(member_id);
create index payments_paid_at_idx    on public.payments(paid_at desc);

-- ---- Receipts ----
create table public.receipts (
  id              uuid primary key default gen_random_uuid(),
  payment_id      uuid unique not null references public.payments(id) on delete cascade,
  receipt_number  text unique not null,
  pdf_url         text,
  created_at      timestamptz not null default now()
);

-- ---- Function: recompute bill status from sum of payments ----
create or replace function public.recompute_bill_status(p_bill_id uuid)
returns void as $$
declare
  v_bill   public.bills%rowtype;
  v_total  numeric(12, 2);
begin
  select * into v_bill from public.bills where id = p_bill_id;
  if not found then return; end if;

  select coalesce(sum(amount), 0) into v_total
    from public.payments where bill_id = p_bill_id;

  if v_total >= v_bill.amount then
    update public.bills set status = 'paid' where id = p_bill_id;
  elsif v_total > 0 then
    update public.bills set status = 'partial' where id = p_bill_id;
  elsif v_bill.due_date < current_date then
    update public.bills set status = 'overdue' where id = p_bill_id;
  else
    update public.bills set status = 'open' where id = p_bill_id;
  end if;
end;
$$ language plpgsql security definer;

-- ---- Trigger: auto-recompute on payment insert/update/delete ----
create or replace function public.on_payments_change()
returns trigger as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_bill_status(old.bill_id);
    return old;
  else
    perform public.recompute_bill_status(new.bill_id);
    return new;
  end if;
end;
$$ language plpgsql security definer;

drop trigger if exists payments_change_trigger on public.payments;
create trigger payments_change_trigger
  after insert or update or delete on public.payments
  for each row execute function public.on_payments_change();

-- =========================================================
-- Row Level Security
-- =========================================================
-- We keep RLS pragmatic for MVP:
--  • Browser uses the anon key only for auth (login/logout)
--  • All real data queries go through Next.js API routes
--    using the service role key (which bypasses RLS)
--  • Realtime subscriptions on `payments` use the policies
--    below so admins see live payment activity in their community
-- =========================================================

alter table public.communities       enable row level security;
alter table public.units             enable row level security;
alter table public.members           enable row level security;
alter table public.bills             enable row level security;
alter table public.payment_attempts  enable row level security;
alter table public.payments          enable row level security;
alter table public.receipts          enable row level security;

-- Helper: is the calling user a member of this community?
create or replace function public.is_community_member(p_community_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.members
     where user_id = auth.uid()
       and community_id = p_community_id
  );
$$ language sql stable security definer;

-- Helper: is the calling user an admin of this community?
create or replace function public.is_community_admin(p_community_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.members
     where user_id = auth.uid()
       and community_id = p_community_id
       and role = 'admin'
  );
$$ language sql stable security definer;

-- communities: members can see their community
create policy "communities select for members"
  on public.communities for select to authenticated
  using (public.is_community_member(id));

-- units: members can see units in their community
create policy "units select for members"
  on public.units for select to authenticated
  using (public.is_community_member(community_id));

-- members: a user can see members of their own community
create policy "members select same community"
  on public.members for select to authenticated
  using (public.is_community_member(community_id));

-- bills: residents can see bills on their unit; admins see all community bills
create policy "bills select for unit member or admin"
  on public.bills for select to authenticated
  using (
    unit_id in (select unit_id from public.members where user_id = auth.uid())
    or public.is_community_admin(
      (select community_id from public.units where id = bills.unit_id)
    )
  );

-- payments: residents see payments on their unit, admins see community-wide
create policy "payments select for unit member or admin"
  on public.payments for select to authenticated
  using (
    bill_id in (
      select b.id from public.bills b
      join public.members m on m.unit_id = b.unit_id
      where m.user_id = auth.uid()
    )
    or exists (
      select 1
        from public.bills b
        join public.units u on u.id = b.unit_id
       where b.id = payments.bill_id
         and public.is_community_admin(u.community_id)
    )
  );

-- receipts: same rule as payments
create policy "receipts select via payment"
  on public.receipts for select to authenticated
  using (
    exists (
      select 1 from public.payments p
       where p.id = receipts.payment_id
         and (
           p.member_id in (select id from public.members where user_id = auth.uid())
           or exists (
             select 1
               from public.bills b
               join public.units u on u.id = b.unit_id
              where b.id = p.bill_id
                and public.is_community_admin(u.community_id)
           )
         )
    )
  );

-- payment_attempts: only the attempting member can read their own
create policy "payment_attempts select for owner"
  on public.payment_attempts for select to authenticated
  using (member_id in (select id from public.members where user_id = auth.uid()));

-- =========================================================
-- Realtime publication (so the admin dashboard can subscribe)
-- =========================================================
-- Supabase enables a default `supabase_realtime` publication.
-- Add payments + bills to it so the admin dashboard gets live updates.
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.bills;
