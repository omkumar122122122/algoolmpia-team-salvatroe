import { BadRequestException, ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AdoptionsController } from './adoptions.controller';
import { AdoptionsService } from './adoptions.service';
import { LegalReviewBriefService } from './legal-review-brief.service';

describe('AdoptionsController - Legal Review Brief PDF Endpoint', () => {
  let controller: AdoptionsController;
  let adoptionsService: AdoptionsService;
  let legalReviewBriefService: LegalReviewBriefService;

  const mockAdoptionsService = {
    generateBrief: jest.fn(),
    generateBriefPdf: jest.fn(),
  };

  const mockLegalReviewBriefService = {
    getLegalReviewBrief: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdoptionsController],
      providers: [
        { provide: AdoptionsService, useValue: mockAdoptionsService },
        { provide: LegalReviewBriefService, useValue: mockLegalReviewBriefService },
      ],
    }).compile();

    controller = module.get<AdoptionsController>(AdoptionsController);
    adoptionsService = module.get<AdoptionsService>(AdoptionsService);
    legalReviewBriefService = module.get<LegalReviewBriefService>(LegalReviewBriefService);

    jest.clearAllMocks();
  });

  const mockUser: JwtPayload = {
    sub: 'user-admin-1',
    role: Role.ADMIN,
    email: 'admin@system.com',
    type: 'access',
    jti: 'mock-jti-uuid',
  };

  const createMockResponse = () => {
    const res: any = {};
    res.set = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  };

  it('should return PDF buffer with correct Content-Type and Content-Disposition headers', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 Mock PDF Content');
    mockAdoptionsService.generateBriefPdf.mockResolvedValue(pdfBuffer);

    const res = createMockResponse();

    await controller.generateBrief('rec-1234', '', res, mockUser);

    expect(mockAdoptionsService.generateBriefPdf).toHaveBeenCalledWith('rec-1234', 'user-admin-1', Role.ADMIN);
    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="legal-review-brief-rec-1234.pdf"',
    });
    expect(res.send).toHaveBeenCalledWith(pdfBuffer);
  });

  it('should throw BadRequestException (400) for empty or invalid record ID format', async () => {
    const res = createMockResponse();

    await expect(controller.generateBrief('', '', res, mockUser)).rejects.toThrow(BadRequestException);
  });

  it('should propagate NotFoundException (404) when record is not found', async () => {
    mockAdoptionsService.generateBriefPdf.mockRejectedValue(new NotFoundException('Record not found'));
    const res = createMockResponse();

    await expect(controller.generateBrief('non-existent-id', '', res, mockUser)).rejects.toThrow(NotFoundException);
  });

  it('should propagate ForbiddenException (403) when access is unauthorized', async () => {
    mockAdoptionsService.generateBriefPdf.mockRejectedValue(new ForbiddenException('Unauthorized access'));
    const res = createMockResponse();

    await expect(controller.generateBrief('private-rec-99', '', res, mockUser)).rejects.toThrow(ForbiddenException);
  });

  it('should map unexpected PDF generation errors to InternalServerErrorException (500)', async () => {
    mockAdoptionsService.generateBriefPdf.mockRejectedValue(new Error('Unexpected canvas memory allocation crash'));
    const res = createMockResponse();

    await expect(controller.generateBrief('rec-crash', '', res, mockUser)).rejects.toThrow(InternalServerErrorException);
  });
});
