// Query questions: Subqueries & CTEs, Window functions. Shape: see ../sql.js
import { CUSTOMERS, EMPLOYEES, ORDERS, ORDER_ITEMS, PRODUCTS } from "./tables";

const ACTIVITY = {
  name: "activity",
  columns: [["player_id", "INT"], ["device_id", "INT"], ["event_date", "DATE"], ["games_played", "INT"]],
};

export default {
  // ---------- Subqueries & CTEs ----------
  "sql-q-second-highest": {
    tables: [EMPLOYEES],
    scenario: "Find the second highest distinct salary. If there's no second highest salary, return NULL.",
    answer: {
      summary:
        "Take distinct salaries in descending order and skip the first. Wrapping it in an outer SELECT makes an empty result come back as NULL instead of no rows.",
      code: `SELECT (
  SELECT DISTINCT salary
  FROM employees
  ORDER BY salary DESC
  LIMIT 1 OFFSET 1
) AS second_highest_salary;`,
      points: [
        "DISTINCT matters: if two people share the top salary, the second row would otherwise repeat it.",
        "A scalar subquery that returns no rows evaluates to NULL, which satisfies 'return NULL'.",
        "Classic alternative without LIMIT: SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees). MAX over no rows is NULL too.",
      ],
      alt: `SELECT MAX(salary) AS second_highest_salary
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);`,
    },
  },

  "sql-q-nth-highest": {
    tables: [EMPLOYEES],
    scenario: "Write a query (or MySQL function) that returns the Nth highest distinct salary, or NULL if it doesn't exist.",
    answer: {
      summary:
        "Rank distinct salaries with DENSE_RANK() in descending order and pick rank N. DENSE_RANK gives tied salaries the same rank with no gaps, which matches 'Nth highest distinct salary'.",
      code: `SELECT (
  SELECT DISTINCT salary
  FROM (
    SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
    FROM employees
  ) ranked
  WHERE rnk = :n
) AS nth_highest_salary;`,
      points: [
        "ROW_NUMBER breaks ties arbitrarily; RANK leaves gaps (1, 1, 3), so rank 2 might not exist.",
        "LIMIT doesn't accept expressions like N - 1; compute it first (SET n = N - 1 inside a function) and use LIMIT 1 OFFSET n.",
        "Guard N <= 0 if it comes from user input.",
      ],
      alt: `CREATE FUNCTION getNthHighestSalary(N INT) RETURNS INT
DETERMINISTIC
BEGIN
  SET N = N - 1;
  RETURN (
    SELECT DISTINCT salary FROM employees
    ORDER BY salary DESC
    LIMIT 1 OFFSET N
  );
END`,
    },
  },

  "sql-q-correlated": {
    tables: [EMPLOYEES],
    scenario: "Find employees whose salary is above the average salary of their own department.",
    answer: {
      summary:
        "A correlated subquery computes the average for the outer row's department. Joining to pre-computed department averages or using a window function is usually more efficient.",
      code: `SELECT e.name, e.department, e.salary
FROM employees e
WHERE e.salary > (
  SELECT AVG(e2.salary)
  FROM employees e2
  WHERE e2.department = e.department
);`,
      points: [
        "'Correlated' means the inner query references the outer row (e.department), so it's logically evaluated per row.",
        "The derived-table version computes each department average once.",
        "The window version needs only one pass over the table.",
      ],
      alt: `-- Window function version (also shows how far above average)
SELECT name, department, salary, ROUND(salary - dept_avg, 2) AS above_avg_by
FROM (
  SELECT e.*, AVG(salary) OVER (PARTITION BY department) AS dept_avg
  FROM employees e
) t
WHERE salary > dept_avg;`,
    },
  },

  "sql-q-not-exists": {
    tables: [PRODUCTS, ORDER_ITEMS],
    scenario: "Find products that have never been ordered. Write it with NOT EXISTS and explain why NOT IN can give a wrong answer.",
    answer: {
      summary:
        "NOT EXISTS checks that no order line references the product. NOT IN fails when the subquery contains a NULL: 'x NOT IN (1, NULL)' is UNKNOWN for every x, so the query returns nothing.",
      code: `SELECT p.id, p.name
FROM products p
WHERE NOT EXISTS (
  SELECT 1
  FROM order_items oi
  WHERE oi.product_id = p.id
);`,
      points: [
        "NOT IN (SELECT product_id FROM order_items) is only safe if product_id can never be NULL.",
        "EXISTS stops at the first match; SELECT 1 is a convention, since the selected columns don't matter.",
        "LEFT JOIN ... WHERE oi.id IS NULL gives the same result; MySQL 8 turns all three into an anti-join.",
      ],
    },
  },

  "sql-q-cte-steps": {
    tables: [CUSTOMERS, ORDERS],
    scenario: "Find customers whose very first order was worth more than 1,000. Use CTEs to make the steps readable.",
    answer: {
      summary: "Step 1: number each customer's orders by date. Step 2: keep order number 1. Step 3: filter on its total.",
      code: `WITH ranked AS (
  SELECT o.*,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at, id) AS rn
  FROM orders o
),
first_orders AS (
  SELECT customer_id, total
  FROM ranked
  WHERE rn = 1
)
SELECT c.id, c.name, f.total AS first_order_total
FROM first_orders f
JOIN customers c ON c.id = f.customer_id
WHERE f.total > 1000;`,
      points: [
        "CTEs (WITH) name intermediate results, like variables for queries. MySQL 8+.",
        "The id tie-breaker makes 'first' deterministic when two orders share a timestamp.",
        "Without window functions: join orders to (customer_id, MIN(created_at)), but ties then return two rows.",
      ],
    },
  },

  "sql-q-first-login": {
    tables: [ACTIVITY],
    scenario: "Report the first login date for each player.",
    answer: {
      summary: "Group by player and take MIN(event_date).",
      code: `SELECT player_id, MIN(event_date) AS first_login
FROM activity
GROUP BY player_id;`,
      points: [
        "MIN works on dates because dates compare chronologically.",
        "You can't also select device_id here and expect the device of the first login: GROUP BY doesn't keep the row that produced the MIN.",
      ],
      alt: `-- Follow-up: the device used on the first login
SELECT player_id, device_id
FROM (
  SELECT player_id, device_id,
         ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY event_date) AS rn
  FROM activity
) t
WHERE rn = 1;`,
    },
  },

  // ---------- Window functions ----------
  "sql-q-rank-scores": {
    tables: [{ name: "scores", columns: [["id", "INT PK"], ["score", "DECIMAL(3,2)"]] }],
    scenario: "Rank the scores from highest to lowest. Ties get the same rank, and the next rank must be the next consecutive number (no gaps).",
    answer: {
      summary: "DENSE_RANK() OVER (ORDER BY score DESC) gives equal scores the same rank without gaps.",
      code: `SELECT score,
       DENSE_RANK() OVER (ORDER BY score DESC) AS \`rank\`
FROM scores
ORDER BY score DESC;`,
      points: [
        "For scores 100, 90, 90, 80: ROW_NUMBER → 1, 2, 3, 4; RANK → 1, 2, 2, 4; DENSE_RANK → 1, 2, 2, 3.",
        "RANK is a reserved word in MySQL 8, so quote the alias with backticks.",
        "Window functions run after WHERE/GROUP BY/HAVING and before ORDER BY/LIMIT.",
      ],
      alt: `-- Without window functions (MySQL 5.7)
SELECT s.score,
       (SELECT COUNT(DISTINCT s2.score) FROM scores s2 WHERE s2.score >= s.score) AS \`rank\`
FROM scores s
ORDER BY s.score DESC;`,
    },
  },

  "sql-q-top-n-per-group": {
    tables: [
      { name: "employee", columns: [["id", "INT PK"], ["name", "VARCHAR"], ["salary", "INT"], ["department_id", "INT FK"]] },
      { name: "department", columns: [["id", "INT PK"], ["name", "VARCHAR"]] },
    ],
    scenario:
      "Find the employees who earn one of the top three unique salaries in their department. Return department name, employee name and salary.",
    answer: {
      summary:
        "Rank salaries inside each department with DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC), then keep rank <= 3 in an outer query.",
      code: `WITH ranked AS (
  SELECT e.name, e.salary, e.department_id,
         DENSE_RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS rnk
  FROM employee e
)
SELECT d.name AS department, r.name AS employee, r.salary
FROM ranked r
JOIN department d ON d.id = r.department_id
WHERE r.rnk <= 3
ORDER BY d.name, r.salary DESC;`,
      points: [
        "PARTITION BY restarts the ranking for each department.",
        "You can't filter on a window function in the same query's WHERE (it's computed later), hence the CTE.",
        "'Top three unique salaries' → DENSE_RANK; 'exactly 3 people' → ROW_NUMBER (with a tie-breaker).",
        "This 'top N per group' pattern is one of the most asked SQL questions.",
      ],
      alt: `-- Without window functions: fewer than 3 distinct higher salaries in the department
SELECT d.name AS department, e.name AS employee, e.salary
FROM employee e
JOIN department d ON d.id = e.department_id
WHERE (
  SELECT COUNT(DISTINCT e2.salary)
  FROM employee e2
  WHERE e2.department_id = e.department_id AND e2.salary > e.salary
) < 3;`,
    },
  },

  "sql-q-highest-per-dept": {
    tables: [
      { name: "employee", columns: [["id", "INT PK"], ["name", "VARCHAR"], ["salary", "INT"], ["department_id", "INT FK"]] },
      { name: "department", columns: [["id", "INT PK"], ["name", "VARCHAR"]] },
    ],
    scenario: "Find the employees with the highest salary in each department. Include everyone tied for the top.",
    answer: {
      summary: "Match each employee against the maximum salary of their department, using a tuple IN with a grouped subquery, or RANK() = 1.",
      code: `SELECT d.name AS department, e.name AS employee, e.salary
FROM employee e
JOIN department d ON d.id = e.department_id
WHERE (e.department_id, e.salary) IN (
  SELECT department_id, MAX(salary)
  FROM employee
  GROUP BY department_id
);`,
      points: [
        "SELECT department_id, name, MAX(salary) ... GROUP BY department_id is wrong: name isn't tied to the MAX row (and ONLY_FULL_GROUP_BY rejects it).",
        "Tuple comparison (a, b) IN (SELECT x, y ...) is supported in MySQL.",
        "RANK() rather than ROW_NUMBER() keeps ties.",
      ],
      alt: `SELECT department, employee, salary
FROM (
  SELECT d.name AS department, e.name AS employee, e.salary,
         RANK() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS rnk
  FROM employee e
  JOIN department d ON d.id = e.department_id
) t
WHERE rnk = 1;`,
    },
  },

  "sql-q-running-total": {
    tables: [ORDERS],
    scenario: "Show each day's revenue and the running total of revenue up to and including that day.",
    answer: {
      summary: "Aggregate revenue per day first, then apply SUM() OVER (ORDER BY day) to accumulate it.",
      code: `WITH daily AS (
  SELECT DATE(created_at) AS day, SUM(total) AS revenue
  FROM orders
  WHERE status <> 'cancelled'
  GROUP BY DATE(created_at)
)
SELECT day,
       revenue,
       SUM(revenue) OVER (ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM daily
ORDER BY day;`,
      points: [
        "Aggregating per day first means each day appears once in the window.",
        "With ORDER BY and no frame, the default is RANGE UNBOUNDED PRECEDING, which treats rows with equal ORDER BY values as peers and adds them all at once. ROWS makes it strictly row by row.",
        "Reset per month: SUM(revenue) OVER (PARTITION BY DATE_FORMAT(day, '%Y-%m') ORDER BY day).",
      ],
    },
  },

  "sql-q-moving-average": {
    tables: [{ name: "customer", columns: [["customer_id", "INT"], ["name", "VARCHAR"], ["visited_on", "DATE"], ["amount", "INT"]] }],
    scenario:
      "For each day, compute the total amount paid in the 7-day window ending on that day (today plus the 6 previous days) and the average per day, rounded to 2 decimals. Only output days that have a full 7-day window.",
    answer: {
      summary:
        "First sum amounts per day (a day can have many customers). Then use a window frame of the current row and the 6 preceding rows for the sum and average, and skip the first 6 days.",
      code: `WITH daily AS (
  SELECT visited_on, SUM(amount) AS amount
  FROM customer
  GROUP BY visited_on
),
windowed AS (
  SELECT visited_on,
         SUM(amount) OVER w AS amount,
         ROUND(AVG(amount) OVER w, 2) AS average_amount,
         ROW_NUMBER() OVER (ORDER BY visited_on) AS rn
  FROM daily
  WINDOW w AS (ORDER BY visited_on ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)
)
SELECT visited_on, amount, average_amount
FROM windowed
WHERE rn >= 7
ORDER BY visited_on;`,
      points: [
        "Aggregate per day before windowing, or the window counts rows (customers), not days.",
        "ROWS BETWEEN 6 PRECEDING AND CURRENT ROW = 7 rows. That's only 7 days if every day has data.",
        "With missing days, use RANGE BETWEEN INTERVAL 6 DAY PRECEDING AND CURRENT ROW (MySQL 8 supports date RANGE frames) or join to a calendar table.",
        "The named WINDOW clause avoids repeating the frame definition.",
      ],
    },
  },

  "sql-q-rising-temperature": {
    tables: [{ name: "weather", columns: [["id", "INT PK"], ["record_date", "DATE"], ["temperature", "INT"]] }],
    scenario: "Find the ids of all dates whose temperature is higher than the previous day's temperature.",
    answer: {
      summary:
        "Compare each row with yesterday's row. A self-join on 'record_date = yesterday + 1 day' is safest because it also handles missing dates correctly.",
      code: `SELECT w1.id
FROM weather w1
JOIN weather w2
  ON w1.record_date = DATE_ADD(w2.record_date, INTERVAL 1 DAY)
WHERE w1.temperature > w2.temperature;`,
      points: [
        "Don't assume ids are in date order or dates have no gaps.",
        "The LAG version must check the previous row really is the previous calendar day.",
        "DATEDIFF(w1.record_date, w2.record_date) = 1 works as the join condition too, but can't use an index on record_date.",
      ],
      alt: `SELECT id
FROM (
  SELECT id, record_date, temperature,
         LAG(temperature) OVER (ORDER BY record_date) AS prev_temp,
         LAG(record_date) OVER (ORDER BY record_date) AS prev_date
  FROM weather
) t
WHERE temperature > prev_temp
  AND DATEDIFF(record_date, prev_date) = 1;`,
    },
  },

  "sql-q-latest-per-user": {
    tables: [CUSTOMERS, ORDERS],
    scenario: "Return the most recent order for each customer: customer name, order id, total and date.",
    answer: {
      summary:
        "Number each customer's orders from newest to oldest with ROW_NUMBER() and keep number 1. Add a tie-breaker so two orders at the same timestamp don't make the result random.",
      code: `WITH ranked AS (
  SELECT o.id, o.customer_id, o.total, o.created_at,
         ROW_NUMBER() OVER (PARTITION BY o.customer_id ORDER BY o.created_at DESC, o.id DESC) AS rn
  FROM orders o
)
SELECT c.name, r.id AS order_id, r.total, r.created_at
FROM ranked r
JOIN customers c ON c.id = r.customer_id
WHERE r.rn = 1;`,
      points: [
        "An index on (customer_id, created_at) supports the partition and ordering.",
        "The 'greatest-n-per-group' problem: very common in backend reporting.",
        "Pre-window alternative: join orders to (customer_id, MAX(created_at)) per customer; ties return several rows.",
      ],
      alt: `SELECT o.*
FROM orders o
JOIN (
  SELECT customer_id, MAX(created_at) AS latest
  FROM orders
  GROUP BY customer_id
) m ON m.customer_id = o.customer_id AND m.latest = o.created_at;`,
    },
  },

  "sql-q-percent-of-total": {
    tables: [PRODUCTS, ORDER_ITEMS],
    scenario: "For each product, show its revenue and what percentage of its category's total revenue it represents.",
    answer: {
      summary:
        "Group by product to get product revenue, then use SUM(...) OVER (PARTITION BY category) on that aggregate to get the category total on every row.",
      code: `SELECT p.category,
       p.name,
       SUM(oi.quantity * oi.unit_price) AS revenue,
       ROUND(
         100 * SUM(oi.quantity * oi.unit_price)
             / SUM(SUM(oi.quantity * oi.unit_price)) OVER (PARTITION BY p.category),
         2
       ) AS pct_of_category
FROM order_items oi
JOIN products p ON p.id = oi.product_id
GROUP BY p.category, p.id, p.name
ORDER BY p.category, revenue DESC;`,
      points: [
        "Window functions run after GROUP BY, so SUM(SUM(x)) OVER (...) sums the grouped values.",
        "A CTE with product revenue first, then the window, is easier to read in an interview.",
        "Share of the grand total: SUM(...) OVER () with an empty window.",
      ],
    },
  },

  "sql-q-cumulative-limit": {
    tables: [{ name: "queue", columns: [["person_id", "INT PK"], ["person_name", "VARCHAR"], ["weight", "INT"], ["turn", "INT UNIQUE"]] }],
    scenario:
      "People board a bus in order of turn. The bus holds at most 1,000 kg. Return the name of the last person who can board without exceeding the limit.",
    answer: {
      summary: "Compute a running total of weight ordered by turn, keep rows where it's at most 1,000, and take the one with the highest turn.",
      code: `SELECT person_name
FROM (
  SELECT person_name, turn,
         SUM(weight) OVER (ORDER BY turn) AS total_weight
  FROM queue
) t
WHERE total_weight <= 1000
ORDER BY turn DESC
LIMIT 1;`,
      points: [
        "Running totals are the key building block for quota, budget and capacity questions.",
        "turn is unique, so the default RANGE frame gives the same result as ROWS here.",
        "Self-join alternative: sum weights of all people with turn <= current turn.",
      ],
    },
  },

  "sql-q-median": {
    tables: [EMPLOYEES],
    scenario: "Find the median salary of each department. For an even number of employees, the median is the average of the two middle salaries.",
    answer: {
      summary:
        "Number salaries within each department and count them. The middle positions are FLOOR((cnt + 1) / 2) and FLOOR((cnt + 2) / 2); these are the same row for odd counts and the two middle rows for even counts. Average those.",
      code: `WITH ordered AS (
  SELECT department, salary,
         ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary) AS rn,
         COUNT(*) OVER (PARTITION BY department) AS cnt
  FROM employees
)
SELECT department, AVG(salary) AS median_salary
FROM ordered
WHERE rn IN (FLOOR((cnt + 1) / 2), FLOOR((cnt + 2) / 2))
GROUP BY department;`,
      points: [
        "MySQL has no MEDIAN() or PERCENTILE_CONT; this pattern is the standard workaround.",
        "Odd count 5: positions 3 and 3. Even count 4: positions 2 and 3.",
        "The median resists outliers: one CEO salary barely moves it, but drags the average up.",
      ],
    },
  },
};
