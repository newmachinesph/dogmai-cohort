import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
// Sessions are Mon, Tue, Wed, Thu, Sat (no Fri, no Sun)
function generateSessionDates(startDate: Date, weeks: number): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  // Adjust to first Monday if startDate isn't Monday
  while (current.getDay() !== 1) {
    current.setDate(current.getDate() + 1);
  }

  for (let week = 0; week < weeks; week++) {
    // Monday (1)
    dates.push(new Date(current));
    // Tuesday (2)
    current.setDate(current.getDate() + 1);
    dates.push(new Date(current));
    // Wednesday (3)
    current.setDate(current.getDate() + 1);
    dates.push(new Date(current));
    // Thursday (4)
    current.setDate(current.getDate() + 1);
    dates.push(new Date(current));
    // Skip Friday, go to Saturday (6)
    current.setDate(current.getDate() + 2);
    dates.push(new Date(current));
    // Skip Sunday, go to next Monday
    current.setDate(current.getDate() + 2);
  }

  return dates;
}

// Lesson content generator
function generateLessonContent(title: string, moduleTitle: string, difficulty: string): string {
  const content = [
    {
      type: "heading",
      level: 1,
      content: title
    },
    {
      type: "paragraph",
      content: `Welcome to this lesson on ${title.toLowerCase()}. This is part of the ${moduleTitle} module.`
    },
    {
      type: "heading",
      level: 2,
      content: "Learning Objectives"
    },
    {
      type: "list",
      items: [
        `Understand the core concepts of ${title.toLowerCase()}`,
        "Apply practical skills in real-world scenarios",
        "Build hands-on projects using these techniques",
        "Prepare for assessments and evaluations"
      ]
    },
    {
      type: "heading",
      level: 2,
      content: "Prerequisites"
    },
    {
      type: "paragraph",
      content: difficulty === "BEGINNER"
        ? "No prior experience required. This lesson is designed for absolute beginners."
        : difficulty === "INTERMEDIATE"
        ? "You should be comfortable with fundamental concepts before starting this lesson."
        : "Advanced knowledge of previous modules is required. Make sure you've completed all prerequisites."
    },
    {
      type: "heading",
      level: 2,
      content: "Lesson Content"
    },
    {
      type: "paragraph",
      content: `In this comprehensive lesson, we'll dive deep into ${title.toLowerCase()}. You'll learn through a combination of theory, practical examples, and hands-on exercises.`
    },
    {
      type: "code",
      language: "javascript",
      content: `// Example code for ${title}\nconsole.log("Hello from ${title}!");`
    },
    {
      type: "heading",
      level: 2,
      content: "Key Takeaways"
    },
    {
      type: "list",
      items: [
        "Master the fundamental concepts",
        "Practice with real code examples",
        "Complete the exercises for full understanding",
        "Review and prepare for the quiz"
      ]
    }
  ];

  return JSON.stringify(content);
}

// Message content generator for realistic conversations
const messageTemplates = {
  greetings: [
    "Hi! Hope you're doing well.",
    "Hello! Quick question for you.",
    "Hey! Do you have a moment?",
    "Good morning! Just wanted to check in.",
    "Hi there! How's the bootcamp going for you?"
  ],
  questions: [
    "I'm having trouble understanding the useEffect hook. Can you explain it differently?",
    "How do I properly handle async/await in React components?",
    "What's the best way to structure a Next.js project?",
    "Can you recommend resources for learning TypeScript?",
    "I'm stuck on the assignment. Which approach should I take for state management?",
    "How do I fix this deployment error I'm getting on Vercel?",
    "What's the difference between SSR and SSG in Next.js?",
    "Can you help me debug this API route? It keeps returning 500.",
    "How should I organize my Prisma schema for this project?",
    "I need help with CSS Grid - the layout isn't working as expected."
  ],
  responses: [
    "Sure! Let me explain it step by step.",
    "Great question! Here's what you need to know...",
    "I had the same issue. Here's how I solved it.",
    "Let me send you some helpful resources.",
    "Have you tried checking the documentation? It's really helpful.",
    "I can help! When do you want to hop on a quick call?",
    "This is a common challenge. The key is understanding the fundamentals first.",
    "I'll share my notes from that lesson - they might help.",
    "Let's work through this together during the next session.",
    "Check the error logs first, then we can troubleshoot from there."
  ],
  encouragement: [
    "You're making great progress! Keep it up!",
    "Don't worry, everyone struggles with this at first.",
    "You've got this! The next module will make more sense.",
    "Great job on the last assignment!",
    "I noticed your improvement in the recent submissions.",
    "Keep pushing through - it gets easier!",
    "Your code quality has really improved.",
    "Excellent question - that shows deep thinking!"
  ],
  followups: [
    "Did that help? Let me know if you need more clarification.",
    "Let me know how it goes!",
    "Feel free to reach out if you have more questions.",
    "Happy to help anytime!",
    "Good luck with the rest of the module!",
    "See you in the next session!",
    "Thanks for reaching out!"
  ]
};

async function main() {
  console.log("Clearing database...");

  // Clear all tables in correct order (respect foreign keys)
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
  console.log("Seeding database with 2026 data...\n");

  // ==========================================
  // CREATE ADMIN USERS (2)
  // ==========================================
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

  const admin2 = await prisma.user.create({
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

  // ==========================================
  // CREATE STAFF USERS (6 total - various roles)
  // ==========================================
  const staffPassword = await bcrypt.hash("Staff123!", 12);

  // Lead Instructors
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

  // Teaching Assistants
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

  const allStaff = [instructor1, instructor2, instructor3, ta1, ta2, ta3];
  console.log("Created 6 staff users");

  // ==========================================
  // CREATE STUDENT USERS (100 total across cohorts)
  // ==========================================
  const studentPassword = await bcrypt.hash("Student123!", 12);
  const allStudents: { id: string; email: string; displayName: string | null; username: string }[] = [];

  for (let i = 0; i < 100; i++) {
    const studentNum = i + 1;
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];
    const username = `student${studentNum}`;
    const email = `student${studentNum}@email.com`;

    // Vary last login times to simulate activity patterns
    const lastLogin = i < 65
      ? randomDate(new Date("2026-01-01"), new Date("2026-01-07"))
      : i < 85
      ? randomDate(new Date("2025-12-15"), new Date("2026-01-07"))
      : null; // Some students haven't logged in yet

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
  console.log("Created 100 student users");

  // ==========================================
  // CREATE COHORTS (4 cohorts in different stages)
  // ==========================================

  // Cohort 1: Batch 1 - COMPLETED (Sept 2025 - Dec 2025)
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

  // Cohort 2: Batch 2 - ACTIVE (Nov 2025 - Feb 2026) - Currently Week 8
  const cohort2StartDate = new Date("2025-11-10");
  const cohort2EndDate = new Date("2026-02-01");

  const cohort2 = await prisma.cohort.create({
    data: {
      name: "Batch 2 - Manila",
      slug: "batch-2-manila",
      description: "Second batch currently in progress. Focus on AI-assisted development workflows.",
      location: "Manila",
      mode: "HYBRID",
      startDate: cohort2StartDate,
      endDate: cohort2EndDate,
      maxStudents: 25,
      status: "ACTIVE",
    },
  });

  // Cohort 3: Batch 3 - ACTIVE (Dec 2025 - Mar 2026) - Currently Week 4
  const cohort3StartDate = new Date("2025-12-08");
  const cohort3EndDate = new Date("2026-03-01");

  const cohort3 = await prisma.cohort.create({
    data: {
      name: "Batch 3 - Cavite",
      slug: "batch-3-cavite",
      description: "Third batch serving the Cavite region. Hybrid format with local meetups.",
      location: "Cavite",
      mode: "HYBRID",
      startDate: cohort3StartDate,
      endDate: cohort3EndDate,
      maxStudents: 25,
      status: "ACTIVE",
    },
  });

  // Cohort 4: Batch 4 - UPCOMING (Feb 2026 - May 2026) - Web Dev
  const cohort4StartDate = new Date("2026-02-16");
  const cohort4EndDate = new Date("2026-05-09");

  const cohort4 = await prisma.cohort.create({
    data: {
      name: "Web Dev Batch 4 - Bacolod",
      slug: "webdev-batch-4-bacolod",
      description: "Upcoming Web Development batch for the Visayas region. Enrollment now open!",
      location: "Bacolod",
      mode: "HYBRID",
      startDate: cohort4StartDate,
      endDate: cohort4EndDate,
      maxStudents: 25,
      status: "UPCOMING",
    },
  });

  // Cohort 5: Data Analytics Batch 1 - ACTIVE (Dec 2025 - Mar 2026) - Currently Week 4
  const cohort5StartDate = new Date("2025-12-01");
  const cohort5EndDate = new Date("2026-02-22");

  const cohort5 = await prisma.cohort.create({
    data: {
      name: "Data Analytics Batch 1 - Cebu",
      slug: "data-analytics-batch-1-cebu",
      description: "First Data Analytics cohort! Learn Python, SQL, and business intelligence tools.",
      location: "Cebu",
      mode: "HYBRID",
      startDate: cohort5StartDate,
      endDate: cohort5EndDate,
      maxStudents: 20,
      status: "ACTIVE",
    },
  });

  // Cohort 6: Data Analytics Batch 2 - UPCOMING (Mar 2026 - Jun 2026)
  const cohort6StartDate = new Date("2026-03-02");
  const cohort6EndDate = new Date("2026-05-23");

  const cohort6 = await prisma.cohort.create({
    data: {
      name: "Data Analytics Batch 2 - Manila",
      slug: "data-analytics-batch-2-manila",
      description: "Second Data Analytics cohort in Manila. Focus on ML and BI dashboards.",
      location: "Manila",
      mode: "HYBRID",
      startDate: cohort6StartDate,
      endDate: cohort6EndDate,
      maxStudents: 20,
      status: "UPCOMING",
    },
  });
  console.log("Created 6 cohorts (4 Web Dev + 2 Data Analytics)");

  // ==========================================
  // ASSIGN STAFF TO COHORTS
  // ==========================================
  await prisma.staffAssignment.createMany({
    data: [
      // Cohort 1 - Web Dev (completed)
      { userId: instructor1.id, cohortId: cohort1.id, role: "INSTRUCTOR" },
      { userId: ta1.id, cohortId: cohort1.id, role: "TEACHING_ASSISTANT" },
      // Cohort 2 - Web Dev (active)
      { userId: instructor1.id, cohortId: cohort2.id, role: "INSTRUCTOR" },
      { userId: ta1.id, cohortId: cohort2.id, role: "TEACHING_ASSISTANT" },
      { userId: ta3.id, cohortId: cohort2.id, role: "MENTOR" },
      // Cohort 3 - Web Dev (active)
      { userId: instructor2.id, cohortId: cohort3.id, role: "INSTRUCTOR" },
      { userId: ta2.id, cohortId: cohort3.id, role: "TEACHING_ASSISTANT" },
      // Cohort 4 - Web Dev (upcoming)
      { userId: instructor3.id, cohortId: cohort4.id, role: "INSTRUCTOR" },
      { userId: ta2.id, cohortId: cohort4.id, role: "TEACHING_ASSISTANT" },
      // Cohort 5 - Data Analytics (active)
      { userId: instructor2.id, cohortId: cohort5.id, role: "INSTRUCTOR" },
      { userId: instructor3.id, cohortId: cohort5.id, role: "INSTRUCTOR" },
      { userId: ta3.id, cohortId: cohort5.id, role: "TEACHING_ASSISTANT" },
      // Cohort 6 - Data Analytics (upcoming)
      { userId: instructor3.id, cohortId: cohort6.id, role: "INSTRUCTOR" },
      { userId: ta1.id, cohortId: cohort6.id, role: "TEACHING_ASSISTANT" },
    ],
  });
  console.log("Assigned staff to 6 cohorts");

  // ==========================================
  // ENROLL STUDENTS
  // ==========================================
  // Web Dev Track
  const cohort1Students = allStudents.slice(0, 20);  // Cohort 1 (Web Dev): 20 students (completed)
  const cohort2Students = allStudents.slice(20, 45); // Cohort 2 (Web Dev): 25 students (active)
  const cohort3Students = allStudents.slice(45, 65); // Cohort 3 (Web Dev): 20 students (active)
  const cohort4Students = allStudents.slice(65, 72); // Cohort 4 (Web Dev): 7 students (upcoming)
  // Data Analytics Track
  const cohort5Students = allStudents.slice(72, 90); // Cohort 5 (Data Analytics): 18 students (active)
  const cohort6Students = allStudents.slice(90, 100); // Cohort 6 (Data Analytics): 10 students (upcoming)

  // Cohort 1 - Web Dev - All completed
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

  // Cohort 2 - Web Dev - All active
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

  // Cohort 3 - Web Dev - Mix of active and on-hold
  for (let i = 0; i < cohort3Students.length; i++) {
    const student = cohort3Students[i];
    const status = i < 18 ? "ACTIVE" : "ON_HOLD"; // 2 students on hold
    await prisma.enrollment.create({
      data: {
        userId: student.id,
        cohortId: cohort3.id,
        status,
        enrolledAt: randomDate(new Date("2025-11-20"), new Date("2025-12-07")),
      },
    });
  }

  // Cohort 4 - Web Dev - Early enrollments (upcoming)
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

  // Cohort 5 - Data Analytics - Active cohort
  for (let i = 0; i < cohort5Students.length; i++) {
    const student = cohort5Students[i];
    const status = i < 16 ? "ACTIVE" : "ON_HOLD"; // 2 students on hold
    await prisma.enrollment.create({
      data: {
        userId: student.id,
        cohortId: cohort5.id,
        status,
        enrolledAt: randomDate(new Date("2025-11-15"), new Date("2025-11-30")),
      },
    });
  }

  // Cohort 6 - Data Analytics - Early enrollments (upcoming)
  for (const student of cohort6Students) {
    await prisma.enrollment.create({
      data: {
        userId: student.id,
        cohortId: cohort6.id,
        status: "ACTIVE",
        enrolledAt: randomDate(new Date("2026-01-01"), new Date("2026-01-06")),
      },
    });
  }
  console.log("Enrolled 100 students across 6 cohorts");

  // ==========================================
  // CREATE CURRICULUM MODULES - WEB DEVELOPMENT TRACK (6 modules)
  // ==========================================
  const webDevModules = await Promise.all([
    prisma.module.create({
      data: {
        title: "Week 1-2: Web Development Fundamentals",
        slug: "web-dev-fundamentals",
        description: "Master HTML5, CSS3, and responsive design principles. Build your first web pages.",
        orderIndex: 0,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 3-4: JavaScript Mastery",
        slug: "javascript-mastery",
        description: "Deep dive into modern JavaScript, ES6+, DOM manipulation, and async programming.",
        orderIndex: 1,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 5-6: React Development",
        slug: "react-development",
        description: "Build dynamic UIs with React. Components, hooks, state management, and routing.",
        orderIndex: 2,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 7-8: TypeScript & Next.js",
        slug: "typescript-nextjs",
        description: "Type-safe development with TypeScript. Server-side rendering and API routes with Next.js.",
        orderIndex: 3,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 9-10: Full-Stack Development",
        slug: "fullstack-development",
        description: "Databases with Prisma, authentication, file uploads, and deployment strategies.",
        orderIndex: 4,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 11-12: AI-Powered Development & Capstone",
        slug: "ai-capstone",
        description: "Integrate AI tools into your workflow. Build and deploy your capstone project.",
        orderIndex: 5,
        isPublished: true,
      },
    }),
  ]);
  console.log("Created 6 Web Development curriculum modules");

  // ==========================================
  // CREATE CURRICULUM MODULES - DATA ANALYTICS TRACK (6 modules)
  // ==========================================
  const dataAnalyticsModules = await Promise.all([
    prisma.module.create({
      data: {
        title: "Week 1-2: Data Analytics Foundations",
        slug: "data-analytics-foundations",
        description: "Introduction to data analytics, statistics fundamentals, and data types. Learn to think like a data analyst.",
        orderIndex: 6,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 3-4: Python for Data Analysis",
        slug: "python-data-analysis",
        description: "Master Python programming with pandas, NumPy, and data manipulation techniques.",
        orderIndex: 7,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 5-6: Data Visualization & Storytelling",
        slug: "data-visualization",
        description: "Create compelling visualizations with matplotlib, seaborn, and Plotly. Learn to tell stories with data.",
        orderIndex: 8,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 7-8: SQL & Database Analytics",
        slug: "sql-database-analytics",
        description: "Master SQL queries, database design, and analytics with relational databases.",
        orderIndex: 9,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 9-10: Machine Learning Fundamentals",
        slug: "ml-fundamentals",
        description: "Introduction to machine learning with scikit-learn. Regression, classification, and clustering.",
        orderIndex: 10,
        isPublished: true,
      },
    }),
    prisma.module.create({
      data: {
        title: "Week 11-12: Business Intelligence & Capstone",
        slug: "bi-capstone",
        description: "Power BI/Tableau dashboards, business insights, and capstone analytics project.",
        orderIndex: 11,
        isPublished: true,
      },
    }),
  ]);
  console.log("Created 6 Data Analytics curriculum modules");

  const modules = [...webDevModules, ...dataAnalyticsModules];

  // ==========================================
  // CREATE DETAILED LESSONS FOR EACH MODULE
  // ==========================================
  const allLessons: { id: string; moduleId: string; title: string; order: number }[] = [];

  const lessonsData = [
    // Module 1: Web Dev Fundamentals
    { moduleIndex: 0, title: "Introduction to the Web", slug: "intro-to-web", order: 0, difficulty: "BEGINNER", time: 30 },
    { moduleIndex: 0, title: "HTML5 Document Structure", slug: "html5-structure", order: 1, difficulty: "BEGINNER", time: 45 },
    { moduleIndex: 0, title: "Semantic HTML Elements", slug: "semantic-html", order: 2, difficulty: "BEGINNER", time: 40 },
    { moduleIndex: 0, title: "CSS Fundamentals & Selectors", slug: "css-fundamentals", order: 3, difficulty: "BEGINNER", time: 50 },
    { moduleIndex: 0, title: "CSS Box Model & Layout", slug: "css-box-model", order: 4, difficulty: "BEGINNER", time: 45 },
    { moduleIndex: 0, title: "Flexbox Deep Dive", slug: "flexbox", order: 5, difficulty: "BEGINNER", time: 60 },
    { moduleIndex: 0, title: "CSS Grid Layout", slug: "css-grid", order: 6, difficulty: "BEGINNER", time: 60 },
    { moduleIndex: 0, title: "Responsive Design Principles", slug: "responsive-design", order: 7, difficulty: "BEGINNER", time: 55 },
    { moduleIndex: 0, title: "Forms and Validation", slug: "html-forms", order: 8, difficulty: "BEGINNER", time: 45 },
    { moduleIndex: 0, title: "Web Accessibility Basics", slug: "accessibility", order: 9, difficulty: "BEGINNER", time: 40 },

    // Module 2: JavaScript Mastery
    { moduleIndex: 1, title: "JavaScript Fundamentals", slug: "js-fundamentals", order: 0, difficulty: "BEGINNER", time: 50 },
    { moduleIndex: 1, title: "Variables, Types & Operators", slug: "js-variables", order: 1, difficulty: "BEGINNER", time: 45 },
    { moduleIndex: 1, title: "Functions & Scope", slug: "js-functions", order: 2, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 1, title: "Arrays & Array Methods", slug: "js-arrays", order: 3, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 1, title: "Objects & Object Methods", slug: "js-objects", order: 4, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 1, title: "ES6+ Features", slug: "es6-features", order: 5, difficulty: "INTERMEDIATE", time: 65 },
    { moduleIndex: 1, title: "DOM Manipulation", slug: "dom-manipulation", order: 6, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 1, title: "Event Handling", slug: "event-handling", order: 7, difficulty: "INTERMEDIATE", time: 50 },
    { moduleIndex: 1, title: "Asynchronous JavaScript", slug: "async-js", order: 8, difficulty: "INTERMEDIATE", time: 70 },
    { moduleIndex: 1, title: "Error Handling & Debugging", slug: "error-handling", order: 9, difficulty: "INTERMEDIATE", time: 45 },

    // Module 3: React Development
    { moduleIndex: 2, title: "Introduction to React", slug: "intro-to-react", order: 0, difficulty: "INTERMEDIATE", time: 45 },
    { moduleIndex: 2, title: "JSX & Components", slug: "jsx-components", order: 1, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 2, title: "Props & Component Communication", slug: "props-communication", order: 2, difficulty: "INTERMEDIATE", time: 50 },
    { moduleIndex: 2, title: "State Management with useState", slug: "use-state", order: 3, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 2, title: "useEffect & Side Effects", slug: "use-effect", order: 4, difficulty: "INTERMEDIATE", time: 65 },
    { moduleIndex: 2, title: "Forms in React", slug: "react-forms", order: 5, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 2, title: "Lists & Conditional Rendering", slug: "lists-conditionals", order: 6, difficulty: "INTERMEDIATE", time: 45 },
    { moduleIndex: 2, title: "Custom Hooks", slug: "custom-hooks", order: 7, difficulty: "ADVANCED", time: 60 },
    { moduleIndex: 2, title: "Context API & Global State", slug: "context-api", order: 8, difficulty: "ADVANCED", time: 65 },
    { moduleIndex: 2, title: "React Router Basics", slug: "react-router", order: 9, difficulty: "INTERMEDIATE", time: 50 },

    // Module 4: TypeScript & Next.js
    { moduleIndex: 3, title: "TypeScript Fundamentals", slug: "ts-fundamentals", order: 0, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 3, title: "Types & Interfaces", slug: "types-interfaces", order: 1, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 3, title: "Generics & Utility Types", slug: "generics", order: 2, difficulty: "ADVANCED", time: 65 },
    { moduleIndex: 3, title: "TypeScript with React", slug: "ts-react", order: 3, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 3, title: "Next.js Introduction", slug: "nextjs-intro", order: 4, difficulty: "INTERMEDIATE", time: 50 },
    { moduleIndex: 3, title: "App Router & Pages", slug: "app-router", order: 5, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 3, title: "Server Components", slug: "server-components", order: 6, difficulty: "ADVANCED", time: 65 },
    { moduleIndex: 3, title: "Data Fetching Strategies", slug: "data-fetching", order: 7, difficulty: "ADVANCED", time: 70 },
    { moduleIndex: 3, title: "API Routes", slug: "api-routes", order: 8, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 3, title: "Middleware & Authentication", slug: "middleware-auth", order: 9, difficulty: "ADVANCED", time: 60 },

    // Module 5: Full-Stack Development
    { moduleIndex: 4, title: "Database Fundamentals", slug: "db-fundamentals", order: 0, difficulty: "INTERMEDIATE", time: 50 },
    { moduleIndex: 4, title: "Prisma ORM Setup", slug: "prisma-setup", order: 1, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 4, title: "CRUD Operations with Prisma", slug: "prisma-crud", order: 2, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 4, title: "Database Relations", slug: "db-relations", order: 3, difficulty: "ADVANCED", time: 65 },
    { moduleIndex: 4, title: "Authentication Systems", slug: "authentication", order: 4, difficulty: "ADVANCED", time: 70 },
    { moduleIndex: 4, title: "JWT & Session Management", slug: "jwt-sessions", order: 5, difficulty: "ADVANCED", time: 60 },
    { moduleIndex: 4, title: "File Uploads & Storage", slug: "file-uploads", order: 6, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 4, title: "API Design Best Practices", slug: "api-design", order: 7, difficulty: "ADVANCED", time: 50 },
    { moduleIndex: 4, title: "Testing Strategies", slug: "testing", order: 8, difficulty: "ADVANCED", time: 65 },
    { moduleIndex: 4, title: "Deployment with Vercel", slug: "deployment", order: 9, difficulty: "INTERMEDIATE", time: 45 },

    // Module 6: AI-Powered Development & Capstone (Web Dev)
    { moduleIndex: 5, title: "AI Tools for Developers", slug: "ai-tools", order: 0, difficulty: "INTERMEDIATE", time: 45 },
    { moduleIndex: 5, title: "Claude Code & AI Assistants", slug: "claude-code", order: 1, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 5, title: "Prompt Engineering", slug: "prompt-engineering", order: 2, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 5, title: "AI-Assisted Debugging", slug: "ai-debugging", order: 3, difficulty: "INTERMEDIATE", time: 50 },
    { moduleIndex: 5, title: "Building AI-Powered Features", slug: "ai-features", order: 4, difficulty: "ADVANCED", time: 70 },
    { moduleIndex: 5, title: "Capstone Project Planning", slug: "project-planning", order: 5, difficulty: "ADVANCED", time: 60 },
    { moduleIndex: 5, title: "Project Architecture", slug: "project-architecture", order: 6, difficulty: "ADVANCED", time: 65 },
    { moduleIndex: 5, title: "Building Your Capstone", slug: "building-capstone", order: 7, difficulty: "ADVANCED", time: 120 },
    { moduleIndex: 5, title: "Code Review & Optimization", slug: "code-review", order: 8, difficulty: "ADVANCED", time: 55 },
    { moduleIndex: 5, title: "Final Presentation", slug: "final-presentation", order: 9, difficulty: "ADVANCED", time: 45 },

    // Module 7: Data Analytics Foundations (Data Analytics Track)
    { moduleIndex: 6, title: "Introduction to Data Analytics", slug: "da-intro", order: 0, difficulty: "BEGINNER", time: 45 },
    { moduleIndex: 6, title: "Statistics Fundamentals", slug: "stats-fundamentals", order: 1, difficulty: "BEGINNER", time: 55 },
    { moduleIndex: 6, title: "Data Types & Structures", slug: "data-types-structures", order: 2, difficulty: "BEGINNER", time: 50 },
    { moduleIndex: 6, title: "Descriptive Statistics", slug: "descriptive-stats", order: 3, difficulty: "BEGINNER", time: 60 },
    { moduleIndex: 6, title: "Probability Basics", slug: "probability-basics", order: 4, difficulty: "BEGINNER", time: 55 },
    { moduleIndex: 6, title: "Data Collection Methods", slug: "data-collection", order: 5, difficulty: "BEGINNER", time: 45 },
    { moduleIndex: 6, title: "Data Quality & Cleaning", slug: "data-quality", order: 6, difficulty: "BEGINNER", time: 60 },
    { moduleIndex: 6, title: "Excel for Data Analysis", slug: "excel-data", order: 7, difficulty: "BEGINNER", time: 55 },
    { moduleIndex: 6, title: "Google Sheets Advanced", slug: "google-sheets", order: 8, difficulty: "BEGINNER", time: 50 },
    { moduleIndex: 6, title: "Analytics Mindset", slug: "analytics-mindset", order: 9, difficulty: "BEGINNER", time: 40 },

    // Module 8: Python for Data Analysis
    { moduleIndex: 7, title: "Python Setup & Basics", slug: "python-setup", order: 0, difficulty: "BEGINNER", time: 45 },
    { moduleIndex: 7, title: "Python Data Types", slug: "python-types", order: 1, difficulty: "BEGINNER", time: 50 },
    { moduleIndex: 7, title: "NumPy Fundamentals", slug: "numpy-fundamentals", order: 2, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 7, title: "NumPy Advanced Operations", slug: "numpy-advanced", order: 3, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 7, title: "Pandas Introduction", slug: "pandas-intro", order: 4, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 7, title: "DataFrames & Series", slug: "dataframes-series", order: 5, difficulty: "INTERMEDIATE", time: 65 },
    { moduleIndex: 7, title: "Data Cleaning with Pandas", slug: "pandas-cleaning", order: 6, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 7, title: "Data Transformation", slug: "data-transformation", order: 7, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 7, title: "GroupBy & Aggregations", slug: "groupby-aggregations", order: 8, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 7, title: "Working with Real Datasets", slug: "real-datasets", order: 9, difficulty: "INTERMEDIATE", time: 70 },

    // Module 9: Data Visualization & Storytelling
    { moduleIndex: 8, title: "Principles of Data Visualization", slug: "viz-principles", order: 0, difficulty: "BEGINNER", time: 45 },
    { moduleIndex: 8, title: "Matplotlib Basics", slug: "matplotlib-basics", order: 1, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 8, title: "Advanced Matplotlib", slug: "matplotlib-advanced", order: 2, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 8, title: "Seaborn for Statistical Plots", slug: "seaborn-stats", order: 3, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 8, title: "Interactive Visualizations with Plotly", slug: "plotly-interactive", order: 4, difficulty: "INTERMEDIATE", time: 65 },
    { moduleIndex: 8, title: "Dashboard Design Principles", slug: "dashboard-design", order: 5, difficulty: "INTERMEDIATE", time: 50 },
    { moduleIndex: 8, title: "Data Storytelling Techniques", slug: "data-storytelling", order: 6, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 8, title: "Choosing the Right Chart", slug: "chart-selection", order: 7, difficulty: "INTERMEDIATE", time: 45 },
    { moduleIndex: 8, title: "Color Theory for Data", slug: "color-theory", order: 8, difficulty: "BEGINNER", time: 40 },
    { moduleIndex: 8, title: "Presenting Data Findings", slug: "presenting-data", order: 9, difficulty: "INTERMEDIATE", time: 50 },

    // Module 10: SQL & Database Analytics
    { moduleIndex: 9, title: "Introduction to SQL", slug: "sql-intro", order: 0, difficulty: "BEGINNER", time: 45 },
    { moduleIndex: 9, title: "SELECT Statements & Filtering", slug: "sql-select", order: 1, difficulty: "BEGINNER", time: 50 },
    { moduleIndex: 9, title: "JOINs & Relationships", slug: "sql-joins", order: 2, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 9, title: "Aggregate Functions", slug: "sql-aggregates", order: 3, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 9, title: "Subqueries & CTEs", slug: "sql-subqueries", order: 4, difficulty: "INTERMEDIATE", time: 65 },
    { moduleIndex: 9, title: "Window Functions", slug: "sql-windows", order: 5, difficulty: "ADVANCED", time: 70 },
    { moduleIndex: 9, title: "Database Design Basics", slug: "db-design-basics", order: 6, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 9, title: "Performance Optimization", slug: "sql-performance", order: 7, difficulty: "ADVANCED", time: 60 },
    { moduleIndex: 9, title: "Working with BigQuery", slug: "bigquery", order: 8, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 9, title: "SQL for Analytics Projects", slug: "sql-analytics-project", order: 9, difficulty: "ADVANCED", time: 65 },

    // Module 11: Machine Learning Fundamentals
    { moduleIndex: 10, title: "Introduction to Machine Learning", slug: "ml-intro", order: 0, difficulty: "INTERMEDIATE", time: 50 },
    { moduleIndex: 10, title: "Supervised vs Unsupervised Learning", slug: "ml-types", order: 1, difficulty: "INTERMEDIATE", time: 45 },
    { moduleIndex: 10, title: "Linear Regression", slug: "linear-regression", order: 2, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 10, title: "Logistic Regression", slug: "logistic-regression", order: 3, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 10, title: "Decision Trees & Random Forests", slug: "decision-trees", order: 4, difficulty: "INTERMEDIATE", time: 65 },
    { moduleIndex: 10, title: "Model Evaluation Metrics", slug: "model-evaluation", order: 5, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 10, title: "Cross-Validation & Hyperparameters", slug: "cross-validation", order: 6, difficulty: "ADVANCED", time: 60 },
    { moduleIndex: 10, title: "Clustering with K-Means", slug: "k-means", order: 7, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 10, title: "Feature Engineering", slug: "feature-engineering", order: 8, difficulty: "ADVANCED", time: 65 },
    { moduleIndex: 10, title: "ML Pipeline with scikit-learn", slug: "sklearn-pipeline", order: 9, difficulty: "ADVANCED", time: 70 },

    // Module 12: Business Intelligence & Capstone (Data Analytics)
    { moduleIndex: 11, title: "Introduction to Power BI", slug: "powerbi-intro", order: 0, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 11, title: "Power BI Data Modeling", slug: "powerbi-modeling", order: 1, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 11, title: "Power BI DAX Formulas", slug: "powerbi-dax", order: 2, difficulty: "ADVANCED", time: 65 },
    { moduleIndex: 11, title: "Tableau Fundamentals", slug: "tableau-fundamentals", order: 3, difficulty: "INTERMEDIATE", time: 55 },
    { moduleIndex: 11, title: "Building BI Dashboards", slug: "bi-dashboards", order: 4, difficulty: "INTERMEDIATE", time: 60 },
    { moduleIndex: 11, title: "KPIs & Business Metrics", slug: "kpis-metrics", order: 5, difficulty: "INTERMEDIATE", time: 50 },
    { moduleIndex: 11, title: "Capstone: Project Planning", slug: "da-project-planning", order: 6, difficulty: "ADVANCED", time: 55 },
    { moduleIndex: 11, title: "Capstone: Data Collection & Cleaning", slug: "da-project-data", order: 7, difficulty: "ADVANCED", time: 90 },
    { moduleIndex: 11, title: "Capstone: Analysis & Visualization", slug: "da-project-analysis", order: 8, difficulty: "ADVANCED", time: 100 },
    { moduleIndex: 11, title: "Capstone: Presentation & Insights", slug: "da-project-presentation", order: 9, difficulty: "ADVANCED", time: 60 },
  ];

  for (const lessonData of lessonsData) {
    const moduleTitle = modules[lessonData.moduleIndex].title;
    const lesson = await prisma.lesson.create({
      data: {
        moduleId: modules[lessonData.moduleIndex].id,
        title: lessonData.title,
        slug: lessonData.slug,
        description: `Master ${lessonData.title.toLowerCase()} with hands-on exercises and real-world examples.`,
        content: generateLessonContent(lessonData.title, moduleTitle, lessonData.difficulty),
        difficulty: lessonData.difficulty,
        estimatedTime: lessonData.time,
        order: lessonData.order,
        isPublished: true,
        videoUrl: `https://videos.dogm.ai/lessons/${lessonData.slug}`,
        resources: JSON.stringify([
          { title: "MDN Documentation", url: `https://developer.mozilla.org/${lessonData.slug}` },
          { title: "Practice Exercises", url: `https://exercises.dogm.ai/${lessonData.slug}` },
        ]),
      },
    });
    allLessons.push({ id: lesson.id, moduleId: lesson.moduleId, title: lesson.title, order: lesson.order });
  }
  console.log("Created 120 detailed lessons (60 Web Dev + 60 Data Analytics)");

  // ==========================================
  // ASSIGN MODULES TO COHORTS (Track-specific)
  // ==========================================

  // Web Dev cohorts (1-4) get webDevModules
  // Data Analytics cohorts (5-6) get dataAnalyticsModules

  // Cohort 1 - Web Dev - Completed (all modules done)
  for (let i = 0; i < webDevModules.length; i++) {
    const moduleStartWeeks = i * 2;
    const moduleStart = new Date(cohort1.startDate);
    moduleStart.setDate(moduleStart.getDate() + (moduleStartWeeks * 7));
    const moduleEnd = new Date(moduleStart);
    moduleEnd.setDate(moduleEnd.getDate() + 13);

    await prisma.cohortModule.create({
      data: {
        cohortId: cohort1.id,
        moduleId: webDevModules[i].id,
        startDate: moduleStart,
        endDate: moduleEnd,
        isLocked: false,
        orderIndex: i,
      },
    });
  }

  // Cohort 2 - Web Dev - Active (Week 8, modules 1-4 unlocked)
  for (let i = 0; i < webDevModules.length; i++) {
    const moduleStartWeeks = i * 2;
    const moduleStart = new Date(cohort2StartDate);
    moduleStart.setDate(moduleStart.getDate() + (moduleStartWeeks * 7));
    const moduleEnd = new Date(moduleStart);
    moduleEnd.setDate(moduleEnd.getDate() + 13);

    await prisma.cohortModule.create({
      data: {
        cohortId: cohort2.id,
        moduleId: webDevModules[i].id,
        startDate: moduleStart,
        endDate: moduleEnd,
        isLocked: i > 3, // First 4 modules unlocked
        orderIndex: i,
      },
    });
  }

  // Cohort 3 - Web Dev - Active (Week 4, modules 1-2 unlocked)
  for (let i = 0; i < webDevModules.length; i++) {
    const moduleStartWeeks = i * 2;
    const moduleStart = new Date(cohort3StartDate);
    moduleStart.setDate(moduleStart.getDate() + (moduleStartWeeks * 7));
    const moduleEnd = new Date(moduleStart);
    moduleEnd.setDate(moduleEnd.getDate() + 13);

    await prisma.cohortModule.create({
      data: {
        cohortId: cohort3.id,
        moduleId: webDevModules[i].id,
        startDate: moduleStart,
        endDate: moduleEnd,
        isLocked: i > 1, // First 2 modules unlocked
        orderIndex: i,
      },
    });
  }

  // Cohort 4 - Web Dev - Upcoming (all locked)
  for (let i = 0; i < webDevModules.length; i++) {
    const moduleStartWeeks = i * 2;
    const moduleStart = new Date(cohort4StartDate);
    moduleStart.setDate(moduleStart.getDate() + (moduleStartWeeks * 7));
    const moduleEnd = new Date(moduleStart);
    moduleEnd.setDate(moduleEnd.getDate() + 13);

    await prisma.cohortModule.create({
      data: {
        cohortId: cohort4.id,
        moduleId: webDevModules[i].id,
        startDate: moduleStart,
        endDate: moduleEnd,
        isLocked: true,
        orderIndex: i,
      },
    });
  }

  // Cohort 5 - Data Analytics - Active (Week 5, modules 1-2 unlocked)
  for (let i = 0; i < dataAnalyticsModules.length; i++) {
    const moduleStartWeeks = i * 2;
    const moduleStart = new Date(cohort5StartDate);
    moduleStart.setDate(moduleStart.getDate() + (moduleStartWeeks * 7));
    const moduleEnd = new Date(moduleStart);
    moduleEnd.setDate(moduleEnd.getDate() + 13);

    await prisma.cohortModule.create({
      data: {
        cohortId: cohort5.id,
        moduleId: dataAnalyticsModules[i].id,
        startDate: moduleStart,
        endDate: moduleEnd,
        isLocked: i > 2, // First 3 modules unlocked (currently in week 5)
        orderIndex: i,
      },
    });
  }

  // Cohort 6 - Data Analytics - Upcoming (all locked)
  for (let i = 0; i < dataAnalyticsModules.length; i++) {
    const moduleStartWeeks = i * 2;
    const moduleStart = new Date(cohort6StartDate);
    moduleStart.setDate(moduleStart.getDate() + (moduleStartWeeks * 7));
    const moduleEnd = new Date(moduleStart);
    moduleEnd.setDate(moduleEnd.getDate() + 13);

    await prisma.cohortModule.create({
      data: {
        cohortId: cohort6.id,
        moduleId: dataAnalyticsModules[i].id,
        startDate: moduleStart,
        endDate: moduleEnd,
        isLocked: true,
        orderIndex: i,
      },
    });
  }

  console.log("Assigned track-specific modules to all 6 cohorts");

  // ==========================================
  // CREATE SESSIONS FOR ALL COHORTS
  // ==========================================
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const sessionDaysPerWeek = 5;

  // Cohort 1 Sessions - Web Dev (completed)
  const cohort1Sessions = generateSessionDates(cohort1.startDate, 12);
  for (let i = 0; i < cohort1Sessions.length; i++) {
    const weekNum = Math.floor(i / sessionDaysPerWeek) + 1;
    const dayInWeek = (i % sessionDaysPerWeek) + 1;
    const moduleIndex = Math.min(Math.floor((weekNum - 1) / 2), webDevModules.length - 1);

    await prisma.session.create({
      data: {
        cohortId: cohort1.id,
        title: `Week ${weekNum} - Day ${dayInWeek}: ${dayNames[cohort1Sessions[i].getDay()]}`,
        description: `Session covering ${webDevModules[moduleIndex].title}`,
        date: cohort1Sessions[i],
        startTime: "09:00",
        endTime: "17:00",
        mode: "HYBRID",
        location: "Manila Training Center / Zoom",
        moduleId: webDevModules[moduleIndex].id,
        status: "COMPLETED",
      },
    });
  }

  // Cohort 2 Sessions - Web Dev (40 completed, 5 in progress/scheduled)
  const cohort2Sessions = generateSessionDates(cohort2StartDate, 12);
  for (let i = 0; i < cohort2Sessions.length; i++) {
    const weekNum = Math.floor(i / sessionDaysPerWeek) + 1;
    const dayInWeek = (i % sessionDaysPerWeek) + 1;
    const moduleIndex = Math.min(Math.floor((weekNum - 1) / 2), webDevModules.length - 1);

    let status: string;
    if (i < 38) status = "COMPLETED";
    else if (i < 40) status = "IN_PROGRESS";
    else status = "SCHEDULED";

    await prisma.session.create({
      data: {
        cohortId: cohort2.id,
        title: `Week ${weekNum} - Day ${dayInWeek}: ${dayNames[cohort2Sessions[i].getDay()]}`,
        description: `Session covering ${webDevModules[moduleIndex].title}`,
        date: cohort2Sessions[i],
        startTime: "09:00",
        endTime: "17:00",
        mode: "HYBRID",
        location: "Manila Training Center / Zoom",
        moduleId: webDevModules[moduleIndex].id,
        status,
      },
    });
  }

  // Cohort 3 Sessions - Web Dev (18 completed, 2 in progress, rest scheduled)
  const cohort3Sessions = generateSessionDates(cohort3StartDate, 12);
  for (let i = 0; i < cohort3Sessions.length; i++) {
    const weekNum = Math.floor(i / sessionDaysPerWeek) + 1;
    const dayInWeek = (i % sessionDaysPerWeek) + 1;
    const moduleIndex = Math.min(Math.floor((weekNum - 1) / 2), webDevModules.length - 1);

    let status: string;
    if (i < 18) status = "COMPLETED";
    else if (i < 20) status = "IN_PROGRESS";
    else status = "SCHEDULED";

    await prisma.session.create({
      data: {
        cohortId: cohort3.id,
        title: `Week ${weekNum} - Day ${dayInWeek}: ${dayNames[cohort3Sessions[i].getDay()]}`,
        description: `Session covering ${webDevModules[moduleIndex].title}`,
        date: cohort3Sessions[i],
        startTime: "09:00",
        endTime: "17:00",
        mode: "HYBRID",
        location: "Cavite Training Center / Zoom",
        moduleId: webDevModules[moduleIndex].id,
        status,
      },
    });
  }

  // Cohort 4 Sessions - Web Dev (all scheduled)
  const cohort4Sessions = generateSessionDates(cohort4StartDate, 12);
  for (let i = 0; i < cohort4Sessions.length; i++) {
    const weekNum = Math.floor(i / sessionDaysPerWeek) + 1;
    const dayInWeek = (i % sessionDaysPerWeek) + 1;
    const moduleIndex = Math.min(Math.floor((weekNum - 1) / 2), webDevModules.length - 1);

    await prisma.session.create({
      data: {
        cohortId: cohort4.id,
        title: `Week ${weekNum} - Day ${dayInWeek}: ${dayNames[cohort4Sessions[i].getDay()]}`,
        description: `Session covering ${webDevModules[moduleIndex].title}`,
        date: cohort4Sessions[i],
        startTime: "09:00",
        endTime: "17:00",
        mode: "HYBRID",
        location: "Bacolod Training Center / Zoom",
        moduleId: webDevModules[moduleIndex].id,
        status: "SCHEDULED",
      },
    });
  }

  // Cohort 5 Sessions - Data Analytics (23 completed, 2 in progress, rest scheduled)
  const cohort5Sessions = generateSessionDates(cohort5StartDate, 12);
  for (let i = 0; i < cohort5Sessions.length; i++) {
    const weekNum = Math.floor(i / sessionDaysPerWeek) + 1;
    const dayInWeek = (i % sessionDaysPerWeek) + 1;
    const moduleIndex = Math.min(Math.floor((weekNum - 1) / 2), dataAnalyticsModules.length - 1);

    let status: string;
    if (i < 23) status = "COMPLETED";
    else if (i < 25) status = "IN_PROGRESS";
    else status = "SCHEDULED";

    await prisma.session.create({
      data: {
        cohortId: cohort5.id,
        title: `Week ${weekNum} - Day ${dayInWeek}: ${dayNames[cohort5Sessions[i].getDay()]}`,
        description: `Session covering ${dataAnalyticsModules[moduleIndex].title}`,
        date: cohort5Sessions[i],
        startTime: "09:00",
        endTime: "17:00",
        mode: "HYBRID",
        location: "Cebu Training Center / Zoom",
        moduleId: dataAnalyticsModules[moduleIndex].id,
        status,
      },
    });
  }

  // Cohort 6 Sessions - Data Analytics (all scheduled)
  const cohort6Sessions = generateSessionDates(cohort6StartDate, 12);
  for (let i = 0; i < cohort6Sessions.length; i++) {
    const weekNum = Math.floor(i / sessionDaysPerWeek) + 1;
    const dayInWeek = (i % sessionDaysPerWeek) + 1;
    const moduleIndex = Math.min(Math.floor((weekNum - 1) / 2), dataAnalyticsModules.length - 1);

    await prisma.session.create({
      data: {
        cohortId: cohort6.id,
        title: `Week ${weekNum} - Day ${dayInWeek}: ${dayNames[cohort6Sessions[i].getDay()]}`,
        description: `Session covering ${dataAnalyticsModules[moduleIndex].title}`,
        date: cohort6Sessions[i],
        startTime: "09:00",
        endTime: "17:00",
        mode: "HYBRID",
        location: "Manila Training Center / Zoom",
        moduleId: dataAnalyticsModules[moduleIndex].id,
        status: "SCHEDULED",
      },
    });
  }

  const totalSessions = cohort1Sessions.length + cohort2Sessions.length + cohort3Sessions.length + cohort4Sessions.length + cohort5Sessions.length + cohort6Sessions.length;
  console.log(`Created ${totalSessions} sessions across 6 cohorts`);

  // ==========================================
  // CREATE ASSIGNMENTS
  // ==========================================
  const allAssignments: { id: string; cohortId: string; title: string; maxPoints: number; dueDate: Date }[] = [];

  // Create assignments for Web Dev cohorts (1-3)
  for (const cohort of [cohort1, cohort2, cohort3]) {
    const isCompleted = cohort.status === "COMPLETED";
    const cohortStart = cohort.startDate;

    for (let i = 0; i < webDevModules.length; i++) {
      const moduleStartWeeks = i * 2;

      // Only create assignments for unlocked modules
      if (cohort.id === cohort3.id && i > 1) continue; // Cohort 3: only first 2 modules

      // Quiz
      const quizDue = new Date(cohortStart);
      quizDue.setDate(quizDue.getDate() + (moduleStartWeeks * 7) + 7);

      const quiz = await prisma.assignment.create({
        data: {
          cohortId: cohort.id,
          moduleId: webDevModules[i].id,
          title: `${webDevModules[i].title.split(":")[1]?.trim() || webDevModules[i].title} - Quiz`,
          description: `Test your understanding of ${webDevModules[i].title}`,
          instructions: `## Quiz Instructions\n\n- Complete all questions\n- Time limit: 60 minutes\n- Minimum passing score: 60%\n\n## Topics Covered\n- Core concepts from the module\n- Practical application scenarios\n- Best practices`,
          dueDate: quizDue,
          maxPoints: 50,
          passingScore: 30,
          submissionType: "TEXT",
          isPublished: isCompleted || i < (cohort.id === cohort2.id ? 4 : 2),
        },
      });
      allAssignments.push({ id: quiz.id, cohortId: cohort.id, title: quiz.title, maxPoints: quiz.maxPoints, dueDate: quizDue });

      // Project
      const projectDue = new Date(cohortStart);
      projectDue.setDate(projectDue.getDate() + (moduleStartWeeks * 7) + 13);

      const project = await prisma.assignment.create({
        data: {
          cohortId: cohort.id,
          moduleId: webDevModules[i].id,
          title: `${webDevModules[i].title.split(":")[1]?.trim() || webDevModules[i].title} - Project`,
          description: `Build a project demonstrating ${webDevModules[i].title} concepts`,
          instructions: `## Project Requirements\n\n1. Apply all concepts learned in this module\n2. Write clean, documented code\n3. Include a README with setup instructions\n4. Deploy to Vercel (if applicable)\n\n## Grading Rubric\n- Functionality (40%)\n- Code Quality (25%)\n- Documentation (20%)\n- UI/UX (15%)`,
          dueDate: projectDue,
          maxPoints: 100,
          passingScore: 60,
          submissionType: "GITHUB",
          isPublished: isCompleted || i < (cohort.id === cohort2.id ? 4 : 2),
        },
      });
      allAssignments.push({ id: project.id, cohortId: cohort.id, title: project.title, maxPoints: project.maxPoints, dueDate: projectDue });
    }
  }

  // Create assignments for Data Analytics cohort 5
  for (let i = 0; i < dataAnalyticsModules.length; i++) {
    const moduleStartWeeks = i * 2;

    // Only create assignments for unlocked modules (first 3 modules for cohort 5)
    if (i > 2) continue;

    // Quiz
    const quizDue = new Date(cohort5StartDate);
    quizDue.setDate(quizDue.getDate() + (moduleStartWeeks * 7) + 7);

    const quiz = await prisma.assignment.create({
      data: {
        cohortId: cohort5.id,
        moduleId: dataAnalyticsModules[i].id,
        title: `${dataAnalyticsModules[i].title.split(":")[1]?.trim() || dataAnalyticsModules[i].title} - Quiz`,
        description: `Test your understanding of ${dataAnalyticsModules[i].title}`,
        instructions: `## Quiz Instructions\n\n- Complete all questions\n- Time limit: 60 minutes\n- Minimum passing score: 60%\n\n## Topics Covered\n- Core concepts from the module\n- Practical application scenarios\n- Best practices`,
        dueDate: quizDue,
        maxPoints: 50,
        passingScore: 30,
        submissionType: "TEXT",
        isPublished: i < 3,
      },
    });
    allAssignments.push({ id: quiz.id, cohortId: cohort5.id, title: quiz.title, maxPoints: quiz.maxPoints, dueDate: quizDue });

    // Project
    const projectDue = new Date(cohort5StartDate);
    projectDue.setDate(projectDue.getDate() + (moduleStartWeeks * 7) + 13);

    const project = await prisma.assignment.create({
      data: {
        cohortId: cohort5.id,
        moduleId: dataAnalyticsModules[i].id,
        title: `${dataAnalyticsModules[i].title.split(":")[1]?.trim() || dataAnalyticsModules[i].title} - Project`,
        description: `Complete a data analytics project demonstrating ${dataAnalyticsModules[i].title} concepts`,
        instructions: `## Project Requirements\n\n1. Apply all concepts learned in this module\n2. Include data cleaning and analysis steps\n3. Create visualizations to communicate insights\n4. Submit a Jupyter notebook with documentation\n\n## Grading Rubric\n- Analysis Quality (40%)\n- Visualization (25%)\n- Documentation (20%)\n- Code Quality (15%)`,
        dueDate: projectDue,
        maxPoints: 100,
        passingScore: 60,
        submissionType: "GITHUB",
        isPublished: i < 3,
      },
    });
    allAssignments.push({ id: project.id, cohortId: cohort5.id, title: project.title, maxPoints: project.maxPoints, dueDate: projectDue });
  }

  console.log(`Created ${allAssignments.length} assignments`);

  // ==========================================
  // CREATE ATTENDANCE RECORDS
  // ==========================================
  const cohort2AllSessions = await prisma.session.findMany({
    where: { cohortId: cohort2.id, status: { in: ["COMPLETED", "IN_PROGRESS"] } },
    orderBy: { date: "asc" },
  });

  const cohort3AllSessions = await prisma.session.findMany({
    where: { cohortId: cohort3.id, status: { in: ["COMPLETED", "IN_PROGRESS"] } },
    orderBy: { date: "asc" },
  });

  // Cohort 2 attendance
  for (const session of cohort2AllSessions) {
    for (const student of cohort2Students) {
      const rand = Math.random();
      let status: string;
      if (rand < 0.85) status = "PRESENT";
      else if (rand < 0.92) status = "LATE";
      else if (rand < 0.97) status = "EXCUSED";
      else status = "ABSENT";

      await prisma.attendance.create({
        data: {
          userId: student.id,
          sessionId: session.id,
          status,
          checkInAt: status !== "ABSENT" ? new Date(session.date.getTime() + (status === "LATE" ? 30 * 60000 : 0)) : null,
          checkOutAt: status !== "ABSENT" && session.status === "COMPLETED" ? new Date(session.date.getTime() + 8 * 60 * 60000) : null,
        },
      });
    }
  }

  // Cohort 3 attendance
  for (const session of cohort3AllSessions) {
    for (const student of cohort3Students.slice(0, 18)) { // Only active students
      const rand = Math.random();
      let status: string;
      if (rand < 0.82) status = "PRESENT";
      else if (rand < 0.90) status = "LATE";
      else if (rand < 0.96) status = "EXCUSED";
      else status = "ABSENT";

      await prisma.attendance.create({
        data: {
          userId: student.id,
          sessionId: session.id,
          status,
          checkInAt: status !== "ABSENT" ? new Date(session.date.getTime() + (status === "LATE" ? 25 * 60000 : 0)) : null,
          checkOutAt: status !== "ABSENT" && session.status === "COMPLETED" ? new Date(session.date.getTime() + 8 * 60 * 60000) : null,
        },
      });
    }
  }

  // Cohort 5 attendance (Data Analytics)
  const cohort5AllSessions = await prisma.session.findMany({
    where: { cohortId: cohort5.id, status: { in: ["COMPLETED", "IN_PROGRESS"] } },
    orderBy: { date: "asc" },
  });

  for (const session of cohort5AllSessions) {
    for (const student of cohort5Students.slice(0, 16)) { // Only active students
      const rand = Math.random();
      let status: string;
      if (rand < 0.88) status = "PRESENT";
      else if (rand < 0.94) status = "LATE";
      else if (rand < 0.98) status = "EXCUSED";
      else status = "ABSENT";

      await prisma.attendance.create({
        data: {
          userId: student.id,
          sessionId: session.id,
          status,
          checkInAt: status !== "ABSENT" ? new Date(session.date.getTime() + (status === "LATE" ? 20 * 60000 : 0)) : null,
          checkOutAt: status !== "ABSENT" && session.status === "COMPLETED" ? new Date(session.date.getTime() + 8 * 60 * 60000) : null,
        },
      });
    }
  }
  console.log("Created attendance records for active cohorts (2, 3, 5)");

  // ==========================================
  // CREATE SUBMISSIONS WITH GRADES AND COMMENTS
  // ==========================================
  const cohort2Assignments = allAssignments.filter(a => a.cohortId === cohort2.id);
  const cohort3Assignments = allAssignments.filter(a => a.cohortId === cohort3.id);

  // Cohort 2 submissions (more comprehensive)
  for (const assignment of cohort2Assignments) {
    const isPastDue = assignment.dueDate < new Date();

    for (const student of cohort2Students) {
      // 92% submission rate for past-due, 75% for current
      const shouldSubmit = isPastDue ? Math.random() < 0.92 : Math.random() < 0.75;

      if (shouldSubmit) {
        const isGraded = isPastDue ? Math.random() < 0.85 : Math.random() < 0.40;

        // Generate realistic scores with some variation
        const baseScore = 60 + Math.random() * 35; // 60-95 base
        const variation = (Math.random() - 0.5) * 20; // +/- 10
        const score = isGraded ? Math.min(100, Math.max(0, Math.round(baseScore + variation))) : null;

        const submission = await prisma.submission.create({
          data: {
            assignmentId: assignment.id,
            userId: student.id,
            content: assignment.title.includes("Quiz")
              ? `My answers:\n1. Answer A - Detailed explanation\n2. Answer B - With reasoning\n3. Answer C - Based on the material`
              : null,
            githubUrl: assignment.title.includes("Project")
              ? `https://github.com/${student.username}/${assignment.title.toLowerCase().replace(/\s+/g, "-")}`
              : null,
            status: isGraded ? "GRADED" : "SUBMITTED",
            score,
            feedback: isGraded && score
              ? score >= 90
                ? "Outstanding work! Your understanding of the concepts is excellent. Keep pushing boundaries!"
                : score >= 80
                ? "Great job! Solid understanding with minor areas for improvement."
                : score >= 70
                ? "Good effort! Review the feedback and continue practicing."
                : score >= 60
                ? "Passing grade. Consider revisiting the core concepts for deeper understanding."
                : "Needs improvement. Please schedule a 1-on-1 session to discuss."
              : null,
            gradedAt: isGraded ? randomDate(assignment.dueDate, new Date()) : null,
            gradedById: isGraded ? randomPick([instructor1.id, ta1.id, ta3.id]) : null,
            submittedAt: randomDate(
              new Date(assignment.dueDate.getTime() - 7 * 24 * 60 * 60000),
              isPastDue ? assignment.dueDate : new Date()
            ),
          },
        });

        // Add comments for some graded submissions
        if (isGraded && score && Math.random() < 0.3) {
          await prisma.comment.create({
            data: {
              submissionId: submission.id,
              userId: randomPick([instructor1.id, ta1.id]),
              content: score >= 80
                ? "Excellent approach! Consider exploring advanced techniques in this area."
                : "Good start. I recommend reviewing the documentation for best practices.",
            },
          });
        }
      }
    }
  }

  // Cohort 3 submissions
  for (const assignment of cohort3Assignments) {
    const isPastDue = assignment.dueDate < new Date();

    for (const student of cohort3Students.slice(0, 18)) { // Active students only
      const shouldSubmit = isPastDue ? Math.random() < 0.88 : Math.random() < 0.65;

      if (shouldSubmit) {
        const isGraded = isPastDue ? Math.random() < 0.75 : Math.random() < 0.25;
        const score = isGraded ? Math.floor(Math.random() * 40) + 55 : null; // 55-95

        await prisma.submission.create({
          data: {
            assignmentId: assignment.id,
            userId: student.id,
            content: assignment.title.includes("Quiz")
              ? `Quiz responses submitted.`
              : null,
            githubUrl: assignment.title.includes("Project")
              ? `https://github.com/${student.username}/${assignment.title.toLowerCase().replace(/\s+/g, "-")}`
              : null,
            status: isGraded ? "GRADED" : "SUBMITTED",
            score,
            feedback: isGraded && score
              ? score >= 80 ? "Great work!" : score >= 60 ? "Good job, keep improving!" : "Needs work."
              : null,
            gradedAt: isGraded ? randomDate(assignment.dueDate, new Date()) : null,
            gradedById: isGraded ? randomPick([instructor2.id, ta2.id]) : null,
            submittedAt: randomDate(
              new Date(assignment.dueDate.getTime() - 5 * 24 * 60 * 60000),
              isPastDue ? assignment.dueDate : new Date()
            ),
          },
        });
      }
    }
  }

  // Cohort 5 submissions (Data Analytics)
  const cohort5Assignments = allAssignments.filter(a => a.cohortId === cohort5.id);
  for (const assignment of cohort5Assignments) {
    const isPastDue = assignment.dueDate < new Date();

    for (const student of cohort5Students.slice(0, 16)) { // Active students only
      const shouldSubmit = isPastDue ? Math.random() < 0.90 : Math.random() < 0.70;

      if (shouldSubmit) {
        const isGraded = isPastDue ? Math.random() < 0.80 : Math.random() < 0.30;
        const score = isGraded ? Math.floor(Math.random() * 35) + 60 : null; // 60-95

        await prisma.submission.create({
          data: {
            assignmentId: assignment.id,
            userId: student.id,
            content: assignment.title.includes("Quiz")
              ? `Data Analytics quiz responses submitted with analysis explanations.`
              : null,
            githubUrl: assignment.title.includes("Project")
              ? `https://github.com/${student.username}/${assignment.title.toLowerCase().replace(/\s+/g, "-")}`
              : null,
            status: isGraded ? "GRADED" : "SUBMITTED",
            score,
            feedback: isGraded && score
              ? score >= 85 ? "Excellent analysis! Your visualizations are clear and insights are well-documented."
              : score >= 70 ? "Good work on the data analysis. Consider exploring additional visualization techniques."
              : "Review the core concepts and practice more with pandas/SQL."
              : null,
            gradedAt: isGraded ? randomDate(assignment.dueDate, new Date()) : null,
            gradedById: isGraded ? randomPick([instructor2.id, instructor3.id, ta3.id]) : null,
            submittedAt: randomDate(
              new Date(assignment.dueDate.getTime() - 5 * 24 * 60 * 60000),
              isPastDue ? assignment.dueDate : new Date()
            ),
          },
        });
      }
    }
  }
  console.log("Created submissions with grades and comments");

  // ==========================================
  // CREATE LESSON PROGRESS
  // ==========================================
  const moduleLessons = await prisma.lesson.findMany({
    orderBy: [{ moduleId: "asc" }, { order: "asc" }],
  });

  // Cohort 2 lesson progress (through module 4 - Web Dev)
  for (const student of cohort2Students) {
    for (let i = 0; i < moduleLessons.length; i++) {
      const moduleIndex = webDevModules.findIndex(m => m.id === moduleLessons[i].moduleId);

      // Only create progress for unlocked Web Dev modules (0-3 for cohort 2)
      if (moduleIndex === -1 || moduleIndex > 3) continue;

      let status: string;
      let progressChance: number;

      // Earlier modules have higher completion rates
      if (moduleIndex === 0) progressChance = 0.95;
      else if (moduleIndex === 1) progressChance = 0.88;
      else if (moduleIndex === 2) progressChance = 0.75;
      else progressChance = 0.50;

      if (Math.random() < progressChance) {
        status = "COMPLETED";
      } else if (Math.random() < 0.7) {
        status = "IN_PROGRESS";
      } else {
        status = "NOT_STARTED";
      }

      await prisma.lessonProgress.create({
        data: {
          userId: student.id,
          lessonId: moduleLessons[i].id,
          status,
          startedAt: status !== "NOT_STARTED" ? randomDate(cohort2StartDate, new Date()) : null,
          completedAt: status === "COMPLETED" ? randomDate(cohort2StartDate, new Date()) : null,
        },
      });
    }
  }

  // Cohort 3 lesson progress (through module 2 - Web Dev)
  for (const student of cohort3Students.slice(0, 18)) {
    for (let i = 0; i < moduleLessons.length; i++) {
      const moduleIndex = webDevModules.findIndex(m => m.id === moduleLessons[i].moduleId);

      // Only create progress for first 2 Web Dev modules
      if (moduleIndex === -1 || moduleIndex > 1) continue;

      let status: string;
      const progressChance = moduleIndex === 0 ? 0.90 : 0.60;

      if (Math.random() < progressChance) {
        status = "COMPLETED";
      } else if (Math.random() < 0.6) {
        status = "IN_PROGRESS";
      } else {
        status = "NOT_STARTED";
      }

      await prisma.lessonProgress.create({
        data: {
          userId: student.id,
          lessonId: moduleLessons[i].id,
          status,
          startedAt: status !== "NOT_STARTED" ? randomDate(cohort3StartDate, new Date()) : null,
          completedAt: status === "COMPLETED" ? randomDate(cohort3StartDate, new Date()) : null,
        },
      });
    }
  }

  // Cohort 5 lesson progress (through module 3 - Data Analytics)
  for (const student of cohort5Students.slice(0, 16)) {
    for (let i = 0; i < moduleLessons.length; i++) {
      const moduleIndex = dataAnalyticsModules.findIndex(m => m.id === moduleLessons[i].moduleId);

      // Only create progress for first 3 Data Analytics modules
      if (moduleIndex === -1 || moduleIndex > 2) continue;

      let status: string;
      let progressChance: number;

      if (moduleIndex === 0) progressChance = 0.92;
      else if (moduleIndex === 1) progressChance = 0.80;
      else progressChance = 0.55;

      if (Math.random() < progressChance) {
        status = "COMPLETED";
      } else if (Math.random() < 0.65) {
        status = "IN_PROGRESS";
      } else {
        status = "NOT_STARTED";
      }

      await prisma.lessonProgress.create({
        data: {
          userId: student.id,
          lessonId: moduleLessons[i].id,
          status,
          startedAt: status !== "NOT_STARTED" ? randomDate(cohort5StartDate, new Date()) : null,
          completedAt: status === "COMPLETED" ? randomDate(cohort5StartDate, new Date()) : null,
        },
      });
    }
  }
  console.log("Created lesson progress records for cohorts 2, 3, 5");

  // ==========================================
  // CREATE CONVERSATIONS AND MESSAGES
  // ==========================================

  // Create direct conversations between students and staff
  const conversationsCreated: string[] = [];

  // Student-instructor conversations
  for (let i = 0; i < 15; i++) {
    const student = cohort2Students[i];
    const staff = i % 2 === 0 ? instructor1 : ta1;

    const conversation = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        createdById: student.id,
      },
    });
    conversationsCreated.push(conversation.id);

    // Add participants
    await prisma.conversationParticipant.createMany({
      data: [
        { conversationId: conversation.id, userId: student.id, role: "MEMBER" },
        { conversationId: conversation.id, userId: staff.id, role: "MEMBER" },
      ],
    });

    // Generate realistic message exchange
    const messageCount = Math.floor(Math.random() * 8) + 3; // 3-10 messages
    const now = new Date();
    // Start conversation 5-30 days ago to ensure messages don't exceed current time
    const daysAgo = 5 + Math.floor(Math.random() * 25);
    const conversationStart = new Date(now.getTime() - daysAgo * 24 * 60 * 60000);

    let currentTime = conversationStart;
    for (let j = 0; j < messageCount; j++) {
      const isStudentMessage = j % 2 === 0;
      const sender = isStudentMessage ? student : staff;

      let content: string;
      if (j === 0) {
        content = randomPick(messageTemplates.greetings) + " " + randomPick(messageTemplates.questions);
      } else if (isStudentMessage) {
        content = Math.random() < 0.3
          ? randomPick(messageTemplates.questions)
          : randomPick(messageTemplates.followups);
      } else {
        content = randomPick(messageTemplates.responses) + " " +
          (Math.random() < 0.4 ? randomPick(messageTemplates.encouragement) : "");
      }

      // Ensure message time doesn't exceed current time (leave 1 hour buffer)
      const maxTime = new Date(now.getTime() - 60 * 60000);
      if (currentTime > maxTime) {
        currentTime = maxTime;
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: sender.id,
          content,
          contentType: "TEXT",
          createdAt: currentTime,
        },
      });

      // Advance time by 1-24 hours
      currentTime = new Date(currentTime.getTime() + Math.random() * 24 * 60 * 60000);
    }
  }

  // Student-to-student conversations
  for (let i = 0; i < 10; i++) {
    const student1 = cohort2Students[i * 2];
    const student2 = cohort2Students[i * 2 + 1];

    const conversation = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        createdById: student1.id,
      },
    });
    conversationsCreated.push(conversation.id);

    await prisma.conversationParticipant.createMany({
      data: [
        { conversationId: conversation.id, userId: student1.id, role: "MEMBER" },
        { conversationId: conversation.id, userId: student2.id, role: "MEMBER" },
      ],
    });

    const messageCount = Math.floor(Math.random() * 6) + 2;
    const now = new Date();
    // Start conversation 3-20 days ago
    const daysAgo = 3 + Math.floor(Math.random() * 17);
    let currentTime = new Date(now.getTime() - daysAgo * 24 * 60 * 60000);

    for (let j = 0; j < messageCount; j++) {
      const sender = j % 2 === 0 ? student1 : student2;
      const content = j === 0
        ? randomPick(messageTemplates.greetings) + " " + randomPick(messageTemplates.questions)
        : randomPick(messageTemplates.responses);

      // Ensure message time doesn't exceed current time (leave 1 hour buffer)
      const maxTime = new Date(now.getTime() - 60 * 60000);
      if (currentTime > maxTime) {
        currentTime = maxTime;
      }

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: sender.id,
          content,
          contentType: "TEXT",
          createdAt: currentTime,
        },
      });

      currentTime = new Date(currentTime.getTime() + Math.random() * 12 * 60 * 60000);
    }
  }
  console.log(`Created ${conversationsCreated.length} conversations with messages`);

  // ==========================================
  // CREATE ANNOUNCEMENTS
  // ==========================================
  const announcements = [
    // Cohort 2 announcements
    {
      cohortId: cohort2.id,
      createdById: admin1.id,
      title: "Happy New Year 2026!",
      content: "Wishing everyone a fantastic 2026! Let's make this year your breakthrough in tech. The bootcamp resumes January 6th. See you all soon!",
      priority: "HIGH",
      isPinned: true,
      publishedAt: new Date("2026-01-01T00:00:00"),
    },
    {
      cohortId: cohort2.id,
      createdById: instructor1.id,
      title: "Week 8 Schedule Update",
      content: "This week we're diving deep into TypeScript with Next.js! Make sure you've completed the JavaScript module projects. Office hours are available Tuesday and Thursday 6-8 PM.",
      priority: "NORMAL",
      isPinned: false,
      publishedAt: new Date("2026-01-06T08:00:00"),
    },
    {
      cohortId: cohort2.id,
      createdById: ta1.id,
      title: "Project Submission Reminder",
      content: "The React Development project is due this Friday. Please submit your GitHub links before 11:59 PM. Late submissions will incur a 10% penalty per day.",
      priority: "URGENT",
      isPinned: true,
      publishedAt: new Date("2026-01-07T09:00:00"),
    },
    // Cohort 3 announcements
    {
      cohortId: cohort3.id,
      createdById: admin1.id,
      title: "Welcome Back from the Holidays!",
      content: "Hope everyone had a restful break. Week 4 begins with JavaScript deep dive. Let's tackle arrays, objects, and async programming together!",
      priority: "HIGH",
      isPinned: true,
      publishedAt: new Date("2026-01-06T07:00:00"),
    },
    {
      cohortId: cohort3.id,
      createdById: instructor2.id,
      title: "Study Group Sessions Available",
      content: "We're organizing study groups for the upcoming JavaScript assessments. Sign up sheet is in the Cavite center. Virtual option available via Zoom.",
      priority: "NORMAL",
      isPinned: false,
      publishedAt: new Date("2026-01-07T10:00:00"),
    },
    // Cohort 4 announcements
    {
      cohortId: cohort4.id,
      createdById: admin1.id,
      title: "Welcome to Batch 4 - Bacolod!",
      content: "Congratulations on being selected for DOGM.AI Batch 4! Your journey to becoming a full-stack developer begins February 16, 2026. Pre-bootcamp materials will be shared next week.",
      priority: "HIGH",
      isPinned: true,
      publishedAt: new Date("2026-01-05T12:00:00"),
    },
    {
      cohortId: cohort4.id,
      createdById: instructor3.id,
      title: "Orientation Date Announced",
      content: "Online orientation will be held on February 10, 2026 at 7:00 PM via Zoom. Attendance is mandatory. Calendar invite coming soon!",
      priority: "URGENT",
      isPinned: true,
      publishedAt: new Date("2026-01-07T14:00:00"),
    },
    // Cohort 5 announcements (Data Analytics)
    {
      cohortId: cohort5.id,
      createdById: admin1.id,
      title: "Welcome Data Analytics Cohort!",
      content: "Congratulations on joining our first Data Analytics batch! You're pioneers in our new track. Let's master Python, SQL, and business intelligence together!",
      priority: "HIGH",
      isPinned: true,
      publishedAt: new Date("2025-12-01T09:00:00"),
    },
    {
      cohortId: cohort5.id,
      createdById: instructor2.id,
      title: "Week 5 Focus: Data Visualization",
      content: "This week we're diving into matplotlib, seaborn, and Plotly! Make sure to complete the Python pandas exercises before class. Bring your laptops charged!",
      priority: "NORMAL",
      isPinned: false,
      publishedAt: new Date("2026-01-06T08:30:00"),
    },
    {
      cohortId: cohort5.id,
      createdById: ta3.id,
      title: "Data Visualization Project Due",
      content: "Your visualization project analyzing the e-commerce dataset is due this Friday. Remember to include at least 5 different chart types and a written analysis!",
      priority: "URGENT",
      isPinned: true,
      publishedAt: new Date("2026-01-07T10:00:00"),
    },
    // Cohort 6 announcements (Data Analytics - Upcoming)
    {
      cohortId: cohort6.id,
      createdById: admin1.id,
      title: "Welcome to Data Analytics Batch 2!",
      content: "Excited to have you join our second Data Analytics cohort in Manila! Your journey into data science begins March 2, 2026. Pre-work materials coming soon.",
      priority: "HIGH",
      isPinned: true,
      publishedAt: new Date("2026-01-06T11:00:00"),
    },
  ];

  for (const announcement of announcements) {
    await prisma.announcement.create({ data: announcement });
  }
  console.log("Created announcements for all cohorts");

  // ==========================================
  // CREATE NOTIFICATIONS
  // ==========================================
  // Assignment due notifications
  for (const student of cohort2Students.slice(0, 15)) {
    await prisma.notification.create({
      data: {
        userId: student.id,
        type: "ASSIGNMENT_DUE",
        title: "Assignment Due Soon",
        message: "React Development - Project is due in 3 days. Don't forget to submit!",
        link: "/student/assignments",
        isRead: Math.random() > 0.5,
        createdAt: new Date("2026-01-07T08:00:00"),
      },
    });
  }

  // Graded submission notifications
  const recentGradedSubmissions = await prisma.submission.findMany({
    where: { status: "GRADED", gradedAt: { gte: new Date("2026-01-01") } },
    include: { assignment: true, user: true },
    take: 20,
  });

  for (const submission of recentGradedSubmissions) {
    await prisma.notification.create({
      data: {
        userId: submission.userId,
        type: "SUBMISSION_GRADED",
        title: "Assignment Graded",
        message: `Your submission for "${submission.assignment.title}" has been graded. Score: ${submission.score}/${submission.assignment.maxPoints}`,
        link: `/student/assignments/${submission.assignmentId}`,
        isRead: Math.random() > 0.4,
        createdAt: submission.gradedAt || new Date(),
      },
    });
  }

  // Announcement notifications
  for (const student of [...cohort2Students, ...cohort3Students.slice(0, 18), ...cohort5Students.slice(0, 16)]) {
    await prisma.notification.create({
      data: {
        userId: student.id,
        type: "ANNOUNCEMENT",
        title: "New Announcement",
        message: "Happy New Year 2026! - Check the latest announcements for important updates.",
        link: "/student/announcements",
        isRead: Math.random() > 0.3,
        createdAt: new Date("2026-01-01T00:30:00"),
      },
    });
  }

  // Staff notifications
  const pendingSubmissions = await prisma.submission.findMany({
    where: { status: "SUBMITTED" },
    include: { assignment: true, user: true },
    take: 10,
  });

  for (const submission of pendingSubmissions) {
    const staffMember = submission.assignment.cohortId === cohort2.id ? instructor1 : instructor2;
    await prisma.notification.create({
      data: {
        userId: staffMember.id,
        type: "SYSTEM",
        title: "New Submission Pending",
        message: `${submission.user.displayName} submitted "${submission.assignment.title}" - Awaiting grading`,
        link: "/staff/grading",
        isRead: false,
        createdAt: submission.submittedAt,
      },
    });
  }
  console.log("Created notifications");

  // ==========================================
  // CREATE SYSTEM SETTINGS
  // ==========================================
  await prisma.setting.createMany({
    data: [
      { key: "site_name", value: "DOGM.AI Bootcamp", type: "string", category: "general" },
      { key: "site_description", value: "The Philippines' First AI-Native Coding Bootcamp", type: "string", category: "general" },
      { key: "enrollment_open", value: "true", type: "boolean", category: "enrollment" },
      { key: "max_file_upload_size", value: "10", type: "number", category: "general" },
      { key: "late_submission_penalty", value: "10", type: "number", category: "grading" },
      { key: "passing_score_default", value: "60", type: "number", category: "grading" },
      { key: "maintenance_mode", value: "false", type: "boolean", category: "general" },
      { key: "support_email", value: "support@dogm.ai", type: "string", category: "general" },
      { key: "timezone", value: "Asia/Manila", type: "string", category: "general" },
    ],
  });
  console.log("Created system settings");

  // ==========================================
  // CREATE AUDIT LOGS
  // ==========================================
  await prisma.auditLog.createMany({
    data: [
      { userId: admin1.id, action: "LOGIN", entity: "User", entityId: admin1.id, createdAt: new Date("2026-01-06T08:30:00") },
      { userId: instructor1.id, action: "LOGIN", entity: "User", entityId: instructor1.id, createdAt: new Date("2026-01-07T07:45:00") },
      { userId: admin1.id, action: "UPDATE", entity: "Setting", details: JSON.stringify({ key: "enrollment_open", value: "true" }), createdAt: new Date("2026-01-05T10:00:00") },
      { userId: instructor1.id, action: "CREATE", entity: "Announcement", details: JSON.stringify({ title: "Week 8 Schedule Update" }), createdAt: new Date("2026-01-06T08:00:00") },
    ],
  });
  console.log("Created audit logs");

  // ==========================================
  // SUMMARY
  // ==========================================
  console.log("\n" + "=".repeat(70));
  console.log("DATABASE SEEDING COMPLETED - 2026 SIMULATION!");
  console.log("=".repeat(70));

  console.log("\nWEB DEVELOPMENT TRACK COHORTS:");
  console.log("  - Batch 1 (Manila 2025): Sept 15 - Dec 7, 2025 [COMPLETED]");
  console.log("    20 students graduated | All modules completed");
  console.log("  - Batch 2 (Manila): Nov 10, 2025 - Feb 1, 2026 [ACTIVE - Week 8]");
  console.log("    25 students | Modules 1-4 unlocked | ~40 sessions completed");
  console.log("  - Batch 3 (Cavite): Dec 8, 2025 - Mar 1, 2026 [ACTIVE - Week 4]");
  console.log("    20 students (2 on hold) | Modules 1-2 unlocked | ~20 sessions completed");
  console.log("  - Batch 4 (Bacolod): Feb 16 - May 9, 2026 [UPCOMING]");
  console.log("    7 students enrolled | Enrollment open");

  console.log("\nDATA ANALYTICS TRACK COHORTS:");
  console.log("  - DA Batch 1 (Cebu): Dec 1, 2025 - Feb 22, 2026 [ACTIVE - Week 5]");
  console.log("    18 students (2 on hold) | Modules 1-3 unlocked | ~25 sessions completed");
  console.log("  - DA Batch 2 (Manila): Mar 2 - May 23, 2026 [UPCOMING]");
  console.log("    10 students enrolled | Enrollment open");

  console.log("\nCURRICULUM:");
  console.log("  - 12 modules total (6 Web Dev + 6 Data Analytics)");
  console.log("  - 120 detailed lessons with content");
  console.log("  - 360 sessions scheduled/completed across all cohorts");

  console.log("\nDATA SIMULATED:");
  console.log("  - Attendance records for active cohorts (2, 3, 5)");
  console.log("  - Submissions with grades and feedback");
  console.log("  - Lesson progress tracking");
  console.log("  - 25+ conversations with realistic messages");
  console.log("  - Announcements and notifications");

  console.log("\nTEST CREDENTIALS:");
  console.log("-".repeat(70));
  console.log("ADMINS:");
  console.log("  admin@dogm.ai          / Admin123!");
  console.log("  director@dogm.ai       / Admin123!");
  console.log("\nSTAFF:");
  console.log("  john.instructor@dogm.ai    / Staff123! (Web Dev Batch 1 & 2)");
  console.log("  carlos.instructor@dogm.ai  / Staff123! (Web Dev Batch 3 + DA Batch 1)");
  console.log("  anna.instructor@dogm.ai    / Staff123! (Web Dev Batch 4 + DA Batches)");
  console.log("  maria.ta@dogm.ai           / Staff123! (Web Dev Batch 1 & 2 + DA Batch 2)");
  console.log("  elena.ta@dogm.ai           / Staff123! (Web Dev Batch 3 & 4)");
  console.log("  miguel.ta@dogm.ai          / Staff123! (Web Dev Batch 2 + DA Batch 1)");
  console.log("\nSTUDENTS (100 total):");
  console.log("  student1-20@email.com    / Student123! (Web Dev Batch 1 - Completed)");
  console.log("  student21-45@email.com   / Student123! (Web Dev Batch 2 - Active)");
  console.log("  student46-65@email.com   / Student123! (Web Dev Batch 3 - Active)");
  console.log("  student66-72@email.com   / Student123! (Web Dev Batch 4 - Upcoming)");
  console.log("  student73-90@email.com   / Student123! (DA Batch 1 - Active)");
  console.log("  student91-100@email.com  / Student123! (DA Batch 2 - Upcoming)");
  console.log("-".repeat(70));
  console.log("\nCurrent simulation date: January 7, 2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
