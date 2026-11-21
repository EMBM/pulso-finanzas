# Pulso Finanzas 💜

Aplicación para controlar ingresos, gastos, presupuestos, gastos fijos y analítica diaria, semanal y mensual.

**Stack:** React 19 · TypeScript · Vite · Recharts · Supabase Auth + PostgreSQL (opcional) · GitHub Pages.

## ✅ Funcionalidades

- Dashboard financiero: salario, ingresos adicionales, gastos, saldo y objetivo de ahorro.
- Registro de movimientos: crear, editar, buscar, filtrar y eliminar.
- Analítica diaria, semanal y mensual, con gastos por categoría.
- Presupuestos por categoría y advertencias de exceso.
- Gastos fijos mensuales con registro de pago no duplicado.
- Personalización, tema oscuro y exportación/importación de datos JSON o CSV.
- **Inicio de sesión privado** con correo electrónico como usuario y contraseña mediante Supabase Auth.
- Registro de cuentas, confirmación por correo, cierre de sesión y recuperación de contraseña.
- **Sincronización en PostgreSQL con una fila por usuario y políticas RLS**.
- Importación guiada de datos locales existentes cuando se crea la primera cuenta.

## 🔐 Activar acceso privado y sincronización (configuración pendiente)

La web **permanece en modo local hasta conectar tu proyecto Supabase**. Después de configurar las claves, requerirá iniciar sesión antes de mostrar tus finanzas. No se guardan contraseñas en nuestro código.

1. Crea un proyecto gratuito en <https://supabase.com/dashboard> desde tu propia cuenta.
2. En **SQL Editor** de Supabase, ejecuta el archivo [supabase/schema.sql](supabase/schema.sql) completo. Activa RLS y políticas por `auth.uid()`. No omitas este paso.
3. En **Authentication → Providers → Email**, deja habilitado el acceso por correo y contraseña. Para cuentas nuevas es recomendable requerir confirmación de correo.
4. En **Authentication → URL Configuration**, fija:
   - **Site URL:** `https://embm.github.io/pulso-finanzas/`
   - **Redirect URLs:** agrega `https://embm.github.io/pulso-finanzas/` (y `http://localhost:5173/` si vas a probar en local).
5. Copia **Project URL** y la **publishable key** de tu proyecto (API Keys). Estas credenciales son públicas por diseño, pero **jamás uses `service_role`, `secret` ni la contraseña de la base de datos en el frontend**.
6. En este repositorio, abre **Settings → Secrets and variables → Actions → New repository secret** y crea exactamente:
   - `VITE_SUPABASE_URL` = URL del proyecto Supabase.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = clave pública `sb_publishable_...`.
7. Abre [GitHub Actions](https://github.com/EMBM/pulso-finanzas/actions/workflows/pages.yml), elige **Run workflow** en `main` y verifica el despliegue.
8. Visita <https://embm.github.io/pulso-finanzas/>, pulsa **Crear una cuenta**, registra un correo y contraseña y sigue la confirmación del correo. Entonces tus datos se guardarán por cuenta.

> **Aviso sobre el modo local:** mientras no existan variables de Supabase, se muestra un aviso amarillo y los datos siguen guardándose sin inicio de sesión en el navegador. No lo confundas con un acceso privado.
>
> **Migración:** si tienes datos antiguos en este navegador y tu cuenta todavía no tiene datos en la nube, aparecerá una opción para importarlos o descargarlos en JSON. La copia local antigua se borra **únicamente tras una importación exitosa**. Una cuenta de Supabase que ya tenga datos no se sobrescribe automáticamente.
>
> **Ediciones simultáneas:** esta primera sincronización guarda una copia completa por cuenta, por lo que no conviene modificar datos en dos dispositivos al mismo tiempo: gana la última escritura. Guarda respaldos JSON y evita cerrar la pestaña mientras aparezca «Guardando…».

## 🛠 Ejecutar localmente

Necesitas Node.js 22.

```bash
npm install
npm run dev
```

Para usar Supabase en desarrollo, crea `.env.local` a partir de `.env.example`, usando solamente **Project URL** y la **publishable key**. No publiques el archivo `.env.local`.

## 🚀 Publicación gratuita

El workflow [.github/workflows/pages.yml](.github/workflows/pages.yml) compila y publica automáticamente la rama `main` en GitHub Pages:

<https://embm.github.io/pulso-finanzas/>

La configuración de Supabase se pasa a Vite solo durante la compilación, mediante las variables indicadas. La API key que necesita un navegador es la pública; la protección real de los registros depende de Supabase Auth y las políticas RLS.

## 💾 Copias de seguridad y privacidad

Desde **Configuración** puedes descargar un respaldo completo JSON y tus movimientos en CSV. **No se solicitan datos bancarios ni se ejecutan transferencias**. El salario configurado se toma como ingreso estimado mensual y los gastos fijos cuentan cuando se registra su pago.

## Siguientes mejoras sugeridas

- Resolución de conflictos entre dispositivos con revisiones o tablas por movimiento.
- Filtros por rango de fechas, estadísticas de ahorro y notificaciones de presupuesto.
- Más personalización de categorías, metas y cuentas.
