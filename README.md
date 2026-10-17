# Mr.Brands — tienda y panel

Tienda en línea de **Mr.Brands**, la casa del flow en el CC Estación Central de Maracay, con su panel para el dueño.

- **Tienda** (`/`, `/tienda`, `/producto/...`): catálogo con precios en dólares y su equivalente en bolívares a tasa BCV, bolsa de compra y pedido directo con **delivery en Maracay**, **envío nacional** (MRW, Zoom, Tealca) o **retiro en tienda**. Pagos con pago móvil, Zelle, Binance, efectivo o **Cashea en cuotas**. Cada pedido recibe su **boleto** (`/pedido/[id]`), que muestra el estado en vivo y manda el comprobante por WhatsApp con un toque.
- **Panel** (`/admin`): pedidos por cobrar, por preparar y por entregar, con botón de siguiente paso; ventas de 14 días, lo más vendido y stock bajo; alta y edición de productos con fotos, tallas y unidades; ajustes de tasa BCV, zonas de delivery, métodos de pago, Cashea, horario y contacto.

Hecho con Next.js 16 (App Router, Cache Components), React 19 y Postgres (Neon). Funciona en celular y computadora.

## Probarlo en tu computadora

```bash
npm install
npm run dev
```

Abre http://localhost:3000. El panel está en http://localhost:3000/admin, con la contraseña `mrbrands2026` mientras no definas `ADMIN_PASSWORD`.

Sin base de datos, la app usa un **modo demostración en memoria**, con el catálogo real y 18 pedidos de ejemplo. Todo se reinicia al apagar el servidor.

## Publicarlo en Vercel

1. En [vercel.com/new](https://vercel.com/new), importa este repositorio. Vercel detecta Next.js solo.
2. **Conecta la base de datos (necesario para guardar pedidos de verdad).** En el proyecto, ve a **Storage → Create Database → Neon (Postgres)** y conéctala. Vercel agrega `DATABASE_URL` sola. En la primera visita la app crea sus tablas y carga el catálogo.
3. En **Settings → Environment Variables** agrega:

   | Variable | Para qué |
   | --- | --- |
   | `ADMIN_PASSWORD` | Contraseña del panel. **Cámbiala**: sin ella se usa `mrbrands2026`. |
   | `SESSION_SECRET` | Texto largo y aleatorio para firmar la sesión del panel (por ejemplo, la salida de `openssl rand -hex 32`). |
   | `NEXT_PUBLIC_SITE_URL` | Opcional: la dirección final, como `https://mrbrands.vercel.app`, para las vistas previas al compartir. |
   | `DEMO_ORDERS` | Opcional: pon `false` si no quieres los pedidos de ejemplo al crear la base de datos. |

4. Vuelve a desplegar (**Deployments → Redeploy**) para que tome las variables.

> Sin base de datos también despliega, pero en Vercel cada servidor tiene su propia memoria: un pedido puede no aparecer en el panel. Para enseñarlo al dueño, conecta Neon (es gratis).

## Antes de abrir la tienda

Hay datos de ejemplo que el dueño debe confirmar o cambiar desde el panel:

- **Precios** de franelas, jorts y monos (las gorras a $25 salen de su catálogo de WhatsApp; las baby tee "Pronto" no están cargadas todavía).
- **Marcas** asignadas a cada producto, sobre todo el Jort Tinta y la Gorra Firma Negra.
- **Datos de pago** en Ajustes: banco y cédula del pago móvil, correo de Zelle e ID de Binance. Ahora son de ejemplo.
- **Zonas de delivery y precios** en Maracay.
- **Plan de Cashea**: inicial, número de cuotas y cada cuántos días.
- Los textos de **"Paso a paso"** (la historia) se escribieron a partir de su video "Nuestra historia como emprendedores en Venezuela". Conviene que el dueño los revise.
- Borra los **pedidos de demostración** en Ajustes.

## Tasa BCV

Con "Actualizar la tasa sola" activado, el servidor consulta la tasa oficial publicada en `ve.dolarapi.com` cada hora. Si no responde, usa la tasa escrita a mano en Ajustes. El botón **Traer tasa oficial** la actualiza al momento. Cada pedido guarda la tasa del día en que se hizo.

## Ilustraciones

Esta versión es una **maqueta**: no usa fotos reales de la tienda. Cada prenda (jerseys, franelas, hoodie, monos, cargo, jorts y gorras), las escenas de la historia y la imagen para compartir son ilustraciones vectoriales originales, dibujadas con código en `scripts/illustrations/generate.mjs`. Los estampados son inventados (MARACAY, JUNGLA DE CONCRETO, CASA DEL FLOW): no copian el logo de ninguna marca.

Para cambiar colores o dibujos, edita el script y vuelve a generarlas:

```bash
node scripts/illustrations/generate.mjs   # escribe public/illus/** y public/og.png
```

Cuando el dueño tenga fotos propias, se suben desde el panel (Productos → editar → Fotos) y reemplazan a la ilustración. Se guardan comprimidas en la base de datos y se sirven desde `/api/imagen/[id]`.

## Estructura

```
src/app/(shop)            tienda: inicio, tienda, producto, pedido, boleto
src/app/admin             panel: resumen, pedidos, productos, ajustes, login
src/app/api/imagen/[id]   fotos subidas desde el panel
scripts/illustrations     generador de las ilustraciones (fuentes OFL incluidas)
src/lib/store             datos: Postgres (Neon) o memoria, misma interfaz
src/lib/catalog.ts        lecturas en caché de la tienda (se invalidan al cambiar algo)
src/proxy.ts              protege /admin
```

Comandos: `npm run dev`, `npm run build`, `npm run lint`.
