import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getUserFromRequest, isAdmin } from '@/lib/auth'

// Default settings that should exist
const DEFAULT_SETTINGS = [
  // General
  { key: 'site_name', value: 'DOGM.AI Cohort Platform', type: 'string', category: 'general', description: 'Platform name displayed in the header' },
  { key: 'site_description', value: 'A comprehensive cohort management platform for coding bootcamps', type: 'string', category: 'general', description: 'Platform description for SEO and about pages' },
  { key: 'contact_email', value: 'support@dogm.ai', type: 'string', category: 'general', description: 'Primary contact email' },
  { key: 'timezone', value: 'Asia/Manila', type: 'string', category: 'general', description: 'Default timezone for dates and schedules' },

  // Enrollment
  { key: 'max_students_per_cohort', value: '25', type: 'number', category: 'enrollment', description: 'Maximum students allowed per cohort' },
  { key: 'allow_self_enrollment', value: 'false', type: 'boolean', category: 'enrollment', description: 'Allow students to enroll themselves in cohorts' },
  { key: 'enrollment_open', value: 'true', type: 'boolean', category: 'enrollment', description: 'Global enrollment open/closed status' },
  { key: 'waitlist_enabled', value: 'true', type: 'boolean', category: 'enrollment', description: 'Enable waitlist when cohorts are full' },

  // Grading
  { key: 'default_passing_score', value: '60', type: 'number', category: 'grading', description: 'Default passing score percentage for assignments' },
  { key: 'late_submission_penalty', value: '10', type: 'number', category: 'grading', description: 'Percentage penalty per day for late submissions' },
  { key: 'max_late_days', value: '7', type: 'number', category: 'grading', description: 'Maximum days late submissions are accepted' },
  { key: 'allow_resubmission', value: 'true', type: 'boolean', category: 'grading', description: 'Allow students to resubmit assignments' },

  // Notifications
  { key: 'email_notifications_enabled', value: 'true', type: 'boolean', category: 'notifications', description: 'Enable email notifications' },
  { key: 'assignment_reminder_days', value: '2', type: 'number', category: 'notifications', description: 'Days before due date to send reminder' },
  { key: 'grade_notification', value: 'true', type: 'boolean', category: 'notifications', description: 'Notify students when assignments are graded' },

  // Appearance
  { key: 'primary_color', value: '#f97316', type: 'string', category: 'appearance', description: 'Primary brand color (hex)' },
  { key: 'logo_url', value: '/logo.svg', type: 'string', category: 'appearance', description: 'URL to logo image' },
  { key: 'favicon_url', value: '/favicon.ico', type: 'string', category: 'appearance', description: 'URL to favicon' },
  { key: 'show_cohort_locations', value: 'true', type: 'boolean', category: 'appearance', description: 'Display cohort locations publicly' },

  // Attendance
  { key: 'attendance_late_threshold', value: '15', type: 'number', category: 'attendance', description: 'Minutes after start time to mark as late' },
  { key: 'attendance_required_percentage', value: '80', type: 'number', category: 'attendance', description: 'Minimum attendance percentage required' },
  { key: 'track_remote_attendance', value: 'true', type: 'boolean', category: 'attendance', description: 'Track attendance for remote sessions' },
  { key: 'track_onsite_attendance', value: 'true', type: 'boolean', category: 'attendance', description: 'Track attendance for on-site labs' }
]

// GET /api/settings - Get all settings
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    // Build where clause
    const where: Record<string, unknown> = {}
    if (category && category !== 'all') {
      where.category = category
    }

    // Ensure default settings exist
    await ensureDefaultSettings()

    const settings = await prisma.setting.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    })

    // Group by category
    const grouped = settings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = []
      }
      acc[setting.category].push({
        ...setting,
        value: parseSettingValue(setting.value, setting.type) as string
      })
      return acc
    }, {} as Record<string, Array<typeof settings[0]>>)

    return NextResponse.json({ settings, grouped })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PUT /api/settings - Update multiple settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { settings } = body

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Settings array is required' },
        { status: 400 }
      )
    }

    // Update each setting
    const results = await Promise.all(
      settings.map(async (setting: { key: string; value: unknown }) => {
        const existing = await prisma.setting.findUnique({
          where: { key: setting.key }
        })

        if (!existing) {
          return { key: setting.key, error: 'Setting not found' }
        }

        const stringValue = serializeSettingValue(setting.value)

        await prisma.setting.update({
          where: { key: setting.key },
          data: { value: stringValue }
        })

        return { key: setting.key, success: true }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}

// POST /api/settings - Create a new setting (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user || !isAdmin(user)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { key, value, type, category, description } = body

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }

    // Check for existing key
    const existing = await prisma.setting.findUnique({ where: { key } })
    if (existing) {
      return NextResponse.json(
        { error: 'Setting with this key already exists' },
        { status: 400 }
      )
    }

    const setting = await prisma.setting.create({
      data: {
        key,
        value: serializeSettingValue(value),
        type: type || 'string',
        category: category || 'general',
        description: description || null
      }
    })

    return NextResponse.json({ setting }, { status: 201 })
  } catch (error) {
    console.error('Error creating setting:', error)
    return NextResponse.json({ error: 'Failed to create setting' }, { status: 500 })
  }
}

// Helper functions
async function ensureDefaultSettings() {
  for (const defaultSetting of DEFAULT_SETTINGS) {
    const existing = await prisma.setting.findUnique({
      where: { key: defaultSetting.key }
    })

    if (!existing) {
      await prisma.setting.create({
        data: defaultSetting
      })
    }
  }
}

function parseSettingValue(value: string, type: string): unknown {
  switch (type) {
    case 'number':
      return parseFloat(value)
    case 'boolean':
      return value === 'true'
    case 'json':
      try {
        return JSON.parse(value)
      } catch {
        return value
      }
    default:
      return value
  }
}

function serializeSettingValue(value: unknown): string {
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}
