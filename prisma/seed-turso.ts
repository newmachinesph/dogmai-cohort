import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

// Create Turso client
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoToken) {
  console.error("Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
  process.exit(1);
}

const libsql = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

// Filipino first names and last names for generating students
const firstNames = [
  "Juan", "Maria", "Jose", "Ana", "Pedro", "Rosa", "Carlos", "Elena",
  "Miguel", "Sofia", "Antonio", "Isabella", "Luis", "Gabriela", "Rafael",
  "Camila", "Fernando", "Valentina", "Ricardo", "Daniela", "Eduardo",
  "Paula", "Andres", "Victoria", "Diego", "Natalia", "Manuel", "Lucia",
  "Roberto", "Carmen", "Alejandro", "Andrea", "Francisco", "Mariana",
  "Gabriel", "Diana", "Jorge", "Monica", "Sebastian", "Patricia",
  "Marco", "Teresa", "Emilio", "Angela", "Lorenzo", "Cristina",
  "Nicolas", "Beatriz", "Rodrigo", "Adriana", "Javier", "Clara",
  "Mateo", "Valeria", "Daniel", "Fernanda", "Pablo", "Nicole",
  "Kevin", "Samantha", "Bryan", "Jessica", "Mark", "Michelle"
];

const lastNames = [
  "Dela Cruz", "Santos", "Reyes", "Garcia", "Mendoza", "Torres", "Flores",
  "Rivera", "Gomez", "Ramos", "Bautista", "Cruz", "Lopez", "Gonzales",
  "Hernandez", "Aquino", "Fernandez", "Castro", "Perez", "Martinez",
  "Villanueva", "Soriano", "Tan", "Lim", "Chua", "Sy", "Ong", "Go",
  "Yap", "Chan", "Lee", "Ng", "Wu", "Wong", "Huang", "Domingo",
  "Pascual", "Salvador", "Aguilar", "Navarro", "Manalo", "Mercado"
];

// Helper to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper to pick random item from array
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper to generate session dates for a cohort
function generateSessionDates(startDate: Date, weeks: number): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  // Adjust to first Monday if startDate isn't Monday
  while (current.getDay() !== 1) {
    current.setDate(current.getDate() + 1);
  }

  for (let week = 0; week < weeks; week++) {
    dates.push(new Date(current)); // Monday
    current.setDate(current.getDate() + 1);
    dates.push(new Date(current)); // Tuesday
    current.setDate(current.getDate() + 1);
    dates.push(new Date(current)); // Wednesday
    current.setDate(current.getDate() + 1);
    dates.push(new Date(current)); // Thursday
    current.setDate(current.getDate() + 2);
    dates.push(new Date(current)); // Saturday
    current.setDate(current.getDate() + 2); // Next Monday
  }

  return dates;
}

// Lesson content generator
function generateLessonContent(title: string, moduleTitle: string, difficulty: string): string {
  const content = [
    { type: "heading", level: 1, content: title },
    { type: "paragraph", content: `Welcome to this lesson on ${title.toLowerCase()}. This is part of the ${moduleTitle} module.` },
    { type: "heading", level: 2, content: "Learning Objectives" },
    { type: "list", items: [
      `Understand the core concepts of ${title.toLowerCase()}`,
      "Apply practical skills in real-world scenarios",
      "Build hands-on projects using these techniques"
    ]},
    { type: "paragraph", content: difficulty === "BEGINNER"
      ? "No prior experience required."
      : "You should be comfortable with fundamental concepts before starting this lesson."
    },
  ];
  return JSON.stringify(content);
}

// Message templates
const messageTemplates = {
  greetings: ["Hi!", "Hello!", "Hey!"],
  questions: [
    "I'm having trouble understanding this concept. Can you help?",
    "How do I properly handle async/await?",
    "Can you recommend resources for learning more?"
  ],
  responses: [
    "Sure! Let me explain.",
    "Great question! Here's what you need to know...",
    "I had the same issue. Here's how I solved it."
  ]
};

async function main() {
  console.log("Connecting to Turso database...");
  console.log(`URL: ${tursoUrl}`);

  console.log("\nClearing database...");

  // Clear all tables in correct order
  await prisma.auditLog.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.session.deleteMany();
  await prisma.lessonProgress.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.cohortModule.deleteMany();
  await prisma.module.deleteMany();
  await prisma.announcementRead.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.cohortFile.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.staffAssignment.deleteMany();
  await prisma.userPresence.deleteMany();
  await prisma.messagePin.deleteMany();
  await prisma.messageReadReceipt.deleteMany();
  await prisma.messageReaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.cohort.deleteMany();
  await prisma.user.deleteMany();

  console.log("Database cleared!\n");
  console.log("Seeding Turso database with 2026 data...\n");

  // CREATE ADMIN USERS
  const adminPassword = await bcrypt.hash("Admin123!", 12);

  const admin1 = await prisma.user.create({
    data: {
      email: "admin@dogm.ai",
      username: "admin",
      passwordHash: adminPassword,
      displayName: "System Admin",
      role: "ADMIN",
      isActive: true,
      lastLoginAt: new Date("2026-01-06T08:30:00"),
    },
  });

  await prisma.user.create({
    data: {
      email: "director@dogm.ai",
      username: "director",
      passwordHash: adminPassword,
      displayName: "Program Director",
      role: "ADMIN",
      isActive: true,
      lastLoginAt: new Date("2026-01-05T14:20:00"),
    },
  });
  console.log("Created 2 admin users");

  // CREATE STAFF USERS
  const staffPassword = await bcrypt.hash("Staff123!", 12);

  const instructor1 = await prisma.user.create({
    data: {
      email: "john.instructor@dogm.ai",
      username: "instructor_john",
      passwordHash: staffPassword,
      displayName: "John Dela Cruz",
      role: "STAFF",
      isActive: true,
      lastLoginAt: new Date("2026-01-07T07:45:00"),
    },
  });

  const instructor2 = await prisma.user.create({
    data: {
      email: "carlos.instructor@dogm.ai",
      username: "instructor_carlos",
      passwordHash: staffPassword,
      displayName: "Carlos Reyes",
      role: "STAFF",
      isActive: true,
      lastLoginAt: new Date("2026-01-07T08:00:00"),
    },
  });

  const instructor3 = await prisma.user.create({
    data: {
      email: "anna.instructor@dogm.ai",
      username: "instructor_anna",
      passwordHash: staffPassword,
      displayName: "Anna Mendoza",
      role: "STAFF",
      isActive: true,
      lastLoginAt: new Date("2026-01-06T16:30:00"),
    },
  });

  const ta1 = await prisma.user.create({
    data: {
      email: "maria.ta@dogm.ai",
      username: "ta_maria",
      passwordHash: staffPassword,
      displayName: "Maria Santos",
      role: "STAFF",
      isActive: true,
      lastLoginAt: new Date("2026-01-07T08:15:00"),
    },
  });

  const ta2 = await prisma.user.create({
    data: {
      email: "elena.ta@dogm.ai",
      username: "ta_elena",
      passwordHash: staffPassword,
      displayName: "Elena Garcia",
      role: "STAFF",
      isActive: true,
      lastLoginAt: new Date("2026-01-06T17:00:00"),
    },
  });

  const ta3 = await prisma.user.create({
    data: {
      email: "miguel.ta@dogm.ai",
      username: "ta_miguel",
      passwordHash: staffPassword,
      displayName: "Miguel Torres",
      role: "STAFF",
      isActive: true,
      lastLoginAt: new Date("2026-01-07T09:00:00"),
    },
  });

  console.log("Created 6 staff users");

  // CREATE STUDENT USERS
  const studentPassword = await bcrypt.hash("Student123!", 12);
  const allStudents: { id: string; email: string; displayName: string | null; username: string }[] = [];

  for (let i = 0; i < 75; i++) {
    const studentNum = i + 1;
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const username = `student${studentNum}`;
    const email = `student${studentNum}@email.com`;

    const lastLogin = i < 50
      ? randomDate(new Date("2026-01-01"), new Date("2026-01-07"))
      : i < 65
      ? randomDate(new Date("2025-12-15"), new Date("2026-01-07"))
      : null;

    const student = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: studentPassword,
        displayName: `${firstName} ${lastName}`,
        role: "STUDENT",
        isActive: true,
        lastLoginAt: lastLogin,
      },
    });
    allStudents.push(student);
  }
  console.log("Created 75 student users");

  // CREATE COHORTS
  const cohort1 = await prisma.cohort.create({
    data: {
      name: "Batch 1 - Manila (2025)",
      slug: "batch-1-manila-2025",
      description: "The inaugural batch of DOGM.AI Bootcamp - Manila. Successfully graduated in December 2025.",
      location: "Manila",
      mode: "HYBRID",
      startDate: new Date("2025-09-15"),
      endDate: new Date("2025-12-07"),
      maxStudents: 25,
      status: "COMPLETED",
    },
  });

  const cohort2StartDate = new Date("2025-11-10");
  const cohort2 = await prisma.cohort.create({
    data: {
      name: "Batch 2 - Manila",
      slug: "batch-2-manila",
      description: "Second batch currently in progress. Focus on AI-assisted development workflows.",
      location: "Manila",
      mode: "HYBRID",
      startDate: cohort2StartDate,
      endDate: new Date("2026-02-01"),
      maxStudents: 25,
      status: "ACTIVE",
    },
  });

  const cohort3StartDate = new Date("2025-12-08");
  const cohort3 = await prisma.cohort.create({
    data: {
      name: "Batch 3 - Cavite",
      slug: "batch-3-cavite",
      description: "Third batch serving the Cavite region. Hybrid format with local meetups.",
      location: "Cavite",
      mode: "HYBRID",
      startDate: cohort3StartDate,
      endDate: new Date("2026-03-01"),
      maxStudents: 25,
      status: "ACTIVE",
    },
  });

  const cohort4StartDate = new Date("2026-02-16");
  const cohort4 = await prisma.cohort.create({
    data: {
      name: "Batch 4 - Bacolod",
      slug: "batch-4-bacolod",
      description: "Upcoming batch for the Visayas region. Enrollment now open!",
      location: "Bacolod",
      mode: "HYBRID",
      startDate: cohort4StartDate,
      endDate: new Date("2026-05-09"),
      maxStudents: 25,
      status: "UPCOMING",
    },
  });
  console.log("Created 4 cohorts");

  // ASSIGN STAFF TO COHORTS
  await prisma.staffAssignment.createMany({
    data: [
      { userId: instructor1.id, cohortId: cohort1.id, role: "INSTRUCTOR" },
      { userId: ta1.id, cohortId: cohort1.id, role: "TEACHING_ASSISTANT" },
      { userId: instructor1.id, cohortId: cohort2.id, role: "INSTRUCTOR" },
      { userId: ta1.id, cohortId: cohort2.id, role: "TEACHING_ASSISTANT" },
      { userId: ta3.id, cohortId: cohort2.id, role: "MENTOR" },
      { userId: instructor2.id, cohortId: cohort3.id, role: "INSTRUCTOR" },
      { userId: ta2.id, cohortId: cohort3.id, role: "TEACHING_ASSISTANT" },
      { userId: instructor3.id, cohortId: cohort4.id, role: "INSTRUCTOR" },
      { userId: ta2.id, cohortId: cohort4.id, role: "TEACHING_ASSISTANT" },
    ],
  });
  console.log("Assigned staff to cohorts");

  // ENROLL STUDENTS
  const cohort1Students = allStudents.slice(0, 20);
  const cohort2Students = allStudents.slice(20, 45);
  const cohort3Students = allStudents.slice(45, 68);
  const cohort4Students = allStudents.slice(68, 75);

  for (const student of cohort1Students) {
    await prisma.enrollment.create({
      data: {
        userId: student.id,
        cohortId: cohort1.id,
        status: "COMPLETED",
        enrolledAt: new Date("2025-09-10"),
        completedAt: new Date("2025-12-07"),
      },
    });
  }

  for (const student of cohort2Students) {
    await prisma.enrollment.create({
      data: {
        userId: student.id,
        cohortId: cohort2.id,
        status: "ACTIVE",
        enrolledAt: randomDate(new Date("2025-10-15"), new Date("2025-11-09")),
      },
    });
  }

  for (let i = 0; i < cohort3Students.length; i++) {
    const student = cohort3Students[i];
    const status = i < 21 ? "ACTIVE" : "ON_HOLD";
    await prisma.enrollment.create({
      data: {
        userId: student.id,
        cohortId: cohort3.id,
        status,
        enrolledAt: randomDate(new Date("2025-11-20"), new Date("2025-12-07")),
      },
    });
  }

  for (const student of cohort4Students) {
    await prisma.enrollment.create({
      data: {
        userId: student.id,
        cohortId: cohort4.id,
        status: "ACTIVE",
        enrolledAt: randomDate(new Date("2025-12-20"), new Date("2026-01-06")),
      },
    });
  }
  console.log("Enrolled 75 students across cohorts");

  // CREATE CURRICULUM MODULES
  const modules = await Promise.all([
    prisma.module.create({
      data: {
        title: "Week 1-2: Web Development Fundamentals",
        slug: "web-dev-fundamentals",
        description: "Master HTML5, CSS3, and responsive design principles.",
        orderIndex: 0,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 3-4: JavaScript Mastery",
        slug: "javascript-mastery",
        description: "Deep dive into modern JavaScript, ES6+, and async programming.",
        orderIndex: 1,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 5-6: React Development",
        slug: "react-development",
        description: "Build dynamic UIs with React. Components, hooks, state management.",
        orderIndex: 2,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 7-8: TypeScript & Next.js",
        slug: "typescript-nextjs",
        description: "Type-safe development with TypeScript. Server-side rendering with Next.js.",
        orderIndex: 3,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 9-10: Full-Stack Development",
        slug: "fullstack-development",
        description: "Databases with Prisma, authentication, and deployment.",
        orderIndex: 4,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 11-12: AI-Powered Development & Capstone",
        slug: "ai-capstone",
        description: "Integrate AI tools. Build and deploy your capstone project.",
        orderIndex: 5,
        isPublished: true,
      },
    }),
  ]);
  console.log("Created 6 curriculum modules");

  // CREATE LESSONS (simplified - 3 per module)
  const lessonsData = [
    { moduleIndex: 0, title: "HTML5 Fundamentals", slug: "html5-fundamentals", difficulty: "BEGINNER", time: 45 },
    { moduleIndex: 0, title: "CSS3 Styling", slug: "css3-styling", difficulty: "BEGINNER", time: 50 },
    { moduleIndex: 0, title: "Responsive Design", slug: "responsive-design", difficulty: "BEGINNER", time: 55 },
    { moduleIndex: 1, title: "JavaScript Basics", slug: "js-basics", difficulty: "BEGINNER", time: 50 },
    { moduleIndex: 1, title: "ES6+ Features", slug: "es6-features", difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 1, title: "Async Programming", slug: "async-js", difficulty: "INTERMEDIATE", time: 65 },
    { moduleIndex: 2, title: "React Components", slug: "react-components", difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 2, title: "React Hooks", slug: "react-hooks", difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 2, title: "State Management", slug: "state-management", difficulty: "ADVANCED", time: 65 },
    { moduleIndex: 3, title: "TypeScript Basics", slug: "ts-basics", difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 3, title: "Next.js App Router", slug: "nextjs-router", difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 3, title: "API Routes", slug: "api-routes", difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 4, title: "Prisma ORM", slug: "prisma-orm", difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 4, title: "Authentication", slug: "authentication", difficulty: "ADVANCED", time: 70 },
    { moduleIndex: 4, title: "Deployment", slug: "deployment", difficulty: "INTERMEDIATE", time: 45 },
    { moduleIndex: 5, title: "AI Tools for Dev", slug: "ai-tools", difficulty: "INTERMEDIATE", time: 50 },
    { moduleIndex: 5, title: "Capstone Planning", slug: "capstone-planning", difficulty: "ADVANCED", time: 60 },
    { moduleIndex: 5, title: "Final Presentation", slug: "final-presentation", difficulty: "ADVANCED", time: 45 },
  ];

  for (let i = 0; i < lessonsData.length; i++) {
    const lessonData = lessonsData[i];
    const moduleTitle = modules[lessonData.moduleIndex].title;
    await prisma.lesson.create({
      data: {
        moduleId: modules[lessonData.moduleIndex].id,
        title: lessonData.title,
        slug: lessonData.slug,
        description: `Master ${lessonData.title.toLowerCase()}.`,
        content: generateLessonContent(lessonData.title, moduleTitle, lessonData.difficulty),
        difficulty: lessonData.difficulty,
        estimatedTime: lessonData.time,
        order: i % 3,
        isPublished: true,
      },
    });
  }
  console.log("Created 18 lessons");

  // ASSIGN MODULES TO COHORTS
  for (const cohort of [cohort1, cohort2, cohort3, cohort4]) {
    const isCompleted = cohort.id === cohort1.id;
    const isCohort2 = cohort.id === cohort2.id;
    const isCohort3 = cohort.id === cohort3.id;

    for (let i = 0; i < modules.length; i++) {
      const moduleStart = new Date(cohort.startDate);
      moduleStart.setDate(moduleStart.getDate() + (i * 14));
      const moduleEnd = new Date(moduleStart);
      moduleEnd.setDate(moduleEnd.getDate() + 13);

      let isLocked = true;
      if (isCompleted) isLocked = false;
      else if (isCohort2 && i <= 3) isLocked = false;
      else if (isCohort3 && i <= 1) isLocked = false;

      await prisma.cohortModule.create({
        data: {
          cohortId: cohort.id,
          moduleId: modules[i].id,
          startDate: moduleStart,
          endDate: moduleEnd,
          isLocked,
          orderIndex: i,
        },
      });
    }
  }
  console.log("Assigned modules to all cohorts");

  // CREATE SESSIONS
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  for (const cohortData of [
    { cohort: cohort1, start: cohort1.startDate, completedCount: 60 },
    { cohort: cohort2, start: cohort2StartDate, completedCount: 38 },
    { cohort: cohort3, start: cohort3StartDate, completedCount: 18 },
    { cohort: cohort4, start: cohort4StartDate, completedCount: 0 },
  ]) {
    const sessions = generateSessionDates(cohortData.start, 12);
    for (let i = 0; i < sessions.length; i++) {
      const weekNum = Math.floor(i / 5) + 1;
      const dayInWeek = (i % 5) + 1;
      const moduleIndex = Math.min(Math.floor((weekNum - 1) / 2), 5);

      let status = "SCHEDULED";
      if (i < cohortData.completedCount - 2) status = "COMPLETED";
      else if (i < cohortData.completedCount) status = "IN_PROGRESS";

      await prisma.session.create({
        data: {
          cohortId: cohortData.cohort.id,
          title: `Week ${weekNum} - Day ${dayInWeek}: ${dayNames[sessions[i].getDay()]}`,
          description: `Session covering ${modules[moduleIndex].title}`,
          date: sessions[i],
          startTime: "09:00",
          endTime: "17:00",
          mode: "HYBRID",
          location: `${cohortData.cohort.location} Training Center / Zoom`,
          moduleId: modules[moduleIndex].id,
          status,
        },
      });
    }
  }
  console.log("Created sessions for all cohorts");

  // CREATE ASSIGNMENTS
  for (const cohort of [cohort2, cohort3]) {
    const isCohort2 = cohort.id === cohort2.id;
    const maxModule = isCohort2 ? 4 : 2;

    for (let i = 0; i < maxModule; i++) {
      const quizDue = new Date(cohort.startDate);
      quizDue.setDate(quizDue.getDate() + (i * 14) + 7);

      await prisma.assignment.create({
        data: {
          cohortId: cohort.id,
          moduleId: modules[i].id,
          title: `${modules[i].title.split(":")[1]?.trim() || modules[i].title} - Quiz`,
          description: `Test your understanding`,
          instructions: `Complete all questions within 60 minutes.`,
          dueDate: quizDue,
          maxPoints: 50,
          passingScore: 30,
          submissionType: "TEXT",
          isPublished: true,
        },
      });

      const projectDue = new Date(cohort.startDate);
      projectDue.setDate(projectDue.getDate() + (i * 14) + 13);

      await prisma.assignment.create({
        data: {
          cohortId: cohort.id,
          moduleId: modules[i].id,
          title: `${modules[i].title.split(":")[1]?.trim() || modules[i].title} - Project`,
          description: `Build a project demonstrating concepts`,
          instructions: `Submit your GitHub repo link.`,
          dueDate: projectDue,
          maxPoints: 100,
          passingScore: 60,
          submissionType: "GITHUB",
          isPublished: true,
        },
      });
    }
  }
  console.log("Created assignments");

  // CREATE ANNOUNCEMENTS
  await prisma.announcement.createMany({
    data: [
      {
        cohortId: cohort2.id,
        createdById: admin1.id,
        title: "Happy New Year 2026!",
        content: "Wishing everyone a fantastic 2026! See you all soon!",
        priority: "HIGH",
        isPinned: true,
        publishedAt: new Date("2026-01-01T00:00:00"),
      },
      {
        cohortId: cohort2.id,
        createdById: instructor1.id,
        title: "Week 8 Schedule Update",
        content: "This week we're diving deep into TypeScript with Next.js!",
        priority: "NORMAL",
        isPinned: false,
        publishedAt: new Date("2026-01-06T08:00:00"),
      },
      {
        cohortId: cohort3.id,
        createdById: instructor2.id,
        title: "Welcome Back from the Holidays!",
        content: "Week 4 begins with JavaScript deep dive.",
        priority: "HIGH",
        isPinned: true,
        publishedAt: new Date("2026-01-06T07:00:00"),
      },
      {
        cohortId: cohort4.id,
        createdById: admin1.id,
        title: "Welcome to Batch 4 - Bacolod!",
        content: "Congratulations on being selected! Your journey begins February 16, 2026.",
        priority: "HIGH",
        isPinned: true,
        publishedAt: new Date("2026-01-05T12:00:00"),
      },
    ],
  });
  console.log("Created announcements");

  // CREATE CONVERSATIONS
  for (let i = 0; i < 5; i++) {
    const student = cohort2Students[i];
    const staff = i % 2 === 0 ? instructor1 : ta1;

    const conversation = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        createdById: student.id,
      },
    });

    await prisma.conversationParticipant.createMany({
      data: [
        { conversationId: conversation.id, userId: student.id, role: "MEMBER" },
        { conversationId: conversation.id, userId: staff.id, role: "MEMBER" },
      ],
    });

    // Add messages
    const now = new Date();
    let currentTime = new Date(now.getTime() - 5 * 24 * 60 * 60000);

    for (let j = 0; j < 4; j++) {
      const sender = j % 2 === 0 ? student : staff;
      const content = j === 0
        ? randomPick(messageTemplates.greetings) + " " + randomPick(messageTemplates.questions)
        : randomPick(messageTemplates.responses);

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: sender.id,
          content,
          contentType: "TEXT",
          createdAt: currentTime,
        },
      });

      currentTime = new Date(currentTime.getTime() + 6 * 60 * 60000);
    }
  }
  console.log("Created conversations with messages");

  // CREATE SYSTEM SETTINGS
  await prisma.setting.createMany({
    data: [
      { key: "site_name", value: "DOGM.AI Bootcamp", type: "string", category: "general" },
      { key: "enrollment_open", value: "true", type: "boolean", category: "enrollment" },
      { key: "late_submission_penalty", value: "10", type: "number", category: "grading" },
      { key: "passing_score_default", value: "60", type: "number", category: "grading" },
      { key: "support_email", value: "support@dogm.ai", type: "string", category: "general" },
      { key: "timezone", value: "Asia/Manila", type: "string", category: "general" },
    ],
  });
  console.log("Created system settings");

  // SUMMARY
  console.log("\n" + "=".repeat(60));
  console.log("TURSO DATABASE SEEDING COMPLETED!");
  console.log("=".repeat(60));

  console.log("\nTEST CREDENTIALS:");
  console.log("-".repeat(60));
  console.log("ADMIN:    admin@dogm.ai / Admin123!");
  console.log("STAFF:    john.instructor@dogm.ai / Staff123!");
  console.log("STUDENT:  student21@email.com / Student123! (Batch 2)");
  console.log("-".repeat(60));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
