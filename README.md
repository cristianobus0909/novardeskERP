# NovarDesk ERP SaaS

[🇪🇸 Español](#español) | [🇬🇧 English](#english)

---

<a name="español"></a>
## 🇪🇸 Español

NovarDesk es un sistema ERP SaaS multi-inquilino (multi-tenant) moderno diseñado para la gestión integral de comercios, inventario y Punto de Venta (POS). Desarrollado con una arquitectura escalable en monorepo (Turborepo).

### ✨ Características Principales
* **Aislamiento Multi-Tenant (Inquilino):** Seguridad absoluta de datos entre diferentes comercios usando inyección de dependencias en Prisma y AsyncLocalStorage en NestJS.
* **Punto de Venta (POS):** Interfaz fluida y rápida para registrar ventas, buscar por código de barras y generar transacciones.
* **Catálogo de Productos:** Gestión de variantes, SKU dinámico y atributos extra en base al rubro comercial (Indumentaria, Almacén, etc.).
* **Gestión de Suscripciones (SaaS):** Integración completa con **Mercado Pago** (Webhooks seguros) para el ciclo de cobro de planes de pago recurrentes, incluyendo un simulador offline de pasarela de pago.
* **Modo Oscuro / Claro:** Transiciones suaves a nivel de interfaz global para una mejor experiencia de usuario.
* **Arquitectura Monorepo:** Separación estricta entre Frontend, Backend y Database usando pnpm workspaces y Turborepo.

### 🛠 Tecnologías Utilizadas
* **Frontend:** Next.js (App Router), React, Zustand (Estado), React Query (Fetching), Vanilla CSS (Diseño a medida).
* **Backend:** NestJS, JWT Auth, Mercado Pago SDK.
* **Base de Datos:** MySQL y Prisma ORM.

### 🚀 Instalación Local

1. Instalar dependencias con pnpm:
   ```bash
   pnpm install
   ```
2. Configurar variables de entorno:
   Renombrar `.env.example` a `.env` y establecer credenciales de BD y JWT.
3. Ejecutar las migraciones de base de datos y cargar datos iniciales (Seed):
   ```bash
   cd packages/database
   npx prisma migrate dev --name init
   npx ts-node prisma/seed.ts
   ```
4. Iniciar el entorno de desarrollo:
   ```bash
   pnpm run dev
   ```

---

<a name="english"></a>
## 🇬🇧 English

NovarDesk is a modern multi-tenant SaaS ERP system designed for comprehensive business management, inventory tracking, and Point of Sale (POS). Developed with a highly scalable monorepo architecture (Turborepo).

### ✨ Key Features
* **Multi-Tenant Isolation:** Absolute data security between different businesses using dependency injection in Prisma and AsyncLocalStorage in NestJS.
* **Point of Sale (POS):** Fluid and fast interface for registering sales, barcode scanning, and transaction generation.
* **Product Catalog:** Management of variants, dynamic SKUs, and extra attributes based on the business sector (Clothing, Grocery, etc.).
* **Subscription Management (SaaS):** Full integration with **Mercado Pago** (Secure Webhooks) for recurring payment lifecycles, including an offline checkout simulator.
* **Dark / Light Mode:** Smooth transitions at the global UI level for an enhanced user experience.
* **Monorepo Architecture:** Strict separation between Frontend, Backend, and Database using pnpm workspaces and Turborepo.

### 🛠 Tech Stack
* **Frontend:** Next.js (App Router), React, Zustand (State), React Query (Fetching), Vanilla CSS (Custom Design).
* **Backend:** NestJS, JWT Auth, Mercado Pago SDK.
* **Database:** MySQL and Prisma ORM.

### 🚀 Local Setup

1. Install dependencies with pnpm:
   ```bash
   pnpm install
   ```
2. Setup environment variables:
   Rename `.env.example` to `.env` and set DB and JWT credentials.
3. Run database migrations and load initial data (Seed):
   ```bash
   cd packages/database
   npx prisma migrate dev --name init
   npx ts-node prisma/seed.ts
   ```
4. Start the development server:
   ```bash
   pnpm run dev
   ```
