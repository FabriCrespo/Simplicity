# Supabase setup — Simplicity

## 1. Crear schema

1. Abrí tu proyecto en [supabase.com](https://supabase.com)
2. Andá a **SQL Editor** → New query
3. Pegá todo el contenido de `supabase/schema.sql`
4. Run

Eso crea:
- tabla `products`
- tabla `orders`
- bucket privado `receipts`
- RLS cerrado (la app usa **service role**)

## 2. Variables de entorno

En **Project Settings → API** copiá:

| Variable | Dónde |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | API Keys → Publishable (`sb_publishable_...`) |
| `SUPABASE_SECRET_KEY` | API Keys → Secret (`sb_secret_...`) **obligatoria en server** |

También sirve la legacy `SUPABASE_SERVICE_ROLE_KEY` si tu proyecto aún la muestra.

> No uses solo la publishable en el backend: con RLS cerrado no puede leer/escribir. La **secret** bypassa RLS y **nunca** debe ir al browser.

## 3. Seed de productos

Con las env cargadas:

```bash
npm run seed:supabase
```

Sube `data/products.json` a la tabla `products`.

## 4. Redeploy

En Netlify, redeploy después de setear las env. Sin esas vars, la app cae a JSON local (que en Netlify es read-only y falla).
