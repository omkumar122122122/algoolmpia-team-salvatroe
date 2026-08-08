import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class LegalRecordInfoDto {
  @ApiProperty({ description: 'Adoption record unique identifier' })
  @IsString()
  @IsNotEmpty()
  recordId: string;

  @ApiProperty({ description: 'Child identifier' })
  @IsString()
  @IsNotEmpty()
  childId: string;

  @ApiProperty({ description: 'Child full name' })
  @IsString()
  @IsNotEmpty()
  childName: string;

  @ApiProperty({ description: 'Child code e.g. CHD-0001' })
  @IsString()
  @IsNotEmpty()
  childCode: string;

  @ApiPropertyOptional({ description: 'Adoptive parent identifier' })
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @ApiPropertyOptional({ description: 'Adoptive parent full name' })
  @IsOptional()
  @IsString()
  parentName?: string | null;

  @ApiPropertyOptional({ description: 'Orphanage identifier' })
  @IsOptional()
  @IsString()
  orphanageId?: string | null;

  @ApiPropertyOptional({ description: 'Orphanage name' })
  @IsOptional()
  @IsString()
  orphanageName?: string | null;

  @ApiProperty({ description: 'Adoption record status' })
  @IsString()
  @IsNotEmpty()
  adoptionStatus: string;

  @ApiPropertyOptional({ description: 'Date legal process started' })
  @IsOptional()
  @IsDateString()
  legalProcessStart?: string | Date | null;

  @ApiPropertyOptional({ description: 'Date adoption process completed' })
  @IsOptional()
  @IsDateString()
  completedDate?: string | Date | null;
}

export class LegalClauseDto {
  @ApiProperty({ description: 'Clause unique identifier' })
  @IsString()
  clauseId: string;

  @ApiProperty({ description: 'Title of legal clause' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Type/category of clause e.g. COURT_ORDER, CARA_REF, CERTIFICATE, DOCUMENTATION' })
  @IsString()
  clauseType: string;

  @ApiPropertyOptional({ description: 'Clause value e.g. case number, cert number' })
  @IsOptional()
  @IsString()
  value?: string | null;

  @ApiPropertyOptional({ description: 'Long legal details or description of clause' })
  @IsOptional()
  @IsString()
  details?: string | null;

  @ApiProperty({ description: 'Clause verification status e.g. VERIFIED, PENDING, NOT_APPLICABLE' })
  @IsString()
  status: string;
}

export class LegalIssueDto {
  @ApiProperty({ description: 'Issue unique identifier' })
  @IsString()
  issueId: string;

  @ApiProperty({ description: 'Issue severity level', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] })
  @IsEnum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'])
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

  @ApiProperty({ description: 'Category of the issue' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Detailed description of the issue (supports long text)' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Timestamp when issue was detected' })
  @IsOptional()
  @IsDateString()
  detectedAt?: string | Date | null;

  @ApiProperty({ description: 'Whether the issue has been resolved' })
  @IsBoolean()
  isResolved: boolean;
}

export class VerificationStatusDto {
  @ApiProperty({ description: 'Overall verification status e.g. SUCCESSFUL, PENDING, FAILED', enum: ['SUCCESSFUL', 'PENDING', 'FAILED'] })
  @IsEnum(['SUCCESSFUL', 'PENDING', 'FAILED'])
  overallStatus: 'SUCCESSFUL' | 'PENDING' | 'FAILED';

  @ApiProperty({ description: 'Parent verification status e.g. APPROVED, PENDING, REJECTED' })
  @IsString()
  parentVerificationStatus: string;

  @ApiProperty({ description: 'Parent KYC status e.g. APPROVED, PENDING, REJECTED' })
  @IsString()
  parentKycStatus: string;

  @ApiProperty({ description: 'Police verification status e.g. CLEARED, PENDING, FLAGGED' })
  @IsString()
  policeVerificationStatus: string;

  @ApiPropertyOptional({ description: 'Police clearance date' })
  @IsOptional()
  @IsDateString()
  policeClearanceDate?: string | Date | null;

  @ApiProperty({ description: 'Count of verified documents' })
  @IsInt()
  documentsVerifiedCount: number;

  @ApiProperty({ description: 'Total required documents count' })
  @IsInt()
  totalDocumentsCount: number;

  @ApiProperty({ description: 'Formatted document verification ratio string e.g. 8/8 (100%)' })
  @IsString()
  documentVerificationRatio: string;
}

export class ReviewerNoteDto {
  @ApiProperty({ description: 'Note unique identifier' })
  @IsString()
  noteId: string;

  @ApiPropertyOptional({ description: 'Author user ID' })
  @IsOptional()
  @IsString()
  authorId?: string | null;

  @ApiProperty({ description: 'Author name' })
  @IsString()
  authorName: string;

  @ApiPropertyOptional({ description: 'Author role e.g. ADMIN, SOCIAL_WORKER' })
  @IsOptional()
  @IsString()
  role?: string | null;

  @ApiProperty({ description: 'Category e.g. GENERAL, POLICE_VERIFICATION, LEGAL_ASSESSMENT, SYSTEM' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Reviewer note content (supports long text)' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Timestamp when note was created' })
  @IsOptional()
  @IsDateString()
  createdAt?: string | Date | null;
}

export class ReviewSummaryDto {
  @ApiProperty({ description: 'Overall review outcome code' })
  @IsString()
  overallOutcome: string;

  @ApiProperty({ description: 'Reviewer recommendation' })
  @IsString()
  recommendation: string;

  @ApiProperty({ description: 'Assessed risk level', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  @ApiProperty({ description: 'Whether the legal review is approved' })
  @IsBoolean()
  isApproved: boolean;

  @ApiProperty({ description: 'Summary narrative text' })
  @IsString()
  summaryText: string;
}

export class GenerationMetadataDto {
  @ApiProperty({ description: 'Unique document identifier' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: 'Timestamp of document generation' })
  @IsDateString()
  generatedAt: string | Date;

  @ApiProperty({ description: 'User ID who requested generation' })
  @IsString()
  generatedByUserId: string;

  @ApiProperty({ description: 'Role of user who requested generation' })
  @IsString()
  generatedByRole: string;

  @ApiProperty({ description: 'System software version' })
  @IsString()
  systemVersion: string;

  @ApiPropertyOptional({ description: 'Environment name' })
  @IsOptional()
  @IsString()
  environment?: string;
}

export class LegalReviewBriefDto {
  @ApiProperty({ type: LegalRecordInfoDto })
  @ValidateNested()
  @Type(() => LegalRecordInfoDto)
  legalRecordInfo: LegalRecordInfoDto;

  @ApiProperty({ type: [LegalClauseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalClauseDto)
  keyClauses: LegalClauseDto[];

  @ApiProperty({ type: [LegalIssueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalIssueDto)
  detectedIssues: LegalIssueDto[];

  @ApiProperty({ type: VerificationStatusDto })
  @ValidateNested()
  @Type(() => VerificationStatusDto)
  verificationStatus: VerificationStatusDto;

  @ApiProperty({ type: [ReviewerNoteDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReviewerNoteDto)
  reviewerNotes: ReviewerNoteDto[];

  @ApiProperty({ type: ReviewSummaryDto })
  @ValidateNested()
  @Type(() => ReviewSummaryDto)
  reviewSummary: ReviewSummaryDto;

  @ApiProperty({ type: GenerationMetadataDto })
  @ValidateNested()
  @Type(() => GenerationMetadataDto)
  generationMetadata: GenerationMetadataDto;
}
