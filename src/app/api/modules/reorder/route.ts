import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// PATCH /api/modules/reorder - Reorder modules within a cohort
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { cohortId, moduleIds } = body;

    if (!cohortId || !Array.isArray(moduleIds)) {
      return NextResponse.json(
        { error: 'cohortId and moduleIds array required' },
        { status: 400 }
      );
    }

    // Verify cohort exists and get its modules
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      include: {
        cohortModules: { select: { id: true, moduleId: true } },
      },
    });

    if (!cohort) {
      return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });
    }

    // Verify all module IDs belong to this cohort
    const cohortModuleMap = new Map(
      cohort.cohortModules.map((cm) => [cm.moduleId, cm.id])
    );
    const allBelong = moduleIds.every((id) => cohortModuleMap.has(id));
    if (!allBelong) {
      return NextResponse.json(
        { error: 'Some modules do not belong to this cohort' },
        { status: 400 }
      );
    }

    // Update orderIndex for each CohortModule
    const updates = moduleIds.map((moduleId, index) => {
      const cohortModuleId = cohortModuleMap.get(moduleId);
      return prisma.cohortModule.update({
        where: { id: cohortModuleId },
        data: { orderIndex: index },
      });
    });

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering modules:', error);
    return NextResponse.json({ error: 'Failed to reorder modules' }, { status: 500 });
  }
}
