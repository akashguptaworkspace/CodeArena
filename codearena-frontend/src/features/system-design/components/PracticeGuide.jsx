import { DESIGN_STATUSES } from "@/features/system-design/data/systemDesign";
import { Card } from "@/shared/ui";
import { STATUS_COLORS } from "./statusStyles";
import styles from "./PracticeGuide.module.css";

const FUNDAMENTALS = [
  "Vertical vs horizontal scaling, load balancers, stateless services",
  "SQL vs NoSQL, indexes, replication, sharding keys",
  "Caching: cache-aside, TTL, invalidation, stampedes",
  "Queues and async jobs: retries, idempotency, dead-letter queues",
  "API design: REST, pagination, rate limiting, WebSockets vs polling",
  "Consistency: CAP in practice, eventual consistency, transactions",
  "CDN, object storage, consistent hashing",
  "Back-of-the-envelope estimates: QPS, storage, bandwidth",
  "OOP and SOLID; patterns: Strategy, Factory, Observer, State, Command, Singleton, Builder",
];

const PLAN = [
  {
    weeks: "Weeks 1–2",
    focus: "Fundamentals + first wins",
    hld: "URL Shortener, Rate Limiter",
    lld: "Parking Lot, Tic-Tac-Toe, Snake and Ladder, Logging Framework",
  },
  {
    weeks: "Weeks 3–4",
    focus: "Building blocks",
    hld: "Unique ID Generator, Distributed Cache, Notification System, Job Scheduler",
    lld: "LRU Cache, Vending Machine, Splitwise, Notification Service",
  },
  {
    weeks: "Weeks 5–6",
    focus: "Social and real-time",
    hld: "News Feed, Instagram, Chat App, Likes Counter, Autocomplete",
    lld: "Movie Booking, Food Ordering, Shopping Cart, Elevator, Pub-Sub, Rate Limiter",
  },
  {
    weeks: "Weeks 7–8",
    focus: "Commerce and payments (the Tier 2 favourites)",
    hld: "Food Delivery, Location Tracking, Movie Booking, Flash Sale, Payment Gateway, Wallet",
    lld: "Cab Booking, Wallet, Cricket Scoreboard, Meeting Rooms, KV Store with TTL, Twitter-lite",
  },
  {
    weeks: "Weeks 9–10",
    focus: "Remaining core + mock interviews",
    hld: "Ride Hailing, Video Streaming, File Storage, Auth Service, Logging Platform",
    lld: "Redo 3 LLDs from scratch against a 90-minute timer",
  },
];

export function PracticeGuide() {
  return (
    <div className={styles.guide}>
      <section className={styles.section}>
        <h2>You don't need all 100 at interview level</h2>
        <p>
          The <strong>Core</strong> questions (about 40 across HLD and LLD) are the ones asked again and again. Take
          those to <em>Interview-ready</em>. For the rest, <em>Studied</em> is enough: read one solid solution and
          note the one idea it teaches that you didn't know. That idea is what saves you when an unfamiliar question
          comes up.
        </p>
        <div className={styles.stages}>
          {DESIGN_STATUSES.map((s, i) => (
            <Card key={s.value} variant="flat" className={styles.stage} style={{ "--c": STATUS_COLORS[s.value] }}>
              <span className={styles.stageStep}>Stage {i + 1}</span>
              <h3>{s.label}</h3>
              <p>{s.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>How to practise one HLD question (about 90 minutes)</h2>
        <ol className={styles.steps}>
          <li>
            <strong>Read only the scenario.</strong> Each question page shows the problem, what it must do and the
            scale. No hints. Treat it like the interviewer just said it.
          </li>
          <li>
            <strong>Write your design, 45 minutes.</strong> Use the notes box (it saves as you type), paper or
            Excalidraw. Follow the answer structure below and say it out loud.
          </li>
          <li>
            <strong>Reveal the model answer and score yourself.</strong> Compare components, the step-by-step flow and
            the key decisions, then tick each key point you covered. The percentage shows how close you were.
          </li>
          <li>
            <strong>Answer the follow-up.</strong> It appears after the reveal; interviewers almost always push like
            this.
          </li>
          <li>
            <strong>Redo it later.</strong> 4–7 days later, choose "Start a fresh attempt" and do it from a blank
            page. 80%+ and a solid follow-up answer means <em>Interview-ready</em>.
          </li>
        </ol>

        <h3 className={styles.sub}>The 45-minute HLD answer structure</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Minutes</th>
                <th>Step</th>
                <th>What to say</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>0–5</td><td>Requirements</td><td>What users can do; scale, latency, consistency, availability. Ask, don't assume.</td></tr>
              <tr><td>5–8</td><td>Estimates</td><td>Users, requests per second (read vs write), storage per year.</td></tr>
              <tr><td>8–13</td><td>API</td><td>3–5 key endpoints with inputs and outputs.</td></tr>
              <tr><td>13–18</td><td>Data model</td><td>Main tables or collections, and why SQL or NoSQL.</td></tr>
              <tr><td>18–28</td><td>High-level design</td><td>Client → load balancer → services → DB, cache, queue. Walk one request end to end.</td></tr>
              <tr><td>28–42</td><td>Deep dive</td><td>Bottlenecks, scaling, failure cases, trade-offs. This is where you pass or fail.</td></tr>
              <tr><td>42–45</td><td>Wrap up</td><td>Monitoring, what you'd improve with more time.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2>How to practise one LLD / machine-coding question (about 2 hours)</h2>
        <ol className={styles.steps}>
          <li>
            <strong>Design, 15 minutes.</strong> From the scenario alone, list the classes, what each is responsible
            for, and which parts will change (those become interfaces). Put it in the notes box.
          </li>
          <li>
            <strong>Code it, 75–90 minutes, with a timer.</strong> Working code in TypeScript or JavaScript classes,
            with a small <code>main</code> or test file that runs the key flows. Real interviews expect running code.
          </li>
          <li>
            <strong>Reveal and score.</strong> Compare your classes and method flow with the model answer and tick the
            key points you covered.
          </li>
          <li>
            <strong>Add the follow-up.</strong> Implement the twist. If it forces edits to many existing classes, your
            design was too rigid; refactor and note why.
          </li>
          <li>
            <strong>Redo it a week later</strong> from a blank file with "Start a fresh attempt".
          </li>
        </ol>
        <h3 className={styles.sub}>What interviewers grade</h3>
        <ul className={styles.bullets}>
          <li>It runs and handles the main flows and edge cases</li>
          <li>Clear separation: models, services, repositories/storage</li>
          <li>New requirements are added by writing new classes, not editing old ones (Open/Closed)</li>
          <li>Good names, small methods, no giant if/else chains on types</li>
          <li>You can explain which design patterns you used and why</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Learn these fundamentals first</h2>
        <ul className={styles.bullets}>
          {FUNDAMENTALS.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2>10-week plan alongside DSA</h2>
        <p>About 1 HLD and 1–2 LLD questions a week at the start, rising to 3 each later. Roughly 8–10 hours a week.</p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Focus</th>
                <th>HLD</th>
                <th>LLD</th>
              </tr>
            </thead>
            <tbody>
              {PLAN.map((row) => (
                <tr key={row.weeks}>
                  <td className={styles.nowrap}>{row.weeks}</td>
                  <td>{row.focus}</td>
                  <td>{row.hld}</td>
                  <td>{row.lld}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2>Mock interviews make the biggest difference</h2>
        <ul className={styles.bullets}>
          <li>From week 5, do at least one mock a week with a friend or a peer from a developer community.</li>
          <li>Swap roles: interviewing someone else shows you what a clear answer sounds like.</li>
          <li>Record yourself on your phone. Listen for long silences and unexplained jumps.</li>
          <li>
            Connect answers to your own MERN work: "In my project I used Redis for X; at 100× the traffic I'd change
            Y." Interviewers remember this.
          </li>
        </ul>
      </section>
    </div>
  );
}
