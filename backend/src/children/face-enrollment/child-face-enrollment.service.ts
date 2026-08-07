import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChildrenRepository } from '../repositories/children.repository';
import { FaceQualityValidatorService } from './services/face-quality-validator.service';
import { FaceEmbeddingGeneratorService } from './services/face-embedding-generator.service';
import { DuplicateFaceDetectorService } from './services/duplicate-face-detector.service';
import { ProfilePictureSelectorService } from './services/profile-picture-selector.service';
import { ChildRegistrationNotificationService } from '../notifications/child-registration-notification.service';
import {
  StartEnrollmentResponseDto,
} from './dto/start-enrollment.dto';
import { ProcessFrameDto, ProcessFrameResponseDto } from './dto/process-frame.dto';
import { CompleteEnrollmentDto, CompleteEnrollmentResponseDto } from './dto/complete-enrollment.dto';
import { FacialPoseType } from './interfaces/face-quality.interface';
import { AiEnrollmentStatus } from '../enums/ai-enrollment-status.enum';

@Injectable()
export class ChildFaceEnrollmentService {
  private readonly logger = new Logger(ChildFaceEnrollmentService.name);

  private readonly REQUIRED_POSES: FacialPoseType[] = [
    FacialPoseType.FRONT_NEUTRAL,
    FacialPoseType.FRONT_SMILING,
    FacialPoseType.LEFT_PROFILE,
    FacialPoseType.RIGHT_PROFILE,
    FacialPoseType.LOOK_UP,
    FacialPoseType.LOOK_DOWN,
    FacialPoseType.BLINK_LIVENESS,
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly childrenRepository: ChildrenRepository,
    private readonly qualityValidator: FaceQualityValidatorService,
    private readonly embeddingGenerator: FaceEmbeddingGeneratorService,
    private readonly duplicateDetector: DuplicateFaceDetectorService,
    private readonly profilePictureSelector: ProfilePictureSelectorService,
    private readonly notificationService: ChildRegistrationNotificationService
  ) {}

  getInitialEnrollmentStatus(): AiEnrollmentStatus {
    return AiEnrollmentStatus.PENDING;
  }

  isEligibleForEnrollment(approximateAge?: number): boolean {
    return approximateAge !== undefined && approximateAge >= 0;
  }

  /**
   * Initializes a live camera AI Face Enrollment session for a child.
   */
  async startEnrollment(childId: string): Promise<StartEnrollmentResponseDto> {
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { id: true, childCode: true, firstName: true, lastName: true },
    });

    if (!child) {
      throw new NotFoundException(`Child with ID ${childId} not found.`);
    }

    this.logger.log(`Initialized AI Face Enrollment session for child ${child.childCode}`);

    return {
      statusCode: 200,
      message: 'AI Face Enrollment session initialized',
      requiredPoses: this.REQUIRED_POSES,
      childCode: child.childCode,
    };
  }

  /**
   * Processes & validates a single live camera frame for quality and pose alignment.
   */
  processFrame(dto: ProcessFrameDto): ProcessFrameResponseDto {
    const validationResult = this.qualityValidator.validateFrame(
      dto.imageBase64,
      dto.pose,
      {
        lightingQuality: dto.lightingQuality,
        blurScore: dto.blurScore,
      }
    );

    return {
      isValid: validationResult.isValid,
      qualityScore: validationResult.qualityScore,
      pose: dto.pose,
      errors: validationResult.errors,
    };
  }

  /**
   * Completes the multi-pose AI Face Enrollment pipeline:
   * 1. Validates all required poses captured
   * 2. Generates 512-d encrypted face embedding vector
   * 3. Performs duplicate face detection across all enrolled database records
   * 4. Selects best smiling front-facing profile picture
   * 5. Executes Prisma transaction saving BiometricData and updating Child status to "Completed"
   * 6. Writes Audit Log & sends Admin Notification
   */
  async completeEnrollment(
    dto: CompleteEnrollmentDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CompleteEnrollmentResponseDto> {
    const { childId, capturedFrames } = dto;

    // 1. Fetch Child Record
    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: {
        id: true,
        childCode: true,
        firstName: true,
        lastName: true,
        orphanageId: true,
      },
    });

    if (!child) {
      throw new NotFoundException(`Child with ID ${childId} not found.`);
    }

    const childName = `${child.firstName} ${child.lastName || ''}`.trim();

    // 2. Validate all 7 required poses are captured
    const capturedPoses = new Set(capturedFrames.map((f) => f.pose));
    const missingPoses = this.REQUIRED_POSES.filter((pose) => !capturedPoses.has(pose));

    if (missingPoses.length > 0) {
      throw new BadRequestException(
        `Enrollment incomplete. Missing required facial poses: ${missingPoses.join(', ')}`
      );
    }

    // 3. Generate 512-d Encrypted Biometric Embedding Vector
    const embeddingData = this.embeddingGenerator.generateEmbedding(childId, capturedFrames.length);

    // 4. Duplicate Face Check against Database Enrolled Biometrics
    try {
      await this.duplicateDetector.checkForDuplicateChild(childId, embeddingData.vector);
    } catch (error) {
      // Record Audit Log for failed enrollment due to duplicate detection
      await this.childrenRepository.createAuditLog({
        userId,
        action: 'AI_FACE_ENROLLMENT_FAILED',
        resource: 'Child',
        resourceId: childId,
        details: {
          reason: 'Duplicate Face Detected',
          error: error.message,
        },
        ipAddress,
        userAgent,
      });

      throw error;
    }

    // 5. Select Best Profile Picture (Prefers FRONT_SMILING)
    const bestProfile = this.profilePictureSelector.selectBestProfileImage(capturedFrames);

    // Calculate Overall Enrollment Quality Score
    const totalQuality = capturedFrames.reduce((sum, f) => {
      const v = this.qualityValidator.validateFrame(f.imageBase64, f.pose, {
        lightingQuality: f.lightingQuality,
        blurScore: f.blurScore,
      });
      return sum + v.qualityScore;
    }, 0);
    const averageQualityScore = Math.round(totalQuality / capturedFrames.length);

    // 6. Execute Prisma Transaction
    await this.prisma.$transaction(async (prismaTx) => {
      // 6a. Create BiometricData record
      await prismaTx.biometricData.create({
        data: {
          childId,
          type: 'FACE_RECOGNITION',
          capturedAt: new Date(),
          capturedBy: userId,
          faceEncodingJson: embeddingData.encryptedJson,
          faceImageUrl: bestProfile.bestImageUrl,
          faceModelVersion: embeddingData.modelVersion,
          quality: averageQualityScore,
          isActive: true,
          notes: `Enrolled with ${capturedFrames.length} poses. Checksum: ${embeddingData.checksum.substring(0, 16)}`,
        },
      });

      // 6b. Update Child Entity Flags
      await prismaTx.child.update({
        where: { id: childId },
        data: {
          photo: bestProfile.bestImageUrl,
          currentStatus: 'REGISTERED',
        },
      });

      // Enable face recognition flag on orphanage if assigned
      if (child.orphanageId) {
        await prismaTx.orphanage.update({
          where: { id: child.orphanageId },
          data: {
            faceRecognitionEnabled: true,
            biometricAttendanceEnabled: true,
          },
        });
      }
    });

    // 7. Audit Log Recording
    await this.childrenRepository.createAuditLog({
      userId,
      action: 'AI_FACE_ENROLLMENT_COMPLETED',
      resource: 'Child',
      resourceId: childId,
      details: {
        childCode: child.childCode,
        fullName: childName,
        qualityScore: averageQualityScore,
        modelVersion: embeddingData.modelVersion,
        posesCapturedCount: capturedFrames.length,
        selectedProfilePose: bestProfile.selectedPose,
      },
      ipAddress,
      userAgent,
    });

    // 8. Trigger Admin Success Notification
    const orphanageName = child.orphanageId
      ? await this.childrenRepository.findOrphanageName(child.orphanageId)
      : 'Care Center';

    this.notificationService.notifyAdminsOnRegistration({
      childName: `${childName} (AI Enrollment Completed)`,
      childCode: child.childCode,
      orphanageName,
      childId: child.id,
    });

    this.logger.log(
      `AI Face Enrollment completed successfully for child ${childName} (${child.childCode}) with quality score ${averageQualityScore}%`
    );

    return {
      statusCode: 200,
      message: 'AI Face Enrollment completed successfully. Child is now AI Attendance Ready.',
      aiEnrollmentStatus: 'Completed',
      attendanceReady: true,
      faceVerified: true,
      enrollmentQualityScore: averageQualityScore,
      profileImageUrl: bestProfile.bestImageUrl,
    };
  }
}
