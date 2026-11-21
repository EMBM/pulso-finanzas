# Pulso Finanzas 💜

Aplicación de finanzas personales construida con **React 19, TypeScript, Vite y Recharts**.

## Funciones

- Resumen mensual de salario, ingresos extra, gastos, saldo proyectado y objetivo de ahorro.
- Registro de movimientos con fecha, categoría y notas; edición, eliminación, búsqueda y filtros.
- Analítica diaria, semanal y mensual; gráfico de categorías.
- Presupuesto por categoría con alertas de exceso.
- Gastos fijos recurrentes que se registran una sola vez por mes.
- Categorías personalizables y modo oscuro.
- Copias de seguridad JSON, exportación CSV e importación de copias JSON.
- Diseño responsive para computador y celular.

## Ejecutar en local

Requiere Node.js 22 o compatible.

```bash
npm install
npm run dev
```

## Publicar gratis con GitHub Pages

El archivo `.github/workflows/pages.yml` contiene el despliegue automático de la rama `main`.

1. Abrir **Settings → Pages** en el repositorio.
2. En **Build and deployment → Source**, seleccionar **GitHub Actions**.
3. Abrir **Actions** y verificar que el flujo **Publicar Pulso Finanzas** finalice exitosamente. Si hace falta, usar **Run workflow**.
4. Sitio esperado, una vez publicado: https://embm.github.io/pulso-finanzas/

El archivo `vite.config.ts` usa `base: '/pulso-finanzas/'`, necesario para esta URL.

## Almacenamiento y privacidad

**Esta versión desplegada funciona localmente.** Los movimientos se guardan en `localStorage` del navegador y **no se sincronizan** entre dispositivos. Exporta copias JSON periódicamente para no perderlos al borrar los datos del navegador. No utiliza contraseñas ni envía gastos personales a un servidor.

`supabase/schema.sql` contiene un esquema inicial de PostgreSQL con políticas RLS, y `.env.example` muestra las variables de entorno previstas. La integración completa de autenticación y sincronización con Supabase **aún no está implementada**.

## Aviso

El saldo representa una estimación a partir del salario configurado y los movimientos registrados. Los gastos recurrentes cuentan en el saldo cuando se marca «Registrar pago».
