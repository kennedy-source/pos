import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService, SyncPayload } from './sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('push')
  push(@Body() payload: SyncPayload) {
    return this.syncService.pushOperations(payload);
  }

  @Get('pull')
  pull(@Query('lastSyncAt') lastSyncAt: string, @Query('types') types: string) {
    const entityTypes = types ? types.split(',') : undefined;
    return this.syncService.pullChanges(lastSyncAt || new Date(0).toISOString(), entityTypes);
  }
}
