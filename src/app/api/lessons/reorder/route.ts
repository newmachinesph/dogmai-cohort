import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// PATCH /api/lessons/reorder - Reorder lessons within a module
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
    const { moduleId, lessonIds } = body;

    if (!moduleId || !Array.isArray(lessonIds)) {
      return NextResponse.json(
        { error: 'moduleId and lessonIds array required' },
        { status: 400 }
      );
    }

    // Verify module exists
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      include: {
        lessons: { select: { id: true } },
      },
    });

    if (!module) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 });
    }

    // Verify all lesson IDs belong to this module
    const moduleLessonIds = module.lessons.map((l) => l.id);
    const allBelong = lessonIds.every((id) => moduleLessonIds.includes(id));
    if (!allBelong) {
      return NextResponse.json(
        { error: 'Some lessons do not belong to this module' },
        { status: 400 }
      );
    }

    // Update order for each lesson
    const updates = lessonIds.map((lessonId, index) =>
      prisma.lesson.update({
        where: { id: lessonId },
        data: { order: index },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering lessons:', error);
    return NextResponse.json({ error: 'Failed to reorder lessons' }, { status: 500 });
  }
}
