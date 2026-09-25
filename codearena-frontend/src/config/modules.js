/**
 * Every practice module on the platform. The nav, the home page and access rules all read from here,
 * so adding a module = one entry here + its feature folder + one route in app/routes.jsx.
 *
 * shortLabel: used in the phone tab bar (keep it ≤ 8 characters)
 * icon: key into app/navIcons.js
 * status: "live" | "coming-soon"
 * access: "free" | "paid"   (paid modules need an entitlement when the paywall is on)
 * share: the link preview for this module's URL (LinkedIn, WhatsApp, X, Slack). vite.config.js writes a
 *        page per module with these tags at build time, because link-preview crawlers don't run JavaScript.
 *        `text` is the message used by the phone's native share sheet. Images are 1200 × 627 PNGs in public/
 *        (regenerate them with `python3 scripts/og-images.py`).
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
    share: {
      title: "DSA 200: the LeetCode problems that crack Tier 2 coding rounds",
      description: "200 problems in 17 patterns, ordered the way you should learn them. Core problems first, daily goal and streak. Free.",
      pageDescription: "Free: the 200 LeetCode problems that crack Tier 2 coding rounds at companies like Swiggy, Flipkart and Razorpay. 17 patterns in study order, 96 Core problems first, daily goal and streak.",
      image: "/og-image.png",
      imageAlt: "DSA 200 by CodeArena: 200 LeetCode problems grouped by pattern",
      text: "DSA 200: 200 LeetCode problems grouped by pattern for product-company interviews. Free.",
    },
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
    share: {
      title: "System Design: 100 HLD and LLD questions for Tier 2 design rounds",
      description: "50 high-level design and 50 machine-coding questions with what to cover, the follow-up twist interviewers add, and a 10-week plan.",
      pageDescription: "Prepare for system design interviews: 50 HLD and 50 LLD / machine-coding questions with what to cover, follow-up twists, answer frameworks and a 10-week plan.",
      image: "/og/system-design.png",
      imageAlt: "System Design by CodeArena: 100 HLD and LLD interview questions",
      text: "System Design on CodeArena: 100 HLD and LLD interview questions with what to cover and the follow-ups interviewers add.",
    },
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
    share: {
      title: "Node.js 100: the backend interview questions asked most",
      description: "The event loop, streams, scaling, security and production: write your answer, then compare it with an in-depth model answer.",
      pageDescription: "The 100 Node.js questions backend interviewers ask most, with in-depth model answers, code, common mistakes and interviewer follow-ups.",
      image: "/og/nodejs.png",
      imageAlt: "Node.js 100 by CodeArena: the 100 most-asked Node.js interview questions",
      text: "Node.js 100 on CodeArena: the backend interview questions asked most, with in-depth model answers.",
    },
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
    share: {
      title: "SQL for backend interviews: write-the-query questions and MySQL concepts",
      description: "60 query questions from GROUP BY to window functions, plus 72 MySQL concepts: transactions, indexing, scaling and Sequelize.",
      pageDescription: "Practise the SQL round: 60 write-the-query questions like Tier 2 coding rounds and 72 MySQL concepts backend interviewers ask, with model answers.",
      image: "/og/sql.png",
      imageAlt: "SQL by CodeArena: query questions and MySQL concepts for backend interviews",
      text: "SQL on CodeArena: 60 write-the-query questions and 72 MySQL concepts for backend interviews.",
    },
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
    highlights: ["164 in-depth lessons and build guides, beginner to advanced", "250+ hands-on practice exercises, plus 740+ interview questions with answers", "Your own revision notes, 3 portfolio projects and a deployed capstone"],
    share: {
      title: "GenAI 20-Day Sprint: from JavaScript developer to GenAI developer",
      description: "Python for JS devs, how LLMs work, RAG from scratch, LangChain, agents and MCP. 160+ lessons, 250+ exercises and 740+ interview questions.",
      pageDescription: "A 20-day plan for MERN and JavaScript developers moving into GenAI roles: Python, LLMs, RAG, LangChain, agents, MCP and deployment, with hands-on exercises and interview questions.",
      image: "/og/genai.png",
      imageAlt: "GenAI 20-Day Sprint by CodeArena: from JavaScript developer to GenAI developer",
      text: "GenAI 20-Day Sprint on CodeArena: a JavaScript developer's path to GenAI roles. Python, LLMs, RAG, LangChain and agents.",
    },
  },
];

export const getModule = (id) => MODULES.find((m) => m.id === id) || null;
