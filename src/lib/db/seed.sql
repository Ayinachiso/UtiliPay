-- =========================================================
-- UtiliPay demo seed — Parkfield Estate, Lekki Phase 1
-- Run AFTER schema.sql. Wipes any UtiliPay data and inserts
-- a realistic demo estate: 1 community, 10 units, 25 members,
-- 4 bill cycles, and a few paid + partial payments so the
-- dashboards have lived-in state out of the box.
--
-- Standard SQL only — no psql meta-commands. Paste straight
-- into Supabase SQL Editor.
-- =========================================================

truncate
  public.receipts,
  public.payments,
  public.payment_attempts,
  public.bills,
  public.members,
  public.units,
  public.communities
  restart identity cascade;

do $$
declare
  v_community_id uuid;
  v_admin_id     uuid;
begin
  ---------------------------------------------------------
  -- 1. Community
  ---------------------------------------------------------
  insert into public.communities (name)
  values ('Parkfield Estate, Lekki Phase 1')
  returning id into v_community_id;

  ---------------------------------------------------------
  -- 2. Units (mixed Block A flats + standalone houses)
  ---------------------------------------------------------
  insert into public.units (community_id, label) values
    (v_community_id, 'Block A · Flat 1'),
    (v_community_id, 'Block A · Flat 2'),
    (v_community_id, 'Block A · Flat 3'),
    (v_community_id, 'Block A · Flat 4'),
    (v_community_id, 'Block B · Flat 1'),
    (v_community_id, 'Block B · Flat 2'),
    (v_community_id, 'House 12'),
    (v_community_id, 'House 14'),
    (v_community_id, 'House 16'),
    (v_community_id, 'House 18');

  ---------------------------------------------------------
  -- 3. Admin (chairwoman) — not tied to any unit
  ---------------------------------------------------------
  insert into public.members (community_id, unit_id, role, full_name, email, phone)
  values (v_community_id, null, 'admin', 'Mrs. Adaeze Nweze',
          'adaeze.nweze@parkfield.demo', '+2348012000001')
  returning id into v_admin_id;

  ---------------------------------------------------------
  -- 4. Residents (24 total, 2-3 per household)
  ---------------------------------------------------------

  -- Block A · Flat 1 — Adekunle household (couple)
  insert into public.members (community_id, unit_id, role, full_name, email, phone)
  select v_community_id, u.id, 'resident', m.full_name, m.email, m.phone
  from public.units u
  cross join (values
    ('Mr. Tunde Adekunle', 'tunde.adekunle@parkfield.demo', '+2348012000010'),
    ('Mrs. Bisi Adekunle', 'bisi.adekunle@parkfield.demo',  '+2348012000011')
  ) as m(full_name, email, phone)
  where u.label = 'Block A · Flat 1';

  -- Block A · Flat 2 — Bello household (couple + adult child)
  insert into public.members (community_id, unit_id, role, full_name, email, phone)
  select v_community_id, u.id, 'resident', m.full_name, m.email, m.phone
  from public.units u
  cross join (values
    ('Mr. Ibrahim Bello', 'ibrahim.bello@parkfield.demo', '+2348012000020'),
    ('Mrs. Aisha Bello',  'aisha.bello@parkfield.demo',   '+2348012000021'),
    ('Fatima Bello',      'fatima.bello@parkfield.demo',  '+2348012000022')
  ) as m(full_name, email, phone)
  where u.label = 'Block A · Flat 2';

  -- Block A · Flat 3 — Single tenant
  insert into public.members (community_id, unit_id, role, full_name, email, phone)
  select v_community_id, u.id, 'resident', 'Ms. Chiamaka Eze',
         'chiamaka.eze@parkfield.demo', '+2348012000030'
  from public.units u where u.label = 'Block A · Flat 3';

  -- Block A · Flat 4 — Olatunji household (couple)
  insert into public.members (community_id, unit_id, role, full_name, email, phone)
  select v_community_id, u.id, 'resident', m.full_name, m.email, m.phone
  from public.units u
  cross join (values
    ('Mr. Femi Olatunji',    'femi.olatunji@parkfield.demo',   '+2348012000040'),
    ('Mrs. Folake Olatunji', 'folake.olatunji@parkfield.demo', '+2348012000041')
  ) as m(full_name, email, phone)
  where u.label = 'Block A · Flat 4';

  -- Block B · Flat 1 — Aliyu (single)
  insert into public.members (community_id, unit_id, role, full_name, email, phone)
  select v_community_id, u.id, 'resident', 'Mr. Musa Aliyu',
         'musa.aliyu@parkfield.demo', '+2348012000050'
  from public.units u where u.label = 'Block B · Flat 1';

  -- Block B · Flat 2 — Obi household (couple)
  insert into public.members (community_id, unit_id, role, full_name, email, phone)
  select v_community_id, u.id, 'resident', m.full_name, m.email, m.phone
  from public.units u
  cross join (values
    ('Mr. Emeka Obi',  'emeka.obi@parkfield.demo', '+2348012000060'),
    ('Mrs. Ngozi Obi', 'ngozi.obi@parkfield.demo', '+2348012000061')
  ) as m(full_name, email, phone)
  where u.label = 'Block B · Flat 2';

  -- House 12 — Adebayo household (husband, wife, grandma — multi-gen demo gold)
  insert into public.members (community_id, unit_id, role, full_name, email, phone)
  select v_community_id, u.id, 'resident', m.full_name, m.email, m.phone
  from public.units u
  cross join (values
    ('Mr. Kunle Adebayo',    'kunle.adebayo@parkfield.demo', '+2348012000070'),
    ('Mrs. Funke Adebayo',   'funke.adebayo@parkfield.demo', '+2348012000071'),
    ('Mama Modupe Adebayo',  null,                            '+2348012000072')
  ) as m(full_name, email, phone)
  where u.label = 'House 12';

  -- House 14 — Okonkwo (couple)
  insert into public.members (community_id, unit_id, role, full_name, email, phone)
  select v_community_id, u.id, 'resident', m.full_name, m.email, m.phone
  from public.units u
  cross join (values
    ('Mr. Chidi Okonkwo',  'chidi.okonkwo@parkfield.demo', '+2348012000080'),
    ('Mrs. Amaka Okonkwo', 'amaka.okonkwo@parkfield.demo', '+2348012000081')
  ) as m(full_name, email, phone)
  where u.label = 'House 14';

  -- House 16 — Salami household (couple + tenant)
  insert into public.members (community_id, unit_id, role, full_name, email, phone)
  select v_community_id, u.id, 'resident', m.full_name, m.email, m.phone
  from public.units u
  cross join (values
    ('Mr. Rasheed Salami', 'rasheed.salami@parkfield.demo', '+2348012000090'),
    ('Mrs. Halima Salami', 'halima.salami@parkfield.demo',  '+2348012000091'),
    ('Mr. David Okafor',   'david.okafor@parkfield.demo',   '+2348012000092')
  ) as m(full_name, email, phone)
  where u.label = 'House 16';

  -- House 18 — Ogunlesi household (couple + adult son)
  insert into public.members (community_id, unit_id, role, full_name, email, phone)
  select v_community_id, u.id, 'resident', m.full_name, m.email, m.phone
  from public.units u
  cross join (values
    ('Mr. Tola Ogunlesi',     'tola.ogunlesi@parkfield.demo',    '+2348012000100'),
    ('Mrs. Yetunde Ogunlesi', 'yetunde.ogunlesi@parkfield.demo', '+2348012000101'),
    ('Damilola Ogunlesi',     'dami.ogunlesi@parkfield.demo',    '+2348012000102')
  ) as m(full_name, email, phone)
  where u.label = 'House 18';

  ---------------------------------------------------------
  -- 5. Bills: 4 cycles × 10 units = 40 bills
  ---------------------------------------------------------
  insert into public.bills (unit_id, title, description, amount, due_date, created_by)
  select u.id, b.title, b.description, b.amount, b.due_date, v_admin_id
  from public.units u
  cross join (values
    ('May 2026 Security Levy',
     'Monthly contribution to estate security and gate guards',
     15000,
     date '2026-05-31'),
    ('Waste Management — May 2026',
     'LAWMA collection fee + sweepers',
     5000,
     date '2026-05-25'),
    ('Q2 2026 Estate Dues',
     'Quarterly maintenance, drainage, landscaping',
     25000,
     date '2026-06-30'),
    ('Generator Repair Levy',
     'One-off contribution for the Block A standby generator',
     10000,
     date '2026-05-15')
  ) as b(title, description, amount, due_date)
  where u.community_id = v_community_id;

  ---------------------------------------------------------
  -- 6. Sample payments — paid / partial / multi-payer demo
  ---------------------------------------------------------

  -- Adekunle (Block A Flat 1) — May Security Levy paid in full, web
  insert into public.payments (bill_id, member_id, amount, provider, channel, reference, paid_at)
  select b.id, m.id, b.amount, 'korapay', 'web',
         'UTP-SEED-A1-SEC-001', now() - interval '6 days'
  from public.bills b
  join public.units u on u.id = b.unit_id
  join public.members m on m.email = 'tunde.adekunle@parkfield.demo'
  where u.label = 'Block A · Flat 1'
    and b.title = 'May 2026 Security Levy';

  -- Bello (Block A Flat 2) — PARTIAL: husband paid ₦10k of ₦15k via USSD
  insert into public.payments (bill_id, member_id, amount, provider, channel, reference, paid_at)
  select b.id, m.id, 10000, 'korapay', 'ussd',
         'UTP-SEED-A2-SEC-001', now() - interval '4 days'
  from public.bills b
  join public.units u on u.id = b.unit_id
  join public.members m on m.email = 'ibrahim.bello@parkfield.demo'
  where u.label = 'Block A · Flat 2'
    and b.title = 'May 2026 Security Levy';

  -- House 12 (Adebayo) — three-way demo:
  --   husband ₦7k web, wife ₦5k whatsapp, grandma ₦3k cash logged by admin
  insert into public.payments (bill_id, member_id, amount, provider, channel, reference, paid_at)
  select b.id, m.id, 7000, 'korapay', 'web',
         'UTP-SEED-H12-SEC-001', now() - interval '3 days'
  from public.bills b
  join public.units u on u.id = b.unit_id
  join public.members m on m.email = 'kunle.adebayo@parkfield.demo'
  where u.label = 'House 12'
    and b.title = 'May 2026 Security Levy';

  insert into public.payments (bill_id, member_id, amount, provider, channel, reference, paid_at)
  select b.id, m.id, 5000, 'korapay', 'whatsapp',
         'UTP-SEED-H12-SEC-002', now() - interval '2 days'
  from public.bills b
  join public.units u on u.id = b.unit_id
  join public.members m on m.email = 'funke.adebayo@parkfield.demo'
  where u.label = 'House 12'
    and b.title = 'May 2026 Security Levy';

  insert into public.payments (bill_id, member_id, amount, provider, channel, reference, paid_at)
  select b.id, m.id, 3000, 'manual_cash', 'admin_logged',
         'UTP-SEED-H12-SEC-003', now() - interval '1 day'
  from public.bills b
  join public.units u on u.id = b.unit_id
  join public.members m on m.full_name = 'Mama Modupe Adebayo'
  where u.label = 'House 12'
    and b.title = 'May 2026 Security Levy';

  -- Okonkwo (House 14) — paid waste mgmt in full, Q2 dues in full
  insert into public.payments (bill_id, member_id, amount, provider, channel, reference, paid_at)
  select b.id, m.id, b.amount, 'korapay', 'web',
         'UTP-SEED-H14-WASTE-001', now() - interval '5 days'
  from public.bills b
  join public.units u on u.id = b.unit_id
  join public.members m on m.email = 'chidi.okonkwo@parkfield.demo'
  where u.label = 'House 14'
    and b.title = 'Waste Management — May 2026';

  insert into public.payments (bill_id, member_id, amount, provider, channel, reference, paid_at)
  select b.id, m.id, b.amount, 'korapay', 'web',
         'UTP-SEED-H14-DUES-001', now() - interval '2 days'
  from public.bills b
  join public.units u on u.id = b.unit_id
  join public.members m on m.email = 'chidi.okonkwo@parkfield.demo'
  where u.label = 'House 14'
    and b.title = 'Q2 2026 Estate Dues';

end $$;

---------------------------------------------------------
-- 7. Receipts for the seeded payments
---------------------------------------------------------
insert into public.receipts (payment_id, receipt_number)
select id,
       'UTP-RCPT-' || lpad((row_number() over (order by created_at))::text, 4, '0')
from public.payments;

---------------------------------------------------------
-- 8. Recompute bill statuses based on the sample payments
---------------------------------------------------------
select public.recompute_bill_status(id) from public.bills;

-- =========================================================
-- AFTER signing up your admin account in the app:
--   update public.members
--      set user_id = '<your auth.users.id>',
--          email   = '<your real email>'
--    where email = 'adaeze.nweze@parkfield.demo';
-- =========================================================
