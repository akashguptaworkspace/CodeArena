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
    status: "coming-soon",
    access: "paid",
    priceInr: 200,
    summary: "The 100 most-asked Node.js interview questions, with short model answers and coding tasks you solve in the browser.",
    highlights: ["Event loop, streams, clustering, security", "Hands-on tasks with automatic tests", "Explain-it-out-loud answer checklists"],
  },
  {
    id: "mysql",
    shortLabel: "MySQL",
    icon: "database",
    title: "MySQL 100",
    path: "/mysql",
    status: "coming-soon",
    access: "paid",
    priceInr: 200,
    summary: "100 SQL interview questions you solve against a real database in the browser, from joins to window functions.",
    highlights: ["Runs real SQL in your browser", "Instant check against the expected result", "Indexes, transactions and query tuning"],
  },
];

export const getModule = (id) => MODULES.find((m) => m.id === id) || null;
