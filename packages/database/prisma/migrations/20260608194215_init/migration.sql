-- CreateTable
CREATE TABLE `tenants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `razon_social` VARCHAR(191) NOT NULL,
    `cuit` VARCHAR(191) NULL,
    `estado_plan` ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'FREE_BASIC') NOT NULL DEFAULT 'TRIAL',
    `mp_suscripcion_id` VARCHAR(191) NULL,
    `fin_prueba` DATETIME(3) NULL,
    `fecha_proximo_cobro` DATETIME(3) NULL,
    `creado_el` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenant_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permisos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `codigo_permiso` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,

    UNIQUE INDEX `permisos_codigo_permiso_key`(`codigo_permiso`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rol_permisos` (
    `role_id` INTEGER NOT NULL,
    `permission_id` INTEGER NOT NULL,

    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenant_id` INTEGER NOT NULL,
    `role_id` INTEGER NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `usuarios_tenant_id_email_key`(`tenant_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenant_id` INTEGER NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `categoria` VARCHAR(191) NULL,
    `marca` VARCHAR(191) NULL,
    `es_servicio` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `producto_variantes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `producto_id` INTEGER NOT NULL,
    `tenant_id` INTEGER NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `codigo_barras` VARCHAR(191) NULL,
    `precio_venta` DECIMAL(10, 2) NOT NULL,
    `stock_actual` DECIMAL(10, 3) NOT NULL DEFAULT 0,
    `atributos_extra` JSON NULL,

    UNIQUE INDEX `producto_variantes_tenant_id_sku_key`(`tenant_id`, `sku`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ventas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tenant_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `id_cliente` VARCHAR(191) NULL,
    `nombre_cliente` VARCHAR(191) NULL DEFAULT 'Consumidor Final',
    `total` DECIMAL(10, 2) NOT NULL,
    `metodo_pago` VARCHAR(191) NOT NULL,
    `fecha_venta` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado_arca` ENUM('NO_FISCAL', 'PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'NO_FISCAL',
    `cae` VARCHAR(191) NULL,
    `vto_cae` DATETIME(3) NULL,
    `tipo_comprobante` VARCHAR(191) NULL,
    `arca_error` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `venta_detalles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `venta_id` INTEGER NOT NULL,
    `variante_id` INTEGER NOT NULL,
    `cantidad` DECIMAL(10, 3) NOT NULL,
    `precio_unitario` DECIMAL(10, 2) NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `roles` ADD CONSTRAINT `roles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rol_permisos` ADD CONSTRAINT `rol_permisos_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rol_permisos` ADD CONSTRAINT `rol_permisos_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permisos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usuarios` ADD CONSTRAINT `usuarios_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productos` ADD CONSTRAINT `productos_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto_variantes` ADD CONSTRAINT `producto_variantes_producto_id_fkey` FOREIGN KEY (`producto_id`) REFERENCES `productos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `producto_variantes` ADD CONSTRAINT `producto_variantes_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventas` ADD CONSTRAINT `ventas_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ventas` ADD CONSTRAINT `ventas_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `usuarios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venta_detalles` ADD CONSTRAINT `venta_detalles_venta_id_fkey` FOREIGN KEY (`venta_id`) REFERENCES `ventas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venta_detalles` ADD CONSTRAINT `venta_detalles_variante_id_fkey` FOREIGN KEY (`variante_id`) REFERENCES `producto_variantes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
