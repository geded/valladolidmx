-- US-R3 · Ola 2 · Sub-ola 2.1 — Registro del tipo de página "region"
-- en el enum `eb_page_kind`. Debe correr en su propia migración porque
-- PostgreSQL no permite usar el nuevo valor en la misma transacción.
ALTER TYPE public.eb_page_kind ADD VALUE IF NOT EXISTS 'region';
