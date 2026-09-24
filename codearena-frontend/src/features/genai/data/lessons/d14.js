// Day 14: Ship Project 2, resume, start applying. Shape: see ./index.js
export default {
  "resume-bullets": {
    minutes: 45,
    level: "Beginner",
    intro:
      "Recruiters spend seconds on a resume, and ATS software filters many before a human sees them. Strong GenAI resume bullets show **what you built, how, and the measured result**. You now have real numbers from your evals and benchmarks; this lesson turns them into bullets.",
    sections: [
      {
        h: "The formula",
        blocks: [
          {
            lang: "text",
            code: `Action verb + what you built + key technique/stack + measurable result`,
          },
          {
            table: {
              head: ["Weak", "Strong"],
              rows: [
                ["Made a chatbot using LangChain and OpenAI.", "Built a RAG document assistant (FastAPI, pgvector, Next.js) with hybrid search and cross-encoder reranking, raising retrieval hit rate@5 from 0.72 to 0.90 on a 30-question eval set."],
                ["Worked on AI agents.", "Developed a LangGraph agent that answers business questions over Postgres via a custom MCP server, with human approval for write actions and Langfuse tracing; blocked 10/10 red-team prompt-injection cases."],
                ["Reduced costs.", "Cut LLM cost per 1,000 queries by 44% and p95 latency by 33% using prompt caching, a scoped response cache and model routing, with no drop in answer accuracy."],
              ],
            },
          },
          {
            warn: "Only write numbers you actually measured, and be ready to explain how. Interviewers will ask \"how did you measure 0.90?\", and a clear answer about your eval set is impressive. A made-up number is a disaster.",
          },
        ],
      },
      {
        h: "Resume structure for a MERN → GenAI switch",
        blocks: [
          {
            list: [
              "**Headline:** \"Full-Stack & GenAI Engineer — Python, FastAPI, RAG, LangGraph, React/Node\".",
              "**Summary (2 lines):** years of full-stack experience + what you now build with LLMs.",
              "**Skills,** grouped: GenAI (RAG, agents, MCP, evals, prompt engineering) · LLM tools (OpenAI, Claude, Gemini APIs, LangChain, LangGraph, LlamaIndex) · Backend (Python, FastAPI, Node.js, Express) · Data (PostgreSQL + pgvector, MongoDB, Qdrant, Redis) · Frontend (React, Next.js) · Cloud (AWS, Docker, CI/CD).",
              "**Projects** (for a career switch these go above or right next to experience): DocChat, Agentic assistant, fine-tuned model, capstone. Each with 2–3 bullets, a live link and a GitHub link.",
              "**Experience:** your MERN roles, rewritten to highlight backend, APIs, scale, performance and any AI-adjacent work (search, automation, integrations).",
              "One page if you have under ~6 years of experience. Plain layout, no tables or columns that confuse ATS parsers.",
            ],
          },
          {
            tip: "Your MERN experience is a strength, not something to hide. Many GenAI teams struggle to ship production apps; \"I build the whole product, not just the notebook\" is a real differentiator.",
          },
        ],
      },
    ],
    revise: [
      "Bullet = action verb + what + technique/stack + measured result.",
      "Only measured numbers; be ready to explain the method.",
      "Headline and grouped skills; projects prominent with live and GitHub links; MERN experience framed as strength.",
      "One page, ATS-friendly plain layout.",
    ],
    interview: [
      {
        q: "Tell me about a GenAI project you built.",
        a: "Use a short structure: the problem and user; the architecture (e.g. ingestion, hybrid retrieval with reranking, streaming FastAPI + Next.js); the hardest challenge and how you solved it (e.g. poor retrieval on exact codes, fixed with hybrid search); how you measured quality (eval set, hit rate, faithfulness); the results; and what you'd do next. Keep it around 2–3 minutes and invite deeper questions.",
      },
    ],
    practice: [
      "Write 3 bullets each for DocChat and Project 2 using your real numbers.",
    ],
  },

  keywords: {
    minutes: 30,
    level: "Beginner",
    intro:
      "Recruiters and ATS systems search for specific terms. If your resume says \"AI chatbot\" but the job description says \"RAG, vector database, LangChain\", you may never be seen. Match the vocabulary honestly: use the standard names for things you've actually done.",
    sections: [
      {
        h: "Keywords that appear in GenAI job descriptions",
        blocks: [
          {
            table: {
              head: ["Area", "Keywords"],
              rows: [
                ["Core", "Generative AI, LLM, RAG (Retrieval-Augmented Generation), prompt engineering, AI agents, agentic workflows"],
                ["Frameworks", "LangChain, LangGraph, LlamaIndex, OpenAI Agents SDK, CrewAI, Hugging Face Transformers"],
                ["Models / APIs", "OpenAI API, Claude / Anthropic API, Gemini, Llama, Mistral, Azure OpenAI, AWS Bedrock"],
                ["Retrieval", "Vector database, embeddings, semantic search, hybrid search, reranking, pgvector, Pinecone, Qdrant, Chroma, FAISS, Elasticsearch/OpenSearch"],
                ["Quality & ops", "Evaluation (RAGAS), LLM observability (Langfuse, LangSmith), guardrails, LLMOps, prompt caching"],
                ["Advanced", "Fine-tuning, LoRA/QLoRA, PEFT, quantization, vLLM, Ollama, MCP (Model Context Protocol), multimodal"],
                ["Engineering", "Python, FastAPI, REST APIs, async, Docker, Kubernetes, AWS, CI/CD, PostgreSQL, Redis, microservices"],
              ],
            },
          },
        ],
      },
      {
        h: "How to use them",
        blocks: [
          {
            list: [
              "Read 10 job descriptions for roles you want; note the terms that repeat. Tailor your summary and skills to each application (a few minutes each).",
              "Write the full form once, then the short form: \"Retrieval-Augmented Generation (RAG)\".",
              "Put keywords inside achievement bullets, not only in a skills list. \"Built a RAG pipeline with pgvector\" is stronger than \"Skills: RAG, pgvector\".",
              "Don't list anything you can't discuss for 5 minutes. Interviewers pick items from your resume and go deep.",
              "Mirror the job title where it's honest: \"GenAI Engineer\", \"AI Engineer\", \"LLM Engineer\", \"AI/ML Developer\" are all used for similar roles in India.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Match the standard vocabulary: RAG, vector DB, LangChain/LangGraph, agents, MCP, evals, FastAPI, AWS Bedrock.",
      "Tailor per application from 10 real job descriptions.",
      "Keywords inside achievement bullets; only list what you can discuss deeply.",
    ],
    interview: [
      {
        q: "Why should we hire a MERN developer for a GenAI role?",
        a: "Most GenAI work in product teams is software engineering around models: APIs, data pipelines, streaming UIs, auth, reliability, cost control and deployment. I bring years of shipping full-stack products, and I've built and evaluated RAG and agent systems end to end, with measurable results. I can take a feature from prototype to production without hand-offs.",
      },
    ],
    practice: [
      "Collect 10 job descriptions and build a frequency list of the top 20 terms. Check your resume against it.",
    ],
  },

  "agent-ship": {
    minutes: 240,
    level: "Intermediate",
    intro:
      "Finish and ship Project 2: a polished README, an architecture diagram, a demo video and a live deployment. A project that's deployed and documented counts far more than a more complex one that isn't.",
    sections: [
      {
        h: "README structure",
        blocks: [
          {
            lang: "markdown",
            code: `# ShopPilot: an agentic business assistant

> Ask questions about your shop's data in plain English. Approve changes before they happen.

**Live demo:** https://...   **Video (2 min):** https://...

## What it does
- Answers analytics questions over Postgres ("top products in Maharashtra this quarter")
- Proposes changes (ticket status, discounts) that a human approves
- Streams progress and remembers conversations

## Architecture
(diagram) Next.js → FastAPI (SSE) → LangGraph agent → MCP server → Postgres (read-only role)
                                   ↘ Langfuse tracing   ↘ approval interrupts (checkpointed)

## Engineering highlights
- Custom MCP server; also works in Claude Desktop
- Human-in-the-loop approvals with LangGraph interrupts + Postgres checkpointer
- Guardrails: topic filter, PII masking, untrusted-content wrapping, grounded-number check
- Results: 17/20 correct on eval set; 10/10 red-team cases blocked; p95 7.9 s; $2.30 / 1k questions

## Run locally
docker compose up ...

## What I'd do next`,
          },
          "Generate the diagram with `graph.get_graph().draw_mermaid()` plus a simple system diagram (Excalidraw or Mermaid). GitHub renders Mermaid in Markdown.",
        ],
      },
      {
        h: "Deploy",
        blocks: [
          {
            list: [
              "Same stack as DocChat: managed Postgres, backend container on Render/Railway/Fly, frontend on Vercel.",
              "Seed a demo database with fake shop data, and a demo login.",
              "Protect it: rate limits, token budgets, and approvals that only affect the demo data.",
            ],
          },
        ],
      },
      {
        h: "Demo video",
        blocks: [
          "Two minutes: ask an analytics question (show streaming steps), ask a follow-up (memory), request a discount (show the approval card, approve it), show one blocked prompt-injection attempt, then the Langfuse trace. End with the results table.",
        ],
      },
    ],
    revise: [
      "README: one-line pitch, live + video links, features, architecture diagram, engineering highlights with numbers, run instructions, next steps.",
      "Deploy with seeded demo data and protections.",
      "Video shows streaming, memory, approval, a blocked attack and tracing.",
    ],
    practice: [
      "Ask someone to read only your README for 60 seconds, then explain your project back to you. Fix whatever they got wrong.",
    ],
  },

  resume: {
    minutes: 120,
    level: "Beginner",
    intro:
      "Rewrite your resume and profiles for GenAI roles. Your projects and numbers are ready; today they go on the page and online.",
    sections: [
      {
        h: "Resume checklist",
        blocks: [
          {
            list: [
              "Headline: \"Full-Stack & GenAI Engineer\" (or the title your target roles use).",
              "Summary: 2 lines combining your full-stack years and GenAI work.",
              "Projects: DocChat and ShopPilot, each with 2–3 measured bullets and links. Add the fine-tuning and capstone projects later.",
              "Experience bullets rewritten with impact (performance, scale, users, revenue) and any automation or AI-adjacent work.",
              "Skills grouped as in the lesson; nothing you can't discuss.",
              "Export as PDF; check it with an ATS-style parser (copy the text out of the PDF; if the order is scrambled, simplify the layout).",
              "Filename: `Firstname-Lastname-GenAI-Engineer.pdf`.",
            ],
          },
        ],
      },
      {
        h: "LinkedIn and Naukri",
        blocks: [
          {
            table: {
              head: ["Field", "What to write"],
              rows: [
                ["LinkedIn headline", "Full-Stack & GenAI Engineer | RAG · LangGraph · FastAPI · React | Building production LLM apps"],
                ["LinkedIn About", "3 short paragraphs: what you build, 2 project highlights with numbers, what roles you're open to"],
                ["LinkedIn Featured", "Demo videos and GitHub repos for both projects"],
                ["Open to work", "Recruiters only, with target titles: GenAI Engineer, AI Engineer, LLM Engineer, Full Stack AI Developer"],
                ["Naukri headline", "Similar to LinkedIn; Naukri search relies heavily on key skills, so fill the skills field completely"],
                ["Naukri profile", "Update it regularly; recently updated profiles tend to appear higher in recruiter searches"],
              ],
            },
          },
        ],
      },
    ],
    revise: [
      "Resume: headline, 2-line summary, measured project bullets with links, grouped skills, ATS-friendly PDF.",
      "LinkedIn: headline, About, Featured demos, open to work (recruiters).",
      "Naukri: key skills complete, updated regularly.",
    ],
    practice: [
      "Ask two people (one technical, one recruiter or HR if possible) to review your resume for 5 minutes each.",
    ],
  },

  "apply-20": {
    minutes: 150,
    level: "Beginner",
    intro:
      "Start applying now, not after Day 20. Responses take one to two weeks, so applications sent today turn into interviews while you finish the plan. Aim for quality: tailored applications to roles that fit.",
    sections: [
      {
        h: "Where to apply",
        blocks: [
          {
            table: {
              head: ["Platform", "Best for"],
              rows: [
                ["LinkedIn Jobs", "All company types; also message recruiters and hiring managers"],
                ["Naukri", "Largest volume in India; service companies and GCCs"],
                ["Instahyre", "Product companies; recruiters reach out"],
                ["Wellfound", "Startups, often AI-first"],
                ["Cutshort, Hirist", "Tech roles, startups and mid-size product companies"],
                ["Company career pages", "Target companies directly (GCCs, AI startups, product companies)"],
              ],
            },
          },
        ],
      },
      {
        h: "Targeting",
        blocks: [
          {
            list: [
              "Titles: GenAI Engineer, AI Engineer, LLM Engineer, AI Application Developer, Full Stack Developer (AI), Python Developer (GenAI).",
              "Good fits for you: roles asking for LLM app development + backend/full-stack skills. Less good: research roles requiring deep ML theory or PhDs.",
              "Read each description; apply if you match about 60–70%. Job descriptions are wish lists.",
              "Tailor the summary and top skills (5 minutes per application).",
            ],
          },
        ],
      },
      {
        h: "Track and follow up",
        blocks: [
          "Keep a simple tracker (spreadsheet or Notion): company, role, link, date, contact, status, next step. Aim for 15–20 today, then 5–10 per day alongside the plan.",
          {
            lang: "text",
            code: `Hi <name>, I applied for the GenAI Engineer role at <company>. I'm a full-stack developer
who has built and deployed a RAG assistant (hybrid search + reranking, 0.90 hit rate) and a
LangGraph agent with an MCP server and human approvals. Demo: <link>. I'd love to be considered.`,
            caption: "A short LinkedIn note to a recruiter or hiring manager after applying. Personalise it.",
          },
          {
            tip: "Referrals convert far better than cold applications. Message former colleagues and college seniors at target companies with your demo links.",
          },
        ],
      },
    ],
    revise: [
      "Apply from Day 14; interviews take time to arrive.",
      "Mix platforms: LinkedIn, Naukri, Instahyre, Wellfound, Cutshort, Hirist, career pages.",
      "Target LLM-app + backend roles; apply at ~60–70% match; tailor briefly.",
      "Track every application; follow up with short, specific messages; ask for referrals.",
    ],
    practice: [
      "Send 15–20 tailored applications and 5 referral requests today.",
    ],
  },
};
