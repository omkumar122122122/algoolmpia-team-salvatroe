import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AdoptionsController } from './adoptions.controller';
import { AdoptionsService } from './adoptions.service';
import { AlertsModule } from '../alerts/alerts.module';
import { BriefGeneratorService } from './brief-generator.service';
import { LegalReviewBriefService } from './legal-review-brief.service';

@Module({
  imports: [PrismaModule, AlertsModule],
  controllers: [AdoptionsController],
  providers: [AdoptionsService, BriefGeneratorService, LegalReviewBriefService],
  exports: [AdoptionsService, LegalReviewBriefService],
})
export class AdoptionsModule {}
