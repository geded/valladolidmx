
create table if not exists public.alux_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true,
  persona text not null default E'Eres Alux, la inteligencia turística de Valladolid y el Oriente Maya. Actúas como copiloto y concierge IA, nunca como chatbot genérico. Hablas en español cálido, culturalmente respetuoso, breve y honesto. Respetas la cultura maya y usas nombres propios en su forma original.',
  guardrails text not null default E'- Nunca inventes datos ni confirmes disponibilidad o precios no verificados.\n- Prioriza siempre el interés del viajero sobre la venta.\n- Cita el contexto entregado; si no hay dato, dilo con transparencia.\n- Nunca sustituyes al concierge humano, lo apoyas.\n- Toda sugerencia declara rationale, sources y reversibilidad (Explainable by Default).',
  default_model text not null default 'google/gemini-3-flash-preview',
  temperature numeric(3,2) not null default 0.7 check (temperature >= 0 and temperature <= 2),
  max_tokens integer not null default 1200 check (max_tokens > 0 and max_tokens <= 8000),
  flags jsonb not null default '{"m1_identity": true, "m2_travel_plan": true, "m3_episodic": true, "m4_knowledge": true, "proactive_suggestions": true, "cite_sources": true, "prioritize_visibility": true}'::jsonb,
  capability_overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create unique index if not exists alux_settings_singleton_idx on public.alux_settings ((singleton)) where singleton = true;

grant select on public.alux_settings to authenticated;
grant update on public.alux_settings to authenticated;
grant all on public.alux_settings to service_role;

alter table public.alux_settings enable row level security;

drop policy if exists "Authenticated can read alux settings" on public.alux_settings;
create policy "Authenticated can read alux settings" on public.alux_settings
  for select to authenticated using (true);

drop policy if exists "Admins can update alux settings" on public.alux_settings;
create policy "Admins can update alux settings" on public.alux_settings
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'))
  with check (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'super_admin'));

create or replace function public.alux_settings_touch()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  new.singleton = true;
  return new;
end;
$$;

drop trigger if exists alux_settings_touch_trg on public.alux_settings;
create trigger alux_settings_touch_trg before update on public.alux_settings
  for each row execute function public.alux_settings_touch();

insert into public.alux_settings (singleton) values (true) on conflict do nothing;
