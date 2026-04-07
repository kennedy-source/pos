import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS — allow desktop app and web admin
  app.enableCors({
    origin: [
      process.env.WEB_ADMIN_URL || 'http://localhost:3001',
      'app://.' // Electron
    ],
    credentials: true,
  });

  // Global validation pipe — auto-validate all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response transform interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger API docs (disable in production if preferred)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('UniForm POS API')
      .setDescription('School Uniform POS & Inventory Management System')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`\n✅ UniForm POS API running on: http://localhost:${port}`);
  console.log(`📖 API Docs: http://localhost:${port}/api/docs\n`);
}

bootstrap();
