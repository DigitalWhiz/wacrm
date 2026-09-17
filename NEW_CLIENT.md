# Onboarding de Nuevo Cliente

Guía paso a paso para levantar una nueva instancia de WACRM para un cliente.

---

## 1. Clonar el Template

```bash
git clone https://github.com/TU_USUARIO/wacrm.git NOMBRE_CLIENTE
cd NOMBRE_CLIENTE
npm install
```

## 2. Crear Proyecto en Supabase

1. Ir a [supabase.com](https://supabase.com) → **New Project**
2. Elegir nombre, contraseña de la base de datos y región
3. Anotar las credenciales que aparecen en el diálogo inicial

## 3. Configurar Variables de Entorno

```bash
cp .env.local.example .env.local
```

Editar `.env.local` con los valores del paso 2:

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key del proyecto |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypass RLS) |
| `ENCRYPTION_KEY` | Generar con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `META_APP_SECRET` | Secret de la app de Meta |

## 4. Ejecutar Migraciones

```bash
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

O ejecutar manualmente los archivos SQL en el Dashboard → SQL Editor en orden numérico.

## 5. Obtener ACCOUNT_ID

Una vez que el cliente se registra por primera vez en la app:

1. Abrir el Dashboard de Supabase → **Table Editor** → `accounts`
2. Copiar el `id` de la cuenta del cliente

## 6. Sembrar Regiones Geográficas

Ejecutar el script de geo-tags para pre-cargar las provincias/estados:

```bash
npx tsx scripts/seed-geo-tags.ts <ACCOUNT_ID>
```

Esto insertará **77 tags** organizados por país:

| País | Tags | Color |
|------|------|-------|
| Argentina | 24 provincias + CABA | 🟢 `#22c55e` |
| México | 32 estados | 🔴 `#ef4444` |
| España | 19 comunidades + 2 ciudades autónomas | 🟡 `#eab308` |

**Resultado:** Los contactos ahora podrán ser etiquetados con su región geográfica desde la UI de Tags.

## 7. Verificar

1. Abrir la app → **Contacts** → seleccionar un contacto → **Tags**
2. Confirmar que aparecen las 77 regiones geográficas
3. Asignar un tag a un contacto y verificar que se guarda correctamente

---

## Notas Técnicas

- El script usa `SUPABASE_SERVICE_ROLE_KEY` para bypass RLS (no requiere sesión de usuario)
- Tags se insertan con `upsert` sobre `name + account_id` (idempotente: ejecutarlo dos veces no duplica)
- **Core Intocable**: este script NO modifica componentes React, rutas API ni archivos internos de WACRM
