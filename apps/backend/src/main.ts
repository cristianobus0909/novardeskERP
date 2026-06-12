import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';



async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({
    origin: true, // Permite cualquier origen de forma dinámica para que no falle con credentials: true
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Render.com asigna un puerto mediante process.env.PORT y espera escuchar en 0.0.0.0
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
