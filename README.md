# Pulso Finanzas 💜

Aplicación para controlar ingresos, gastos, presupuestos, gastos fijos y analítica diaria, semanal y mensual.

**Stack:** React 19 · TypeScript · Vite · Recharts · Supabase Auth + PostgreSQL (opcional) · GitHub Pages.

## ✅ Funcionalidades

- Dashboard financiero: salario, ingresos adicionales, gastos, saldo y objetivo de ahorro.
- Registro de movimientos: crear, editar, buscar, filtrar y eliminar.
- **Ingresos previstos:** registra primas, bonos y pagos pendientes con concepto, fecha, importe estimado y nota.
- Dashboard con previsiones **separadas de los ingresos recibidos** y un saldo potencial condicional.
- **Confirmar recibido:** pide el valor real recibido, lo registra como movimiento de ingreso una sola vez y marca la previsión como recibida. No mueve dinero ni hace cargos.
- Analítica diaria, semanal y mensual, con gastos por categoría.
- Presupuestos por categoría y advertencias de exceso.
- Gastos fijos mensuales con registro de pago no duplicado.
- Personalización, tema oscuro y exportación/importación de datos JSON o CSV.
- **Inicio de sesión privado** con correo electrónico como usuario y contraseña mediante Supabase Auth.
- Registro de cuentas, confirmación por correo, cierre de sesión y recuperación de contraseña.
- **Sincronización en PostgreSQL con una fila por usuario y políticas RLS**.
- Importación guiada de datos locales existentes cuando se crea la primera cuenta.

## 📅 Cómo registrar la prima y otros ingresos esperados

1. Selecciona el mes al que corresponde la previsión (ejemplo: **diciembre de 2026**).
2. Abre la pestaña **Ingresos previstos** y pulsa **Añadir previsión**.
3. Indica el concepto, fecha estimada, valor mínimo o esperado y una nota.
4. El importe aparece en **Pendiente por recibir** y **Saldo si se recibe todo**, pero **no altera los ingresos recibidos ni el saldo actual**.
5. Cuando el dinero llegue, pulsa **Confirmar recibido**, escribe cuánto llegó realmente y acepta. La aplicación crea un único movimiento de ingreso real con fecha del registro; puedes verificarlo en **Movimientos**.

**Compatibilidad:** los perfiles antiguos de Supabase no necesitan migración SQL; el campo opcional `plannedIncomes` se guarda en el JSON existente. Las copias JSON incluyen las previsiones. Para evitar registros duplicados, no ingreses manualmente la misma prima en Movimientos antes de confirmarla en la previsión.

## 🔐 Acceso privado y sincronización (conexión configurada; revisar Auth URLs)

El proyecto Supabase **pulso-finanzas** ya está conectado mediante `.env.production` con su URL y su clave pública. La tabla `finance_data`, las políticas RLS y los permisos SQL están creados. **La web solicitará acceso por correo y contraseña** al cargar esta versión publicada. No guardamos contraseñas en el código.

1. **Ya completado:** se creó y verificó la tabla `finance_data` con RLS y políticas por `auth.uid()` en tu proyecto `pulso-finanzas`.
2. **Ya completado:** configuré la URL y la clave pública del proyecto en `.env.production`, y el workflow compila esa configuración.
3. En el panel de Supabase, revisa **Authentication → Providers → Email**. Debe estar habilitado el registro y acceso por correo/contraseña, idealmente con confirmación de correo.
4. En **Authentication → URL Configuration**, fija:
   - **Site URL:** `https://embm.github.io/pulso-finanzas/`
   - **Redirect URLs:** agrega `https://embm.github.io/pulso-finanzas/` (y `http://localhost:5173/` si vas a probar en local).
5. **No necesitas añadir secretos de GitHub para el frontend**: la app utiliza una clave pública de Supabase, que puede estar en el código de cliente. **Nunca publiques claves `service_role` o `secret`.**
6. Se permite registrar un usuario con correo electrónico y contraseña; el nombre visible es opcional.
7. Abre [GitHub Actions](https://github.com/EMBM/pulso-finanzas/actions/workflows/pages.yml), elige **Run workflow** en `main` y verifica el despliegue.
8. Visita <https://embm.github.io/pulso-finanzas/>, pulsa **Crear una cuenta**, registra un correo y contraseña y sigue la confirmación del correo. Entonces tus datos se guardarán por cuenta.

> **Aviso sobre el modo local:** si abres una versión antigua o ejecutas localmente sin `.env.local`, seguirá guardando datos sin autenticación. En producción, `.env.production` activa Supabase.
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

La configuración pública de Supabase se carga desde `.env.production` durante la compilación. Solo contiene la URL del proyecto y la clave `sb_publishable_...`, no credenciales administrativas. La API key que necesita un navegador es la pública; la protección real de los registros depende de Supabase Auth y las políticas RLS.

## 💾 Copias de seguridad y privacidad

Desde **Configuración** puedes descargar un respaldo completo JSON y tus movimientos en CSV. **No se solicitan datos bancarios ni se ejecutan transferencias**. El salario configurado se toma como ingreso estimado mensual y los gastos fijos cuentan cuando se registra su pago.

## Siguientes mejoras sugeridas

- Resolución de conflictos entre dispositivos con revisiones o tablas por movimiento.
- Filtros por rango de fechas, estadísticas de ahorro y notificaciones de presupuesto.
- Más personalización de categorías, metas y cuentas.
