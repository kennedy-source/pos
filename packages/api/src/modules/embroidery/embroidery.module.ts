// embroidery.module.ts
import { Module } from '@nestjs/common';
import { EmbroideryController } from './embroidery.controller';
import { EmbroideryService } from './embroidery.service';

@Module({
  controllers: [EmbroideryController],
  providers: [EmbroideryService],
  exports: [EmbroideryService],
})
export class EmbroideryModule {}
