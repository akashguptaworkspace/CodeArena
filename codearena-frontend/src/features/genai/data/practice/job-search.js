// Practice exercises: resume, keywords, job search tools. Picked into day files (d04.js, …); shape: see ./index.js
// Shared setup for these exercises (sample data, helper files, notes); each day's practice file adds it after its own folder setup.
export const SETUP_EXTRAS = [
  "Copy the text of 10 real GenAI job descriptions (from LinkedIn, Naukri, Instahyre…) into `jds/1.txt` … `jds/10.txt`, and your resume's text into `resume.txt`.",
];

export default {
  groups: [
    {
      title: "Understand the market",
      exercises: [
        {
          id: "jd-keywords",
          title: "Which skills do job descriptions ask for most?",
          level: "Easy",
          task: [
            "Count how many of your 10 JDs mention each skill from a keyword list (case-insensitive, whole words, with a few aliases like `llm`/`llms`). Print the top 15 with counts and a text bar.",
            { lang: "text", code: `python        ██████████ 10\nrag           ████████   8\nlangchain     ███████    7` },
          ],
          solution: `import re
from collections import Counter
from pathlib import Path

SKILLS = {
    "python": ["python"], "fastapi": ["fastapi"], "rag": ["rag", "retrieval augmented", "retrieval-augmented"],
    "langchain": ["langchain"], "langgraph": ["langgraph"], "llamaindex": ["llamaindex", "llama index"],
    "llm": ["llm", "llms", "large language model"], "vector db": ["vector database", "vector db", "pinecone",
    "qdrant", "chroma", "pgvector", "faiss", "weaviate", "milvus"], "aws": ["aws", "bedrock", "sagemaker"],
    "azure": ["azure"], "docker": ["docker"], "kubernetes": ["kubernetes", "k8s"], "mcp": ["mcp", "model context protocol"],
    "fine-tuning": ["fine-tuning", "fine tuning", "lora", "qlora", "peft"], "agents": ["agent", "agents", "agentic"],
    "evaluation": ["evaluation", "evals", "ragas"], "react": ["react", "next.js", "nextjs"], "sql": ["sql", "postgres", "postgresql"],
}

counts = Counter()
for path in sorted(Path("jds").glob("*.txt")):
    text = path.read_text(encoding="utf-8").lower()
    for skill, aliases in SKILLS.items():
        if any(re.search(rf"\\b{re.escape(a)}\\b", text) for a in aliases):
            counts[skill] += 1          # count each JD at most once per skill

for skill, n in counts.most_common(15):
    print(f"{skill:<13} {'█' * n:<10} {n}")`,
          explanation: [
            "Counting documents (not total mentions) tells you what share of employers want each skill.",
            "`\\b` word boundaries stop `rag` matching inside words like \"storage\". `re.escape` makes aliases like `next.js` safe to use in a regex.",
            "`rf\"...\"` is a raw f-string: backslashes stay literal and `{...}` is still interpolated.",
            "Use the result to decide which keywords belong in your headline and skills section, as long as you can back them up.",
          ],
          concepts: [
            ["`Counter.most_common(n)`", "The n most frequent items with counts."],
            ["`re.escape()`", "Escapes special regex characters in a string."],
            ["`any()`", "True if at least one item in an iterable is true."],
          ],
        },
        {
          id: "resume-match",
          title: "Score your resume against one JD",
          level: "Medium",
          task: [
            "Using the same skill dictionary, compute which JD skills your resume covers and which are missing, and a match percentage. Then ask the LLM for 3 concrete suggestions to close the gaps **honestly** (e.g. \"add your pgvector work from DocChat to the project bullets\").",
          ],
          solution: `import re
from pathlib import Path
from llm import chat
from jd_keywords import SKILLS          # previous exercise saved as jd_keywords.py

def skills_in(text: str) -> set[str]:
    text = text.lower()
    return {s for s, aliases in SKILLS.items()
            if any(re.search(rf"\\b{re.escape(a)}\\b", text) for a in aliases)}

jd = Path("jds/1.txt").read_text(encoding="utf-8")
resume = Path("resume.txt").read_text(encoding="utf-8")

wanted, have = skills_in(jd), skills_in(resume)
matched, missing = wanted & have, wanted - have
print(f"match: {len(matched)}/{len(wanted)} = {len(matched) / max(len(wanted), 1):.0%}")
print("matched:", sorted(matched))
print("missing:", sorted(missing))

print(chat(
    f"Job description:\\n{jd[:3000]}\\n\\nResume:\\n{resume[:3000]}\\n\\nMissing keywords: {sorted(missing)}",
    system=("You are a career coach. Give 3 concrete, honest resume edits that surface skills the candidate "
            "actually shows elsewhere in the resume. Never suggest claiming skills they don't have."),
    temperature=0.3,
))`,
          explanation: [
            "Set maths makes the comparison trivial: `&` for matched skills, `-` for missing ones.",
            "`max(len(wanted), 1)` avoids dividing by zero if a JD matched no known skills.",
            "The system prompt guards against the LLM encouraging you to exaggerate. Interviewers will ask about everything on your resume.",
          ],
          concepts: [
            ["Set comprehension", "`{x for x in items if cond}` builds a set."],
            ["Keyword match score", "A rough signal of how an ATS or recruiter might see the fit."],
          ],
        },
      ],
    },
    {
      title: "Sharpen your materials",
      exercises: [
        {
          id: "bullets",
          title: "Rewrite resume bullets with measured impact",
          level: "Medium",
          task: [
            "Give the LLM 3 weak bullets plus the facts you actually have (metrics from your evals). Get back structured output: for each bullet, a rewritten version following \"verb + what + how + measured result\", and a flag if it contains no number. Print them side by side.",
            {
              lang: "python",
              code: `WEAK = ["Made a chatbot for documents", "Worked on an AI agent", "Improved performance"]
FACTS = "DocChat: hybrid search + reranker, hit rate@5 0.72→0.90, FastAPI + pgvector + Next.js. " \\
        "ShopPilot: LangGraph + MCP server, approvals, 10/10 red-team blocked. Cost/1k queries -44%."`,
            },
          ],
          solution: `import json
from pydantic import BaseModel
from llm import client, CHAT_MODEL

class Rewrite(BaseModel):
    original: str
    improved: str
    has_number: bool

class Rewrites(BaseModel):
    bullets: list[Rewrite]

WEAK = ["Made a chatbot for documents", "Worked on an AI agent", "Improved performance"]
FACTS = ("DocChat: hybrid search + reranker, hit rate@5 0.72→0.90, FastAPI + pgvector + Next.js. "
         "ShopPilot: LangGraph + MCP server, approvals, 10/10 red-team blocked. Cost/1k queries -44%.")

r = client.chat.completions.create(
    model=CHAT_MODEL, temperature=0.2, response_format={"type": "json_object"},
    messages=[{"role": "system", "content":
               "Rewrite resume bullets as: action verb + what was built + key technique + measured result. "
               "Use only the facts given; never invent numbers. One line each. Reply as JSON "
               '{"bullets": [{"original": "...", "improved": "...", "has_number": true|false}]}'},
              {"role": "user", "content": f"Facts: {FACTS}\\nBullets: {json.dumps(WEAK)}"}])

for b in Rewrites.model_validate_json(r.choices[0].message.content).bullets:
    flag = "" if b.has_number else "   ⚠️ add a measured result"
    print(f"- {b.original}\\n  → {b.improved}{flag}\\n")`,
          explanation: [
            "Giving the model your real facts and forbidding invented numbers keeps the output honest.",
            "Structured output means you can process results in code, for example flagging bullets with no metric.",
            "Always edit the final wording yourself; the LLM draft is a starting point.",
          ],
          concepts: [
            ["Impact bullet", "A resume line showing what you built, how, and the measurable result."],
            ["Nested Pydantic models", "`Rewrites` contains a list of `Rewrite` objects, validated together."],
          ],
        },
        {
          id: "readme-gen",
          title: "Generate a README skeleton from project data",
          level: "Easy",
          task: [
            "Store a project's details in a dict (name, pitch, live link, video link, features, stack, results table rows, run commands) and write a function that produces a complete `README.md` with Markdown sections. Generate it for DocChat.",
          ],
          solution: `from pathlib import Path

project = {
    "name": "DocChat",
    "pitch": "Chat with your PDFs and get answers with page citations.",
    "live": "https://docchat.example.com", "video": "https://loom.com/share/...",
    "features": ["Upload PDFs, ask questions, get cited answers",
                 "Hybrid search (vector + keyword) with reranking",
                 "Streaming answers; refuses when the answer isn't in the documents"],
    "stack": "FastAPI · Postgres + pgvector · Next.js · OpenAI / Bedrock",
    "results": [("vector", "0.72", "0.84"), ("hybrid + rerank", "0.90", "0.91")],
    "run": ["cp .env.example .env", "docker compose up --build"],
}

def readme(p: dict) -> str:
    lines = [f"# {p['name']}", "", f"> {p['pitch']}", "",
             f"**Live demo:** {p['live']} · **Video:** {p['video']}", "", "## Features"]
    lines += [f"- {f}" for f in p["features"]]
    lines += ["", "## Stack", p["stack"], "", "## Results", "",
              "| Retrieval | Hit@5 | Faithfulness |", "|---|---|---|"]
    lines += [f"| {mode} | {hit} | {faith} |" for mode, hit, faith in p["results"]]
    lines += ["", "## Run locally", "", "\`\`\`bash", *p["run"], "\`\`\`", "",
              "## Architecture", "", "(add diagram)", "", "## What I'd do next", "", "- ..."]
    return "\\n".join(lines) + "\\n"

Path("README.generated.md").write_text(readme(project), encoding="utf-8")
print(readme(project))`,
          explanation: [
            "Building text from a list of lines and joining with `\"\\n\"` is cleaner than one giant f-string.",
            "`*p[\"run\"]` inside a list literal spreads the commands into the list.",
            "A consistent README structure across your projects (pitch, links, features, results, run steps) makes your GitHub look professional.",
          ],
          concepts: [
            ["Markdown", "Plain-text formatting used by GitHub READMEs: `#` headings, `-` lists, `|` tables."],
            ["Building strings from lists", "Collect lines in a list, then `\"\\n\".join(lines)`."],
          ],
        },
      ],
    },
    {
      title: "Run the search like a pipeline",
      exercises: [
        {
          id: "tracker",
          title: "An application tracker CLI with SQLite",
          level: "Medium",
          task: [
            "Build `track.py` with commands `add <company> <role> <link>`, `list`, `status <id> <applied|interview|offer|rejected>`, and `due` (applications with no update for 7+ days, which need a follow-up). Use `argparse` and SQLite.",
          ],
          solution: `# track.py
import argparse, sqlite3
from datetime import date, timedelta

db = sqlite3.connect("applications.db")
db.execute("""CREATE TABLE IF NOT EXISTS apps (id INTEGER PRIMARY KEY, company TEXT, role TEXT,
              link TEXT, status TEXT DEFAULT 'applied', updated TEXT)""")
STATUSES = ["applied", "interview", "offer", "rejected"]

p = argparse.ArgumentParser(prog="track")
sub = p.add_subparsers(dest="cmd", required=True)
a = sub.add_parser("add"); a.add_argument("company"); a.add_argument("role"); a.add_argument("link", nargs="?", default="")
sub.add_parser("list")
s = sub.add_parser("status"); s.add_argument("id", type=int); s.add_argument("status", choices=STATUSES)
sub.add_parser("due")
args = p.parse_args()
today = date.today().isoformat()

if args.cmd == "add":
    db.execute("INSERT INTO apps (company, role, link, updated) VALUES (?, ?, ?, ?)",
               (args.company, args.role, args.link, today))
elif args.cmd == "status":
    db.execute("UPDATE apps SET status = ?, updated = ? WHERE id = ?", (args.status, today, args.id))
elif args.cmd == "list":
    for row in db.execute("SELECT id, company, role, status, updated FROM apps ORDER BY updated DESC"):
        print(f"#{row[0]:<3} {row[1]:<18} {row[2]:<24} {row[3]:<10} {row[4]}")
elif args.cmd == "due":
    cutoff = (date.today() - timedelta(days=7)).isoformat()
    for row in db.execute("SELECT id, company, role, updated FROM apps "
                          "WHERE status IN ('applied', 'interview') AND updated <= ?", (cutoff,)):
        print(f"follow up: #{row[0]} {row[1]} ({row[2]}), last update {row[3]}")
db.commit()

# uv run python track.py add Razorpay "GenAI Engineer" https://...
# uv run python track.py list
# uv run python track.py due`,
          explanation: [
            "`add_subparsers` gives you git-style subcommands; `choices=STATUSES` rejects invalid statuses automatically.",
            "ISO dates (`YYYY-MM-DD`) sort correctly as text, so `updated <= ?` works in SQL.",
            "`nargs=\"?\"` makes the link optional.",
            "Run `due` every morning; following up on time noticeably improves response rates.",
          ],
          concepts: [
            ["`argparse` subcommands", "Different commands in one CLI, each with its own arguments."],
            ["`timedelta`", "A length of time you can add to or subtract from dates."],
            ["SQL `UPDATE ... WHERE`", "Changes matching rows."],
          ],
        },
        {
          id: "followup",
          title: "Draft a personalised follow-up message",
          level: "Easy",
          task: [
            "Write `draft_followup(company, role, product, project_line, demo_link)` that asks the LLM for a LinkedIn note under 300 characters, then checks the length in code and asks for a shorter version if needed.",
          ],
          solution: `from llm import chat

def draft_followup(company: str, role: str, product: str, project_line: str, demo_link: str) -> str:
    prompt = (f"Write a LinkedIn note to a hiring manager at {company} about the {role} role. "
              f"Mention their product ({product}) in one phrase and my project: {project_line}. "
              f"End with the demo link {demo_link}. Friendly, specific, no flattery, under 300 characters.")
    note = chat(prompt, temperature=0.5)
    for _ in range(2):
        if len(note) <= 300:
            break
        note = chat(f"Shorten this to under 280 characters, keep the link:\\n{note}", temperature=0)
    return note

msg = draft_followup("Zeta", "GenAI Engineer", "card issuing platform",
                     "a RAG support copilot on AWS Bedrock with evals in CI", "https://demo.example.com")
print(msg, f"\\n({len(msg)} characters)")`,
          explanation: [
            "LLMs are bad at counting characters, so the hard limit is checked in **code**, with a retry to shorten.",
            "Personal, specific notes (their product + your relevant proof) get far more replies than generic ones.",
            "Read and edit every message before sending; never send LLM output unreviewed to a real person.",
          ],
          concepts: [
            ["Code-enforced constraint", "Checking a rule (like length) in code instead of trusting the model."],
            ["`for ... break`", "Retry up to a fixed number of times, stopping early when done."],
          ],
        },
      ],
    },
  ],
};
