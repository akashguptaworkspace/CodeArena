/**
 * Every practice module on the platform. The nav, the home page and access rules all read from here,
 * so adding a module = one entry here + its feature folder + one route in app/routes.jsx.
 *
 * shortLabel: used in the phone tab bar (keep it ≤ 8 characters)
 * icon: key into app/navIcons.js
 * status: "live" | "coming-soon"
 * access: "free" | "paid"   (paid modules need an entitlement when the paywall is on)
 */
export const MODULES = [
  {
    id: "dsa",
    shortLabel: "DSA",
    icon: "code",
    title: "DSA 200",
    path: "/dsa",
    status: "live",
    access: "free",
    summary: "200 LeetCode problems grouped by pattern, in study order, with a daily goal and streak.",
    highlights: ["17 topics from arrays to DP", "96 Core problems to do first", "Daily goal, streak and activity"],
  },
  {
    id: "system-design",
    shortLabel: "Design",
    icon: "layers",
    title: "System Design",
    path: "/system-design",
    status: "live",
    access: "paid",
    priceInr: 200,
    summary: "50 HLD and 50 LLD / machine-coding questions with what to cover, follow-up twists and a 10-week plan.",
    highlights: ["Studied → Practised → Interview-ready tracking", "Follow-up twist for every question", "Answer frameworks and practice guide"],
  },
  {
    id: "nodejs",
    shortLabel: "Node.js",
    icon: "hexagon",
    title: "Node.js 100",
    path: "/nodejs",
    status: "live",
    access: "paid",
    priceInr: 200,
    summary: "The 100 Node.js questions backend interviewers ask most: write your answer, then compare it with an in-depth model answer.",
    highlights: ["Event loop, streams, scaling, security, production", "Model answers with code and common mistakes", "Self-check score and interviewer follow-ups"],
  },
  {
    id: "sql",
    shortLabel: "SQL",
    icon: "database",
    title: "SQL",
    path: "/sql",
    status: "live",
    access: "paid",
    priceInr: 200,
    summary: "Write-the-query questions like tier 2 coding rounds, plus the MySQL concepts backend interviewers ask.",
    highlights: ["60 query questions, from GROUP BY to window functions", "72 concepts: transactions, indexing, scaling, Sequelize", "Model queries with edge cases and LeetCode practice links"],
  },
  {
    id: "genai",
    shortLabel: "GenAI",
    icon: "sparkles",
    title: "GenAI 20-Day Sprint",
    path: "/genai",
    status: "live",
    access: "paid",
    priceInr: 200,
    summary: "A 20-day plan from MERN developer to GenAI developer: Python, LLMs, RAG, agents, MCP and deployment, with interview drills.",
    highlights: ["124 in-depth lessons and build guides, beginner to advanced", "170 hands-on practice exercises with solutions and concept notes", "Your own revision notes, 3 portfolio projects and a deployed capstone"],
  },
];

export const getModule = (id) => MODULES.find((m) => m.id === id) || null;
