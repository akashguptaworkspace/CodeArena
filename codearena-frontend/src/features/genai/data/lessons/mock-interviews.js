// Day 20: Mock interviews, polish, apply. Shape: see ./index.js
export default {
  intro: {
    minutes: 40,
    level: "Beginner",
    intro:
      "\"Tell me about yourself\" opens almost every interview, and the first 60 seconds shape the rest of it. For a MERN → GenAI switch, your answer should turn the career change into a strength and steer the interviewer toward the projects you know best.",
    sections: [
      {
        h: "The structure (60–90 seconds)",
        blocks: [
          {
            list: [
              "**Present:** who you are professionally, in one line.",
              "**Past:** the relevant experience, emphasising what transfers (APIs, scale, production).",
              "**The pivot:** why GenAI, and what you've built, with one or two numbers.",
              "**Future:** what you want next, connected to this role.",
            ],
            ordered: true,
          },
          {
            lang: "text",
            code: `"I'm a full-stack engineer with 3 years building MERN applications. At <company> I built
the order and payments APIs serving about 50,000 daily users, so I'm used to production
concerns like reliability, latency and security.

Over the last year I've focused on generative AI. I built DocChat, a RAG assistant with
hybrid search and reranking that reached 0.90 retrieval hit rate on my eval set, and
ShopPilot, a LangGraph agent that queries business data through an MCP server, with human
approval for any write action. Both are deployed, one on AWS with Bedrock.

I'm looking for a role where I build LLM features end to end, from retrieval and agents to
the API and UI, which is why this GenAI engineer position caught my attention."`,
            caption: "An example. Use your own facts and numbers, and practise it until it sounds natural, not memorised.",
          },
        ],
      },
      {
        h: "\"Why GenAI after MERN?\"",
        blocks: [
          "Give a genuine, forward-looking reason, and show evidence of commitment:",
          {
            list: [
              "What drew you in (for example, seeing how much of GenAI product work is backend and data engineering you already enjoy).",
              "What you did about it (a structured plan, shipped projects, evals, deployments).",
              "Why your background helps (you can ship the whole product, not just a notebook).",
            ],
          },
          {
            warn: "Don't criticise your current or past employer, and don't make it only about salary or hype. Keep it positive and specific.",
          },
        ],
      },
    ],
    revise: [
      "Present → past (transferable strengths) → pivot (projects with numbers) → future (this role). 60–90 seconds.",
      "\"Why GenAI\": genuine motivation + evidence (shipped projects) + why your background helps; stay positive.",
    ],
    interview: [
      {
        q: "Tell me about yourself.",
        a: "Use the 60–90 second structure with your own details: current role and strengths, relevant experience with one impact number, the GenAI projects you built with one metric each, and why this role fits what you want next. End on something the interviewer is likely to ask about next, such as one of your projects.",
      },
      {
        q: "Why GenAI after MERN?",
        a: "Explain the specific moment or problem that pulled you in, what you did to learn it seriously (projects, evaluation, deployment), and how full-stack experience makes you effective: most GenAI product work is building reliable APIs, data pipelines and UIs around models, which you already do well.",
      },
    ],
    practice: [
      "Write your 60–90 second answer, record it three times, and keep the best version in your notes.",
    ],
  },

  star: {
    minutes: 45,
    level: "Beginner",
    intro:
      "Behavioural and project deep-dive questions (\"Tell me about a hard bug\", \"a time you disagreed\", \"a failure\") are best answered with **STAR**: Situation, Task, Action, Result. Prepare three stories from your projects now so you're not improvising under pressure.",
    sections: [
      {
        h: "STAR",
        blocks: [
          {
            table: {
              head: ["Part", "Content", "Share of the answer"],
              rows: [
                ["**Situation**", "Context in one or two sentences", "~10%"],
                ["**Task**", "What you had to achieve or fix", "~10%"],
                ["**Action**", "What **you** did, specifically, and why: the technical detail", "~60%"],
                ["**Result**", "Measured outcome + what you learned", "~20%"],
              ],
            },
          },
          {
            lang: "text",
            code: `S: In DocChat, users asked about specific form numbers like "F-12" and got answers about other forms.
T: Improve retrieval for exact identifiers without hurting normal questions.
A: I checked the traces and saw the vector search ranking semantically similar forms above the exact
   one. I added Postgres full-text search, fused it with vector results using Reciprocal Rank Fusion,
   and added a cross-encoder reranker. I built a 30-question eval set first so I could measure it.
R: Hit rate@5 went from 0.72 to 0.90, exact-identifier questions from 3/8 to 8/8 correct, with
   about 250 ms extra latency. I learned to always build the eval set before optimising.`,
          },
        ],
      },
      {
        h: "Three stories to prepare",
        blocks: [
          {
            list: [
              "**A hard technical problem** you solved (retrieval quality, streaming through a proxy, an agent loop).",
              "**A trade-off decision** (framework vs plain code, model choice, managed vs self-hosted) and how you decided.",
              "**A failure or mistake** and what you changed afterwards (e.g. a prompt change that broke citations, caught later by evals you then added).",
            ],
          },
          "Also prepare one from your MERN work (performance fix, production incident, working with a difficult requirement), because interviewers will ask about your full experience.",
        ],
      },
    ],
    revise: [
      "STAR: Situation, Task, Action (most of the answer, specific and technical), Result (measured + lesson).",
      "Prepare: hard problem, trade-off decision, failure, plus one MERN story.",
    ],
    interview: [
      {
        q: "What was the hardest bug in your GenAI project?",
        a: "Answer with a STAR story: a specific symptom, how you investigated (traces, logging retrieved chunks, isolating retrieval vs generation), the fix and why it worked, and the measured result, ending with what you changed in your process, such as adding a test or eval case so it can't regress.",
      },
    ],
    practice: [
      "Write your three STAR stories (under 200 words each) in the notes below.",
    ],
  },

  mocks: {
    minutes: 180,
    level: "Intermediate",
    intro:
      "Do two full mock interviews: one on concepts and projects, one on system design. Mocks are where preparation turns into performance; people who do several mocks are noticeably calmer and clearer in real interviews.",
    sections: [
      {
        h: "Mock 1: concepts + project deep dive (45 min)",
        blocks: [
          {
            list: [
              "5 min: tell me about yourself.",
              "15 min: rapid-fire concepts from the question bank (tokens, embeddings, RAG, evaluation, agents, MCP, fine-tuning).",
              "20 min: deep dive into one project: architecture, why each choice, what broke, metrics, what you'd change at 100× scale.",
              "5 min: your questions for them.",
            ],
          },
        ],
      },
      {
        h: "Mock 2: system design (45 min)",
        blocks: [
          "Ask the interviewer to pick one of: document Q&A for a large company, e-commerce support copilot, text-to-SQL assistant, or resume screening. Use the 8-step framework.",
        ],
      },
      {
        h: "Who can interview you",
        blocks: [
          {
            list: [
              "A friend or ex-colleague in tech (give them the question bank and the lesson model answers).",
              "Peer mock platforms (e.g. Pramp) or communities on LinkedIn and Discord.",
              "An AI mock interviewer: ask an assistant to play a strict interviewer for a GenAI Engineer role, ask one question at a time, follow up on weak answers, and give a scored review at the end. Use voice mode if available.",
            ],
          },
        ],
      },
      {
        h: "After each mock",
        blocks: [
          {
            list: [
              "Write down every question you struggled with, and add a crisp answer to the relevant lesson's notes.",
              "Note one habit to fix (rambling, not stating trade-offs, not giving numbers).",
              "Schedule the next mock. Aim for at least 4 before important interviews.",
            ],
          },
        ],
      },
    ],
    revise: [
      "Mock 1: intro + rapid-fire concepts + project deep dive. Mock 2: a system design with the framework.",
      "Interviewers: friends, peer platforms, AI mock interviewer.",
      "After each: log weak questions into lesson notes, fix one habit, schedule the next.",
    ],
    practice: [
      "Book two mocks for the coming week before you close this page.",
    ],
  },

  polish: {
    minutes: 120,
    level: "Beginner",
    intro:
      "Your projects are your proof. Spend a couple of hours making every README, demo link and repository look professional. Recruiters and interviewers often decide in under a minute whether to look deeper.",
    sections: [
      {
        h: "Per-project checklist",
        blocks: [
          {
            list: [
              "One-line description + **live demo link** + **video link** at the very top.",
              "A screenshot or GIF in the first screen of the README.",
              "Architecture diagram (Mermaid or image).",
              "\"Engineering highlights\" with your measured results table.",
              "How to run locally in under 5 commands (`docker compose up`), with a `.env.example`.",
              "Tests passing in CI (badge), and a clean commit history on main.",
              "Demo link actually works (test it in an incognito window) and has a demo login.",
              "No secrets in the repo history (`git log -p | grep -i key` as a quick check; rotate anything that leaked).",
            ],
          },
        ],
      },
      {
        h: "GitHub profile",
        blocks: [
          {
            list: [
              "Pin DocChat, ShopPilot, the fine-tuned model repo and the capstone.",
              "Profile README: one paragraph about you, links to the demos, and your tech stack.",
              "Link your Hugging Face model and a short blog post or LinkedIn article about one thing you learned (e.g. \"What moved my RAG hit rate from 0.72 to 0.90\").",
            ],
          },
        ],
      },
    ],
    revise: [
      "Top of README: description, live link, video, screenshot. Then diagram, results, easy local run, CI badge.",
      "Test demo links in incognito; scan for leaked secrets.",
      "Pin projects, add a profile README, publish one write-up.",
    ],
    practice: [
      "Ask someone to open your GitHub profile cold and tell you in 30 seconds what you do. Adjust until they get it right.",
    ],
  },

  "apply-more": {
    minutes: 150,
    level: "Beginner",
    intro:
      "The plan ends, but the job search keeps going. Send another round of applications, reach out directly to hiring managers, and set up a routine that keeps your skills and pipeline moving while you interview.",
    sections: [
      {
        h: "Today",
        blocks: [
          {
            list: [
              "20 more tailored applications (now with the capstone on your resume).",
              "10 direct messages to hiring managers or engineers at target companies, each with one line about a relevant project and a demo link.",
              "Follow up on Day 16 applications that haven't responded (a short, polite note).",
              "Update your tracker.",
            ],
          },
          {
            lang: "text",
            code: `Hi <name>, I saw <company> is building <product/feature>. I'm a full-stack engineer who has
shipped a RAG support copilot on AWS Bedrock (hybrid retrieval, human-approved refunds,
evals in CI): <demo link>. If you're hiring for GenAI engineering, I'd love a quick chat.`,
            caption: "Short, specific, with proof. Personalise the first line for each company.",
          },
        ],
      },
      {
        h: "The routine after Day 20",
        blocks: [
          {
            table: {
              head: ["Daily (2–3 hrs)", "Weekly"],
              rows: [
                ["5–10 applications or referral requests", "2 mock interviews"],
                ["2 DSA problems in Python", "1 system design practice"],
                ["Revise 3 lessons using your notes and Quick revision boxes", "1 improvement to a project (and a LinkedIn post about it)"],
                ["Follow up on pipeline", "Review tracker: which channels get responses? Do more of those"],
              ],
            },
          },
          "Keep learning as you interview: new models and tools appear constantly, and \"what have you been exploring recently?\" is a common question. Your notes in these lessons are your revision system; keep adding to them after every interview.",
          {
            tip: "Rejections are normal, especially for career switchers. Treat each interview as data: note the questions, improve one weak area, and keep going. Consistency over a few weeks is what gets the offer.",
          },
        ],
      },
    ],
    revise: [
      "Today: 20 applications, 10 direct messages, follow-ups, tracker updated.",
      "Ongoing routine: daily applications, DSA and revision; weekly mocks, design practice, project improvement.",
      "Treat interviews as data; keep notes updated; stay consistent.",
    ],
    practice: [
      "Put the daily routine in your calendar for the next 4 weeks.",
    ],
  },
};
