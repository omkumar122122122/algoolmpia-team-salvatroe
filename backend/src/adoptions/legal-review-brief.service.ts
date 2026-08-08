import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../common/enums/role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { LegalReviewBriefDto } from './dto/legal-review-brief.dto';
import { LegalReviewBriefMapper } from './mappers/legal-review-brief.mapper';

@Injectable()
export class LegalReviewBriefService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves, validates authorization for, and compiles the Legal Review Brief DTO.
   *
   * @param recordId AdoptionRecord unique ID
   * @param userId Authenticated user requesting the brief
   * @param role Authenticated user role
   * @returns LegalReviewBriefDto cleanly formatted brief object
   */
  async getLegalReviewBrief(
    recordId: string,
    userId: string,
    role: Role,
  ): Promise<LegalReviewBriefDto> {
    // 1. Verify record exists and include all required relations
    const record = await this.prisma.adoptionRecord.findUnique({
      where: { id: recordId },
      include: {
        child: {
          include: {
            orphanage: { select: { id: true, name: true } },
          },
        },
        adoptiveParent: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            policeVerification: true,
          },
        },
        documents: {
          orderBy: { documentType: 'asc' },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Handle 404: Record not found
    if (!record) {
      throw new NotFoundException(`Adoption legal record with ID '${recordId}' was not found`);
    }

    // 2. Verify authorization / security permissions (Handle 403)
    await this.assertCanAccessRecord(record, userId, role);

    // 3. Transform entity graph into structured LegalReviewBriefDto via mapper
    return LegalReviewBriefMapper.fromPrisma(record, { userId, role });
  }

  /**
   * Security assertion ensuring RBAC and multi-tenant access control.
   */
  private async assertCanAccessRecord(record: any, userId: string, role: Role): Promise<void> {
    // PARENT role can only access their own adoption record
    if (role === Role.PARENT) {
      if (!record.adoptiveParent || record.adoptiveParent.userId !== userId) {
        throw new ForbiddenException('You do not have authorization to view this legal review brief');
      }
    }

    // ORPHANAGE role can only access records associated with their orphanage
    if (role === Role.ORPHANAGE) {
      const staff = await this.prisma.orphanageStaff.findFirst({
        where: { userId, isActive: true },
        select: { orphanageId: true },
      });

      if (!staff || record.child.orphanageId !== staff.orphanageId) {
        throw new ForbiddenException('You do not have access to legal records outside your orphanage institution');
      }
    }

    // ADMIN role has full system-wide authorization
  }
}
