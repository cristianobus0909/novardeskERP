import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

// Inyectar compatibilidad automática con variables de Railway
console.log('========== INICIANDO DIAGNOSTICO DE ENTORNO RAILWAY ==========');
console.log('¿Existe DATABASE_URL?', !!process.env.DATABASE_URL);
console.log('¿Existe MYSQL_URL?', !!process.env.MYSQL_URL);
console.log('Variables disponibles en la caja del Backend:', Object.keys(process.env).join(', '));
console.log('==============================================================');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Render.com asigna un puerto mediante process.env.PORT y espera escuchar en 0.0.0.0
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
