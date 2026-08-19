-- Habilita flujo de gastos pendientes/confirmados
-- Ejecutar una vez en el SQL Editor de Supabase

ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
	SELECT 1
	FROM pg_constraint
	WHERE conname = 'expenses_status_check'
  ) THEN
	ALTER TABLE public.expenses
	ADD CONSTRAINT expenses_status_check
	CHECK (status IN ('pending', 'confirmed'));
  END IF;
END $$;



