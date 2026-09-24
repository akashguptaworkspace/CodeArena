// Query questions: Dates & time, Modify & clean data, Classic patterns. Shape: see ../sql.js
import { EMPLOYEES_WITH_DEPT_ID, LOGINS, ORDERS } from "./tables";

const ACTIVITY = {
  name: "activity",
  columns: [["player_id", "INT"], ["device_id", "INT"], ["event_date", "DATE"], ["games_played", "INT"]],
};

export default {
  // ---------- Dates & time ----------
  "sql-q-monthly-revenue": {
    tables: [ORDERS],
    scenario: "Show total revenue for each of the last 12 months (including the current month), excluding cancelled orders, oldest month first.",
    answer: {
      summary:
        "Filter to orders since the first day of the month 11 months ago, group by year-month, and sum the totals. Keep the filter on the raw column so an index on created_at can be used.",
      code: `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
       SUM(total) AS revenue,
       COUNT(*) AS orders
FROM orders
WHERE status <> 'cancelled'
  AND created_at >= DATE_FORMAT(CURDATE() - INTERVAL 11 MONTH, '%Y-%m-01')
GROUP BY month
ORDER BY month;`,
      points: [
        "DATE_FORMAT(x, '%Y-%m-01') gives the first day of a month.",
        "Months with no orders don't appear; interviewers often ask how to fill them.",
        "Timezones: if created_at is stored in UTC but the business reports in IST, convert first (CONVERT_TZ) or month boundaries shift.",
      ],
      alt: `-- Fill empty months with 0 using a recursive CTE calendar
WITH RECURSIVE months AS (
  SELECT CAST(DATE_FORMAT(CURDATE() - INTERVAL 11 MONTH, '%Y-%m-01') AS DATE) AS m
  UNION ALL
  SELECT m + INTERVAL 1 MONTH FROM months WHERE m < CAST(DATE_FORMAT(CURDATE(), '%Y-%m-01') AS DATE)
)
SELECT DATE_FORMAT(months.m, '%Y-%m') AS month, COALESCE(SUM(o.total), 0) AS revenue
FROM months
LEFT JOIN orders o
  ON o.created_at >= months.m
 AND o.created_at < months.m + INTERVAL 1 MONTH
 AND o.status <> 'cancelled'
GROUP BY months.m
ORDER BY months.m;`,
    },
  },

  "sql-q-date-window": {
    tables: [{ name: "activity", columns: [["user_id", "INT"], ["session_id", "INT"], ["activity_date", "DATE"], ["activity_type", "VARCHAR"]] }],
    scenario: "Find the daily active user count for the 30-day period ending on 2019-07-27 (inclusive). Only include days with at least one active user.",
    answer: {
      summary: "Filter the 30 days ending on the given date and count distinct users per day.",
      code: `SELECT activity_date AS day, COUNT(DISTINCT user_id) AS active_users
FROM activity
WHERE activity_date >  '2019-07-27' - INTERVAL 30 DAY
  AND activity_date <= '2019-07-27'
GROUP BY activity_date;`,
      points: [
        "30 days inclusive of the end date = from 2019-06-28 to 2019-07-27, hence > end - 30 days.",
        "DISTINCT user_id: one user with many sessions in a day counts once.",
        "Weekly active users: group by YEARWEEK(activity_date, 1) instead.",
      ],
    },
  },

  "sql-q-mom-growth": {
    tables: [ORDERS],
    scenario: "Show each month's revenue, the previous month's revenue, and the month-over-month growth percentage.",
    answer: {
      summary: "Aggregate revenue per month in a CTE, then use LAG() to bring the previous month's value onto the same row and compute the percentage change.",
      code: `WITH monthly AS (
  SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, SUM(total) AS revenue
  FROM orders
  WHERE status <> 'cancelled'
  GROUP BY month
)
SELECT month,
       revenue,
       LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
       ROUND(100 * (revenue - LAG(revenue) OVER (ORDER BY month))
                  / NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 2) AS growth_pct
FROM monthly
ORDER BY month;`,
      points: [
        "LAG(x, n) looks n rows back in the window order; LEAD looks forward.",
        "NULLIF(prev, 0) turns division by zero into NULL instead of an error or a meaningless number.",
        "The first month has no previous month, so growth is NULL.",
        "Year-over-year: LAG(revenue, 12) if every month is present, or join each month to the same month a year earlier.",
      ],
    },
  },

  "sql-q-retention": {
    tables: [ACTIVITY],
    scenario:
      "Report the fraction of players who logged in again on the day after the day they first logged in, rounded to 2 decimals.",
    answer: {
      summary:
        "Find each player's first login date, check whether an activity row exists for first_login + 1 day, and divide the number of such players by all players.",
      code: `WITH firsts AS (
  SELECT player_id, MIN(event_date) AS first_login
  FROM activity
  GROUP BY player_id
)
SELECT ROUND(
  COUNT(a.player_id) / (SELECT COUNT(*) FROM firsts),
  2
) AS fraction
FROM firsts f
LEFT JOIN activity a
  ON a.player_id = f.player_id
 AND a.event_date = f.first_login + INTERVAL 1 DAY;`,
      points: [
        "This is next-day retention, a core product metric (D1 retention).",
        "(player_id, event_date) is unique here, so each player matches at most one row.",
        "Cohort retention tables group players by signup week/month and compute D1, D7, D30 for each cohort.",
      ],
    },
  },

  "sql-q-price-at-date": {
    tables: [{ name: "products", columns: [["product_id", "INT"], ["new_price", "INT"], ["change_date", "DATE"]] }],
    scenario:
      "The table records every price change. Every product's price was 10 before its first change. Find the price of every product on 2019-08-16.",
    answer: {
      summary:
        "For each product, take the latest change on or before the date. Products whose first change is after the date still have the default price of 10.",
      code: `WITH last_change AS (
  SELECT product_id, new_price,
         ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY change_date DESC) AS rn
  FROM products
  WHERE change_date <= '2019-08-16'
)
SELECT p.product_id, COALESCE(lc.new_price, 10) AS price
FROM (SELECT DISTINCT product_id FROM products) p
LEFT JOIN last_change lc
  ON lc.product_id = p.product_id AND lc.rn = 1;`,
      points: [
        "Start from all products so those without an early change still appear.",
        "The rn = 1 filter must be in ON (not WHERE), or the LEFT JOIN becomes an inner join.",
        "Better design for 'price at time X': store valid_from/valid_to so it's a simple range lookup.",
      ],
    },
  },

  "sql-q-time-diff": {
    tables: [{ name: "activity", columns: [["machine_id", "INT"], ["process_id", "INT"], ["activity_type", "ENUM('start','end')"], ["timestamp", "FLOAT"]] }],
    scenario:
      "Each process on a machine has a start and an end row. Find each machine's average processing time (end − start), rounded to 3 decimals.",
    answer: {
      summary: "Pair each process's start and end rows, by self-joining or by conditional aggregation per (machine, process), then average per machine.",
      code: `SELECT a.machine_id,
       ROUND(AVG(b.timestamp - a.timestamp), 3) AS processing_time
FROM activity a
JOIN activity b
  ON b.machine_id = a.machine_id
 AND b.process_id = a.process_id
 AND a.activity_type = 'start'
 AND b.activity_type = 'end'
GROUP BY a.machine_id;`,
      points: [
        "The join conditions on activity_type make a the start row and b the end row.",
        "Conditional aggregation avoids the self-join: per (machine, process), MAX(CASE WHEN type = 'end' THEN timestamp END) - MAX(CASE WHEN type = 'start' THEN timestamp END).",
        "For DATETIME columns use TIMESTAMPDIFF(SECOND, start_at, end_at).",
      ],
    },
  },

  // ---------- Modify & clean data ----------
  "sql-q-delete-duplicates": {
    tables: [{ name: "person", columns: [["id", "INT PK"], ["email", "VARCHAR"]] }],
    scenario: "Delete all duplicate emails, keeping only the row with the smallest id for each email. Write a DELETE statement, not a SELECT.",
    answer: {
      summary: "Self-join the table on email and delete the row with the larger id in each duplicate pair.",
      code: `DELETE p1
FROM person p1
JOIN person p2
  ON p1.email = p2.email
 AND p1.id > p2.id;`,
      points: [
        "MySQL's multi-table DELETE syntax: DELETE alias FROM ... JOIN ...",
        "Any row that has a smaller-id twin is deleted, so only the minimum id per email survives.",
        "MySQL won't let you DELETE from a table and select from it in a plain subquery (error 1093); wrapping the subquery in a derived table works around it.",
        "Run the same join as a SELECT first to see what will be deleted, and do it inside a transaction.",
        "Afterwards add UNIQUE(email) so duplicates can't come back.",
      ],
      alt: `DELETE FROM person
WHERE id NOT IN (
  SELECT min_id FROM (
    SELECT MIN(id) AS min_id FROM person GROUP BY email
  ) keep
);`,
      pitfalls: ["On a very large table, delete in batches (e.g. LIMIT 5000 in a loop) to avoid long locks and replica lag."],
    },
  },

  "sql-q-update-case": {
    tables: [{ name: "salary", columns: [["id", "INT PK"], ["name", "VARCHAR"], ["sex", "ENUM('m','f')"], ["salary", "INT"]] }],
    scenario: "Swap all 'f' and 'm' values in the sex column with a single UPDATE statement and no temporary table.",
    answer: {
      summary: "One UPDATE with a CASE expression: each row is evaluated using its original value, so the swap happens in one pass.",
      code: `UPDATE salary
SET sex = CASE sex WHEN 'm' THEN 'f' ELSE 'm' END;`,
      points: [
        "Two separate UPDATEs (m→f, then f→m) would turn everything into 'm'.",
        "Simple CASE (CASE sex WHEN ...) compares one expression against values; searched CASE (CASE WHEN condition ...) allows any condition.",
        "IF(sex = 'm', 'f', 'm') is a MySQL shortcut.",
      ],
    },
  },

  "sql-q-upsert": {
    tables: [{ name: "page_views", columns: [["page_id", "INT"], ["day", "DATE"], ["views", "INT"], ["UNIQUE KEY", "(page_id, day)"]] }],
    scenario: "Every time a page is viewed, increment its view count for today. If today's row doesn't exist yet, create it with views = 1. Do it in one statement.",
    answer: {
      summary:
        "INSERT ... ON DUPLICATE KEY UPDATE relies on the unique key (page_id, day): it inserts a new row, or if that key already exists, runs the UPDATE part atomically.",
      code: `INSERT INTO page_views (page_id, day, views)
VALUES (42, CURDATE(), 1)
ON DUPLICATE KEY UPDATE views = views + 1;`,
      points: [
        "Atomic: no race between 'check if exists' and 'insert' like you'd have in application code.",
        "Needs a PRIMARY KEY or UNIQUE index on the columns that define 'same row'.",
        "REPLACE INTO deletes and re-inserts (new auto-increment id, cascades fire); INSERT IGNORE silently skips duplicates.",
        "Very hot rows become a lock bottleneck; buffer counts in Redis and flush periodically.",
      ],
    },
  },

  "sql-q-update-join": {
    tables: [
      EMPLOYEES_WITH_DEPT_ID,
      { name: "departments", columns: [["id", "INT PK"], ["name", "VARCHAR"], ["revenue", "DECIMAL"], ["target", "DECIMAL"]] },
    ],
    scenario: "Give every employee a 10% raise if their department's revenue beat its target.",
    answer: {
      summary: "MySQL supports UPDATE with JOIN: join employees to departments and update only rows where the department beat its target.",
      code: `UPDATE employees e
JOIN departments d ON d.id = e.department_id
SET e.salary = e.salary * 1.10
WHERE d.revenue > d.target;`,
      points: [
        "First run SELECT e.id, e.salary, e.salary * 1.10 FROM ... with the same JOIN and WHERE to preview.",
        "Wrap in a transaction, check the affected row count, then commit.",
        "Follow-up cap: SET e.salary = e.salary + LEAST(e.salary * 0.10, 10000).",
        "Postgres uses UPDATE ... FROM instead of UPDATE ... JOIN.",
      ],
    },
  },

  "sql-q-fix-names": {
    tables: [{ name: "users", columns: [["user_id", "INT PK"], ["name", "VARCHAR"]] }],
    scenario: "Fix the names so that only the first character is uppercase and the rest are lowercase. Return the result ordered by user_id.",
    answer: {
      summary: "Uppercase the first character, lowercase the rest, and concatenate.",
      code: `SELECT user_id,
       CONCAT(UPPER(LEFT(name, 1)), LOWER(SUBSTRING(name, 2))) AS name
FROM users
ORDER BY user_id;`,
      points: [
        "SUBSTRING(str, pos) is 1-indexed: SUBSTRING(name, 2) is everything after the first character.",
        "Make it permanent with UPDATE users SET name = CONCAT(...).",
        "Also clean spaces with TRIM(); collapse repeated spaces with REGEXP_REPLACE(name, ' +', ' ') in MySQL 8.",
      ],
    },
  },

  "sql-q-pivot": {
    tables: [{ name: "products", columns: [["product_id", "INT PK"], ["store1", "INT NULL"], ["store2", "INT NULL"], ["store3", "INT NULL"]] }],
    scenario:
      "The table has one column per store with the product's price (NULL if not sold there). Rearrange it into rows of (product_id, store, price), skipping stores that don't sell the product. Then show how you'd pivot it back.",
    answer: {
      summary: "Unpivot with UNION ALL: one SELECT per store column, each filtering out NULL prices. Pivot back with conditional aggregation.",
      code: `SELECT product_id, 'store1' AS store, store1 AS price FROM products WHERE store1 IS NOT NULL
UNION ALL
SELECT product_id, 'store2', store2 FROM products WHERE store2 IS NOT NULL
UNION ALL
SELECT product_id, 'store3', store3 FROM products WHERE store3 IS NOT NULL;`,
      points: [
        "UNION ALL keeps every row; UNION would also remove duplicates, which costs a sort.",
        "Column names come from the first SELECT.",
        "MySQL has no PIVOT/UNPIVOT keywords. For a changing list of stores, generate the SQL dynamically (prepared statement) or pivot in application code.",
        "The long format (product_id, store, price) is the normalised design; wide tables are usually for reports.",
      ],
      alt: `-- Pivot back: rows → columns (product_prices = the unpivoted result above)
SELECT product_id,
       MAX(CASE WHEN store = 'store1' THEN price END) AS store1,
       MAX(CASE WHEN store = 'store2' THEN price END) AS store2,
       MAX(CASE WHEN store = 'store3' THEN price END) AS store3
FROM product_prices
GROUP BY product_id;`,
    },
  },

  "sql-q-swap-seats": {
    tables: [{ name: "seat", columns: [["id", "INT PK (1..n, no gaps)"], ["student", "VARCHAR"]] }],
    scenario: "Swap the seat ids of every two consecutive students. If the number of students is odd, the last student keeps their seat. Return the result ordered by id.",
    answer: {
      summary: "Compute a new id: odd ids move to id + 1 (unless it's the last row), even ids move to id - 1. Then order by the new id.",
      code: `SELECT CASE
         WHEN id % 2 = 1 AND id = (SELECT MAX(id) FROM seat) THEN id
         WHEN id % 2 = 1 THEN id + 1
         ELSE id - 1
       END AS id,
       student
FROM seat
ORDER BY id;`,
      points: [
        "The last-odd-row check must come first in the CASE.",
        "This relies on ids being consecutive from 1; with gaps, number the rows with ROW_NUMBER() first.",
        "LEAD/LAG version: an odd row takes the next student's name, an even row takes the previous one.",
      ],
      alt: `SELECT id,
       CASE
         WHEN id % 2 = 1 THEN COALESCE(LEAD(student) OVER (ORDER BY id), student)
         ELSE LAG(student) OVER (ORDER BY id)
       END AS student
FROM seat
ORDER BY id;`,
    },
  },

  // ---------- Classic patterns ----------
  "sql-q-consecutive-numbers": {
    tables: [{ name: "logs", columns: [["id", "INT PK AUTO_INCREMENT"], ["num", "VARCHAR"]] }],
    scenario: "Find all numbers that appear at least three times consecutively (in id order).",
    answer: {
      summary: "Compare each row with the next two rows using LEAD (or the previous two with LAG). If all three are equal, the number qualifies.",
      code: `SELECT DISTINCT num AS consecutive_nums
FROM (
  SELECT num,
         LEAD(num, 1) OVER (ORDER BY id) AS next1,
         LEAD(num, 2) OVER (ORDER BY id) AS next2
  FROM logs
) t
WHERE num = next1 AND num = next2;`,
      points: [
        "DISTINCT because a run of 5 equal numbers matches three times.",
        "The classic triple self-join (l2.id = l1.id + 1, l3.id = l1.id + 2) breaks if ids have gaps; LEAD follows the actual order.",
        "For 'at least N in a row' for any N, use the gaps-and-islands technique and HAVING COUNT(*) >= N.",
      ],
      alt: `SELECT DISTINCT l1.num AS consecutive_nums
FROM logs l1
JOIN logs l2 ON l2.id = l1.id + 1 AND l2.num = l1.num
JOIN logs l3 ON l3.id = l1.id + 2 AND l3.num = l1.num;`,
    },
  },

  "sql-q-gaps-islands": {
    tables: [LOGINS],
    scenario: "For each user, find their login streaks: runs of consecutive calendar days with at least one login. Return user, streak start, streak end and length, plus each user's longest streak.",
    answer: {
      summary:
        "Reduce to one row per user per day. Within a streak, the date minus its row number (as days) is constant, so that difference identifies each island. Group by it.",
      code: `WITH days AS (
  SELECT DISTINCT user_id, DATE(login_at) AS day
  FROM logins
),
grouped AS (
  SELECT user_id, day,
         DATE_SUB(day, INTERVAL ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY day) DAY) AS grp
  FROM days
)
SELECT user_id,
       MIN(day) AS streak_start,
       MAX(day) AS streak_end,
       COUNT(*) AS streak_days
FROM grouped
GROUP BY user_id, grp
ORDER BY user_id, streak_start;`,
      points: [
        "Days 1, 2, 3 have row numbers 1, 2, 3, so day − rn is the same; a gap changes the difference.",
        "DISTINCT first: two logins on the same day would break the arithmetic.",
        "Longest streak per user: wrap the result and take MAX(streak_days) GROUP BY user_id.",
        "The same technique solves consecutive seats, consecutive ids, and uptime/downtime periods.",
      ],
    },
  },

  "sql-q-stadium": {
    tables: [{ name: "stadium", columns: [["id", "INT PK"], ["visit_date", "DATE"], ["people", "INT"]] }],
    scenario: "Return every row that belongs to a run of three or more consecutive ids where each has at least 100 people, ordered by visit_date.",
    answer: {
      summary:
        "Keep rows with people >= 100, then group consecutive ids: id − ROW_NUMBER() is constant within a run. Return rows whose group has at least 3 members.",
      code: `WITH busy AS (
  SELECT id, visit_date, people,
         id - ROW_NUMBER() OVER (ORDER BY id) AS grp
  FROM stadium
  WHERE people >= 100
)
SELECT id, visit_date, people
FROM busy
WHERE grp IN (
  SELECT grp FROM busy GROUP BY grp HAVING COUNT(*) >= 3
)
ORDER BY visit_date;`,
      points: [
        "Filter before numbering, so rows under 100 create gaps in id and split the islands.",
        "COUNT(*) OVER (PARTITION BY grp) avoids the subquery.",
        "The same gaps-and-islands pattern as login streaks, applied to ids.",
      ],
    },
  },

  "sql-q-recursive-hierarchy": {
    tables: [EMPLOYEES_WITH_DEPT_ID],
    scenario: "Given a manager's id, return everyone who reports to them directly or indirectly, with their depth below the manager and the chain of names.",
    answer: {
      summary:
        "WITH RECURSIVE: the anchor selects the direct reports; the recursive step joins employees whose manager is someone already found. Carry depth and a path along.",
      code: `WITH RECURSIVE reports AS (
  SELECT id, name, manager_id, 1 AS depth, CAST(name AS CHAR(1000)) AS path
  FROM employees
  WHERE manager_id = :manager_id

  UNION ALL

  SELECT e.id, e.name, e.manager_id, r.depth + 1, CONCAT(r.path, ' > ', e.name)
  FROM employees e
  JOIN reports r ON e.manager_id = r.id
)
SELECT id, name, depth, path
FROM reports
ORDER BY depth, name;`,
      points: [
        "The recursion stops when a step adds no new rows.",
        "CAST the path wide enough in the anchor: the column type is fixed by the anchor row.",
        "Bad data with a cycle recurses until cte_max_recursion_depth (1000) and fails; add a depth limit or a visited check.",
        "Other uses: category trees, comment threads, bill of materials, generating date series.",
      ],
    },
  },

  "sql-q-cancellation-rate": {
    tables: [
      { name: "trips", columns: [["id", "INT PK"], ["client_id", "INT FK"], ["driver_id", "INT FK"], ["status", "ENUM('completed','cancelled_by_driver','cancelled_by_client')"], ["request_at", "DATE"]] },
      { name: "users", columns: [["users_id", "INT PK"], ["banned", "ENUM('Yes','No')"], ["role", "ENUM('client','driver')"]] },
    ],
    scenario:
      "Compute the cancellation rate for each day between 2013-10-01 and 2013-10-03, counting only trips where neither the client nor the driver is banned. Round to 2 decimals.",
    answer: {
      summary:
        "Join trips to users twice (once as client, once as driver), keep only unbanned pairs and the date range, and average a 'not completed' flag per day.",
      code: `SELECT t.request_at AS day,
       ROUND(AVG(t.status <> 'completed'), 2) AS cancellation_rate
FROM trips t
JOIN users c ON c.users_id = t.client_id AND c.banned = 'No'
JOIN users d ON d.users_id = t.driver_id AND d.banned = 'No'
WHERE t.request_at BETWEEN '2013-10-01' AND '2013-10-03'
GROUP BY t.request_at;`,
      points: [
        "The same table joined twice with different aliases and roles.",
        "With INNER JOIN, a filter in ON or WHERE gives the same result; with LEFT JOIN it wouldn't.",
        "BETWEEN is fine here because request_at is a DATE, not a DATETIME.",
        "AVG(condition) gives the rate directly.",
      ],
    },
  },

  "sql-q-most-friends": {
    tables: [{ name: "request_accepted", columns: [["requester_id", "INT"], ["accepter_id", "INT"], ["accept_date", "DATE"]] }],
    scenario: "Each row is an accepted friend request between two people. Find the person with the most friends and their friend count.",
    answer: {
      summary: "A friendship counts for both people, so stack both columns into one with UNION ALL, then count per id.",
      code: `SELECT id, COUNT(*) AS num
FROM (
  SELECT requester_id AS id FROM request_accepted
  UNION ALL
  SELECT accepter_id FROM request_accepted
) all_ids
GROUP BY id
ORDER BY num DESC
LIMIT 1;`,
      points: [
        "UNION (without ALL) would collapse repeated ids and break the counts.",
        "For ties, compare against the MAX count or use RANK().",
        "Mutual friends of A and B: build each user's friend list the same way, then join on friend id.",
      ],
    },
  },

  "sql-q-tree-node": {
    tables: [{ name: "tree", columns: [["id", "INT PK"], ["p_id", "INT NULL"]] }],
    scenario: "Each node has a parent p_id (NULL for the root). Label each node as 'Root', 'Inner' or 'Leaf'.",
    answer: {
      summary: "Root has no parent. Inner nodes are parents of some other node. Everything else is a leaf.",
      code: `SELECT id,
       CASE
         WHEN p_id IS NULL THEN 'Root'
         WHEN id IN (SELECT p_id FROM tree) THEN 'Inner'
         ELSE 'Leaf'
       END AS type
FROM tree;`,
      points: [
        "Check Root first: a single-node tree's root is not a parent of anything but is still Root.",
        "IN is safe with the NULL in p_id, but NOT IN (SELECT p_id FROM tree) would return nothing because of it.",
        "Depth of each node: a recursive CTE starting from the root.",
      ],
    },
  },
};
