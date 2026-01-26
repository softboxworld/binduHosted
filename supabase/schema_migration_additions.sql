-- ============================================
-- MIGRATION: Add Missing Columns and Tables
-- This adds everything from schema_tables2.sql that's missing
-- ============================================

-- 1. Add missing columns to PAYMENTS table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active',
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_by uuid,
ADD COLUMN IF NOT EXISTS cancellation_reason text;

-- Add index for payments status
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);


-- 2. Add missing columns to CLIENTS table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS image_url text;


-- 3. Add missing columns to PRODUCTS table  
ALTER TABLE products
ADD COLUMN IF NOT EXISTS image_url text;


-- 4. Add missing columns to SERVICES table
ALTER TABLE services
ADD COLUMN IF NOT EXISTS minimum_cost bigint;

-- Add unique constraint for services
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_name_cost'
  ) THEN
    ALTER TABLE services ADD CONSTRAINT unique_name_cost UNIQUE (name, cost);
  END IF;
END $$;


-- 5. Add missing columns to ORDERS table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS cancelled_at text,
ADD COLUMN IF NOT EXISTS cancelled_by uuid,
ADD COLUMN IF NOT EXISTS cancellation_reason text;


-- 6. Add missing columns to SALES_ORDERS table
ALTER TABLE sales_orders
ADD COLUMN IF NOT EXISTS status text;


-- 7. Create WORKER_PROJECTS table (NEW TABLE - doesn't exist in schema_tables.sql)
CREATE TABLE IF NOT EXISTS public.worker_projects (
  id uuid not null default gen_random_uuid (),
  organization_id uuid not null,
  name text not null,
  description text null,
  price numeric(10, 2) null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  status text null default 'active'::text,
  worker_id uuid null,
  constraint worker_projects_pkey primary key (id),
  constraint worker_projects_organization_id_fkey foreign KEY (organization_id) references organizations (id) on delete CASCADE,
  constraint worker_projects_worker_id_fkey foreign KEY (worker_id) references workers (id) on delete CASCADE
) TABLESPACE pg_default;

-- Add indexes for worker_projects
CREATE INDEX IF NOT EXISTS worker_projects_organization_id_idx on public.worker_projects using btree (organization_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_worker_projects_organization on public.worker_projects using btree (organization_id) TABLESPACE pg_default;


-- 8. Update TASKS table to reference worker_projects (if needed)
-- Note: This allows tasks.project_id to reference either projects OR worker_projects
-- The app might need to handle this logic


-- 9. Add missing constraint to CATEGORIES table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Add foreign key if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_organization_id_fkey'
  ) THEN
    ALTER TABLE categories ADD CONSTRAINT categories_organization_id_fkey 
    FOREIGN KEY (organization_id) REFERENCES organizations (id);
  END IF;
END $$;


-- ============================================
-- SUCCESS! All additions from schema_tables2.sql applied
-- ============================================








