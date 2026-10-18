import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin } from '@/lib/auth'

// GET /api/settings/[key] - Get single setting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { key } = await params

    const setting = await prisma.setting.findUnique({
      where: { key }
    })

    if (!setting) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    // Parse the value based on type
    let parsedValue: unknown = setting.value
    switch (setting.type) {
      case 'number':
        parsedValue = parseFloat(setting.value)
        break
      case 'boolean':
        parsedValue = setting.value === 'true'
        break
      case 'json':
        try {
          parsedValue = JSON.parse(setting.value)
        } catch {
          parsedValue = setting.value
        }
        break
    }

    return NextResponse.json({
      setting: {
        ...setting,
        value: parsedValue
      }
    })
  } catch (error) {
    console.error('Error fetching setting:', error)
    return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 })
  }
}

// PUT /api/settings/[key] - Update single setting
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { key } = await params
    const body = await request.json()
    const { value, description } = body

    const existing = await prisma.setting.findUnique({ where: { key } })
    if (!existing) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}

    if (value !== undefined) {
      // Serialize the value
      if (typeof value === 'object') {
        updateData.value = JSON.stringify(value)
      } else {
        updateData.value = String(value)
      }
    }

    if (description !== undefined) {
      updateData.description = description
    }

    const setting = await prisma.setting.update({
      where: { key },
      data: updateData
    })

    // Parse the value for response
    let parsedValue: unknown = setting.value
    switch (setting.type) {
      case 'number':
        parsedValue = parseFloat(setting.value)
        break
      case 'boolean':
        parsedValue = setting.value === 'true'
        break
      case 'json':
        try {
          parsedValue = JSON.parse(setting.value)
        } catch {
          parsedValue = setting.value
        }
        break
    }

    return NextResponse.json({
      setting: {
        ...setting,
        value: parsedValue
      }
    })
  } catch (error) {
    console.error('Error updating setting:', error)
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 })
  }
}

// DELETE /api/settings/[key] - Delete setting (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { key } = await params

    const existing = await prisma.setting.findUnique({ where: { key } })
    if (!existing) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 })
    }

    await prisma.setting.delete({ where: { key } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting setting:', error)
    return NextResponse.json({ error: 'Failed to delete setting' }, { status: 500 })
  }
}
