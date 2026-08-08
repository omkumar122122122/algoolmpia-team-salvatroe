import { BadRequestException, Body, Controller, Get, HttpException, InternalServerErrorException, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AdoptionsService } from './adoptions.service';
import { LegalReviewBriefService } from './legal-review-brief.service';
import { CreateAdoptionDto, QueryAdoptionDto, UpdateAdoptionStatusDto } from './dto';

@ApiTags('Adoption Records')
@ApiBearerAuth()
@Controller('adoptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdoptionsController {
  constructor(
    private readonly adoptions: AdoptionsService,
    private readonly legalReviewBriefService: LegalReviewBriefService,
  ) {}

  @Get('verify')
  @Roles(Role.ADMIN, Role.ORPHANAGE)
  @ApiOperation({ summary: 'Verify parent-child eligibility for adoption' })
  verify(@Query('parentId') parentId: string, @Query('childId') childId: string, @CurrentUser() user: JwtPayload) {
    if (!parentId || !childId) throw new BadRequestException('parentId and childId are required');
    return this.adoptions.verifyEligibility(parentId, childId, user.sub, user.role);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ORPHANAGE, Role.PARENT)
  @ApiOperation({ summary: 'List adoption records scoped to the authenticated role' })
  findAll(@Query() query: QueryAdoptionDto, @CurrentUser() user: JwtPayload) { return this.adoptions.findAll(query, user.sub, user.role); }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ORPHANAGE, Role.PARENT)
  @ApiOperation({ summary: 'Get an adoption record' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) { return this.adoptions.findOne(id, user.sub, user.role); }

  @Get(':id/brief')
  @Roles(Role.ADMIN, Role.ORPHANAGE, Role.PARENT)
  @ApiOperation({ summary: 'Download Legal Review Brief (PDF or HTML)' })
  @ApiResponse({ status: 200, description: 'Downloadable PDF or HTML legal review brief document' })
  @ApiResponse({ status: 400, description: 'Invalid record ID format' })
  @ApiResponse({ status: 403, description: 'Unauthorized access to legal record' })
  @ApiResponse({ status: 404, description: 'Adoption legal record not found' })
  @ApiResponse({ status: 500, description: 'Document generation failure' })
  async generateBrief(
    @Param('id') id: string,
    @Query('format') format: string,
    @Res() res: Response,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!id || typeof id !== 'string' || id.trim() === '' || id.length > 64) {
      throw new BadRequestException('Invalid legal record ID parameter');
    }

    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');

    try {
      if (format?.toLowerCase() === 'html') {
        const buffer = await this.adoptions.generateBrief(id, user.sub, user.role);
        res.set({
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="legal-review-brief-${safeId}.html"`,
        });
        return res.send(buffer);
      }

      const buffer = await this.adoptions.generateBriefPdf(id, user.sub, user.role);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="legal-review-brief-${safeId}.pdf"`,
      });
      return res.send(buffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'An unexpected error occurred while generating the legal review brief PDF',
      );
    }
  }

  @Get(':id/brief/data')
  @Roles(Role.ADMIN, Role.ORPHANAGE, Role.PARENT)
  @ApiOperation({ summary: 'Get legal review brief structured DTO data' })
  async getBriefData(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.legalReviewBriefService.getLegalReviewBrief(id, user.sub, user.role);
  }

  @Post()
  @Roles(Role.ADMIN, Role.ORPHANAGE)
  @ApiOperation({ summary: 'Submit an eligible adoption for final admin review' })
  @ApiResponse({ status: 201, description: 'Adoption submitted for legal review' })
  create(@Body() dto: CreateAdoptionDto, @CurrentUser() user: JwtPayload) { return this.adoptions.create(dto, user.sub, user.role); }

  @Post(':id/documents')
  @Roles(Role.ADMIN, Role.ORPHANAGE)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', required: ['documentType', 'file'], properties: { documentType: { type: 'string' }, file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload a required adoption document' })
  async upload(@Param('id') id: string, @Body('documentType') documentType: string, @UploadedFile() file: Express.Multer.File, @CurrentUser() user: JwtPayload) {
    if (!file || !['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype) || file.size > 10 * 1024 * 1024) throw new BadRequestException('Upload a PDF, JPEG, or PNG no larger than 10 MB');
    const folder = path.resolve(process.cwd(), 'uploads', 'adoption-documents', id);
    await fs.promises.mkdir(folder, { recursive: true });
    const fileName = `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`;
    const storagePath = path.join('uploads', 'adoption-documents', id, fileName);
    await fs.promises.writeFile(path.join(folder, fileName), file.buffer);
    return this.adoptions.uploadDocument(id, documentType, file, user.sub, user.role, { fileName, storagePath, storageUrl: `/uploads/adoption-documents/${id}/${fileName}` });
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve or cancel an adoption record' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateAdoptionStatusDto, @CurrentUser('sub') userId: string) { return this.adoptions.updateStatus(id, dto, userId); }
}
