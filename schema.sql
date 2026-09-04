-- =========================================================
-- ESQUEMA DE BASE DE DATOS: Registro de clientes por área
-- Ejecutar esto completo en Supabase → SQL Editor → Run
-- =========================================================

-- 1) Tabla de registros que llena el kiosco de la tablet
create table if not exists public.registros (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  area text not null,
  creado_en timestamptz not null default now(),
  atendido boolean not null default false
);

-- 2) Tabla que conecta cada usuario (login) con UN área
--    (cada persona del área "Ventas" solo debe tener una fila aquí con area = 'Ventas')
create table if not exists public.perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  area text not null,
  nombre_area_visible text
);

-- 3) Activar seguridad a nivel de fila (RLS) en ambas tablas
alter table public.registros enable row level security;
alter table public.perfiles enable row level security;

-- 4) Política: cualquiera (el kiosco, sin login) puede INSERTAR un registro
drop policy if exists "kiosco_puede_insertar" on public.registros;
create policy "kiosco_puede_insertar"
  on public.registros
  for insert
  to anon
  with check (true);

-- 5) Política: un usuario logueado SOLO puede LEER los registros de su propia área
drop policy if exists "solo_ver_mi_area" on public.registros;
create policy "solo_ver_mi_area"
  on public.registros
  for select
  to authenticated
  using (
    area = (select p.area from public.perfiles p where p.id = auth.uid())
  );

-- 6) Política: un usuario logueado puede marcar como "atendido" solo lo de su área
drop policy if exists "solo_actualizar_mi_area" on public.registros;
create policy "solo_actualizar_mi_area"
  on public.registros
  for update
  to authenticated
  using (
    area = (select p.area from public.perfiles p where p.id = auth.uid())
  );

-- 7) Política: cada usuario solo puede ver su propia fila de perfil
drop policy if exists "ver_mi_perfil" on public.perfiles;
create policy "ver_mi_perfil"
  on public.perfiles
  for select
  to authenticated
  using (id = auth.uid());

-- 8) Habilitar Realtime para la tabla de registros (avisos en vivo en el panel)
alter publication supabase_realtime add table public.registros;

-- 9) Tabla donde se guarda la "dirección" push de cada celular/PC que activó notificaciones
create table if not exists public.push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  area text not null,
  suscripcion jsonb not null,
  creado_en timestamptz not null default now()
);

alter table public.push_suscripciones enable row level security;

-- Un usuario logueado puede crear/leer/borrar solo SUS PROPIAS suscripciones
drop policy if exists "gestionar_mi_suscripcion" on public.push_suscripciones;
create policy "gestionar_mi_suscripcion"
  on public.push_suscripciones
  for all
  to authenticated
  using (usuario_id = auth.uid())
  with check (usuario_id = auth.uid());

-- =========================================================
-- CÓMO CREAR UN USUARIO PARA CADA ÁREA (hacer 1 vez por área):
-- 1. Ve a Authentication → Users → Add user (en el panel de Supabase)
--    Crea, por ejemplo: ventas@tuempresa.com / una-clave-segura
-- 2. Copia el UUID que te genera para ese usuario
-- 3. Ejecuta (reemplazando el UUID y el área):
--
-- insert into public.perfiles (id, area, nombre_area_visible)
-- values ('PEGA-AQUI-EL-UUID', 'Ventas', 'Ventas');
--
-- Repite esto por cada una de tus 5-10 áreas.
-- =========================================================
