// Query questions: Select & filter, Aggregation & GROUP BY, Joins. Shape: see ../sql.js
import { CUSTOMERS, DEPARTMENTS, EMPLOYEES, EMPLOYEES_WITH_DEPT_ID, ORDERS, ORDER_ITEMS, PRODUCTS } from "./tables";

export default {
  // ---------- Select & filter ----------
  "sql-q-select-filter": {
    tables: [EMPLOYEES],
    scenario:
      "Write a query that returns the name and salary of every employee in the Engineering department who earns more than 50,000, highest salary first.",
    answer: {
      summary: "Filter rows with WHERE using both conditions, pick only the columns asked for, and sort with ORDER BY ... DESC.",
      code: `SELECT name, salary
FROM employees
WHERE department = 'Engineering'
  AND salary > 50000
ORDER BY salary DESC;`,
      points: [
        "WHERE runs before SELECT and keeps only rows where every condition is true.",
        "Text values go in single quotes. Comparison is case-insensitive with MySQL's default collation.",
        "Name the columns instead of SELECT *: less data, clearer intent, and it doesn't break when columns are added.",
        "An index on (department, salary) serves both the filter and the sort.",
      ],
      alt: `-- Follow-up: add Product employees over 70,000
SELECT name, department, salary
FROM employees
WHERE (department = 'Engineering' AND salary > 50000)
   OR (department = 'Product' AND salary > 70000)
ORDER BY salary DESC;`,
    },
  },

  "sql-q-null-handling": {
    tables: [{ name: "customers", columns: [["id", "INT PK"], ["name", "VARCHAR"], ["referee_id", "INT NULL"]] }],
    scenario: "Return the names of all customers who were NOT referred by the customer with id 2. Customers who weren't referred by anyone must be included.",
    answer: {
      summary:
        "referee_id <> 2 on its own silently drops customers whose referee_id is NULL, because any comparison with NULL is UNKNOWN, not true. Add an explicit IS NULL check.",
      code: `SELECT name
FROM customers
WHERE referee_id <> 2
   OR referee_id IS NULL;`,
      points: [
        "SQL uses three-valued logic: TRUE, FALSE, UNKNOWN. WHERE keeps only TRUE rows.",
        "NULL <> 2 is UNKNOWN, so those rows vanish without an error. This is one of the most common interview traps.",
        "MySQL's NULL-safe operator: NOT (referee_id <=> 2) also works. <=> treats NULL <=> NULL as true.",
        "COALESCE(referee_id, 0) <> 2 works too, but wrapping the column in a function stops index use.",
      ],
      pitfalls: ["Writing referee_id = NULL or referee_id != NULL: always UNKNOWN, returns nothing."],
    },
  },

  "sql-q-in-between": {
    tables: [ORDERS],
    scenario: "Find all orders placed in March 2024 whose status is either 'shipped' or 'delivered'. created_at is a DATETIME.",
    answer: {
      summary:
        "Use IN for the status list and a half-open date range (>= first moment of March, < first moment of April), so every time on March 31 is included and the column stays index-friendly.",
      code: `SELECT id, customer_id, status, total, created_at
FROM orders
WHERE status IN ('shipped', 'delivered')
  AND created_at >= '2024-03-01'
  AND created_at <  '2024-04-01';`,
      points: [
        "BETWEEN '2024-03-01' AND '2024-03-31' on a DATETIME stops at 2024-03-31 00:00:00 and misses the rest of the last day.",
        "MONTH(created_at) = 3 AND YEAR(created_at) = 2024 is correct but can't use an index on created_at.",
        "IN (...) is shorthand for several ORs, and clearer.",
        "When mixing AND with OR, use parentheses: AND binds tighter than OR.",
      ],
    },
  },

  "sql-q-regexp-email": {
    tables: [{ name: "users", columns: [["user_id", "INT PK"], ["name", "VARCHAR"], ["mail", "VARCHAR"]] }],
    scenario:
      "A valid email has a prefix that starts with a letter and contains only letters, digits, underscore, period or dash, followed by exactly '@leetcode.com'. Return users with valid emails.",
    answer: {
      summary:
        "Use a regular expression (REGEXP_LIKE in MySQL 8) with anchors: ^ for the start, a letter first, an allowed character class for the rest, the escaped domain, and $ for the end.",
      code: `SELECT user_id, name, mail
FROM users
WHERE REGEXP_LIKE(mail, '^[a-zA-Z][a-zA-Z0-9_.-]*@leetcode[.]com$', 'c');`,
      points: [
        "Without ^ and $, the pattern matches anywhere inside the string, so junk before or after passes.",
        "The dot in the domain must be escaped ([.] or \\\\.), otherwise it matches any character.",
        "The 'c' match type makes the match case-sensitive, so '@LEETCODE.com' fails. Plain mail REGEXP '...' follows the column collation, which is usually case-insensitive.",
        "Inside [...], put - at the end so it's a literal dash, not a range.",
        "Regex filters can't use indexes; fine for validation reports, not hot paths.",
      ],
    },
  },

  "sql-q-case-when": {
    tables: [EMPLOYEES],
    scenario:
      "Return each employee's name, salary and a salary band: 'Low' under 30,000, 'Medium' from 30,000 to 80,000, and 'High' above 80,000.",
    answer: {
      summary: "A searched CASE expression evaluates conditions top to bottom and returns the first match; alias it as a new column.",
      code: `SELECT name,
       salary,
       CASE
         WHEN salary < 30000 THEN 'Low'
         WHEN salary <= 80000 THEN 'Medium'
         ELSE 'High'
       END AS salary_band
FROM employees;`,
      points: [
        "Order matters: the second WHEN only runs for rows that failed the first, so salary <= 80000 already implies >= 30000.",
        "Without ELSE, unmatched rows get NULL.",
        "CASE works in SELECT, WHERE, ORDER BY, GROUP BY and inside aggregates.",
      ],
      alt: `-- Follow-up: count per band, showing bands with 0 employees
SELECT b.band, COUNT(e.id) AS employees
FROM (SELECT 'Low' AS band UNION ALL SELECT 'Medium' UNION ALL SELECT 'High') b
LEFT JOIN employees e
  ON b.band = CASE WHEN e.salary < 30000 THEN 'Low'
                   WHEN e.salary <= 80000 THEN 'Medium'
                   ELSE 'High' END
GROUP BY b.band;`,
    },
  },

  "sql-q-limit-offset": {
    tables: [PRODUCTS],
    scenario: "The shop shows 10 products per page, cheapest first. Write the query for page 3.",
    answer: {
      summary: "Page n starts after (n − 1) × page size rows, so page 3 is LIMIT 10 OFFSET 20. Add a unique tie-breaker to ORDER BY so pages are stable.",
      code: `SELECT id, name, price
FROM products
ORDER BY price, id
LIMIT 10 OFFSET 20;`,
      points: [
        "Without a deterministic ORDER BY, rows with the same price can swap between pages.",
        "MySQL also accepts LIMIT 20, 10 (offset first, then count).",
        "OFFSET still reads and discards the skipped rows, so deep pages get slow on big tables.",
      ],
      alt: `-- Keyset pagination: pass the last row of the previous page
SELECT id, name, price
FROM products
WHERE (price, id) > (:last_price, :last_id)
ORDER BY price, id
LIMIT 10;`,
    },
  },

  // ---------- Aggregation & GROUP BY ----------
  "sql-q-count-per-dept": {
    tables: [EMPLOYEES, DEPARTMENTS],
    scenario: "Write a query to find the number of employees in each department.",
    answer: {
      summary: "GROUP BY department makes one group per department, and COUNT(*) counts the rows in each group.",
      code: `SELECT department, COUNT(*) AS employee_count
FROM employees
GROUP BY department
ORDER BY employee_count DESC;`,
      points: [
        "Every column in SELECT must be either in GROUP BY or inside an aggregate function.",
        "COUNT(*) counts rows; COUNT(column) counts non-NULL values in that column.",
        "Departments with no employees don't appear, because there are no rows to group.",
      ],
      alt: `-- Follow-up: include empty departments from a departments table
SELECT d.name, COUNT(e.id) AS employee_count
FROM departments d
LEFT JOIN employees e ON e.department = d.name
GROUP BY d.name;`,
      pitfalls: ["Using COUNT(*) after a LEFT JOIN counts the NULL row as 1 for empty departments; count a column from the right table instead."],
    },
  },

  "sql-q-having-count": {
    tables: [EMPLOYEES],
    scenario: "Write a query to find departments having more than 5 employees.",
    answer: {
      summary: "Group by department, then filter the groups with HAVING COUNT(*) > 5. WHERE can't do this because it runs before grouping and can't see counts.",
      code: `SELECT department, COUNT(*) AS employee_count
FROM employees
GROUP BY department
HAVING COUNT(*) > 5;`,
      points: [
        "Logical order: FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY.",
        "WHERE filters individual rows; HAVING filters whole groups using aggregates.",
        "Row conditions (like hire_date > '2020-01-01') belong in WHERE, so fewer rows get grouped.",
        "'More than 5' is > 5. Read the wording carefully.",
      ],
      pitfalls: ["WHERE COUNT(*) > 5 is a syntax error: aggregates aren't allowed in WHERE."],
    },
  },

  "sql-q-avg-above-company": {
    tables: [EMPLOYEES],
    scenario: "List the departments whose average salary is higher than the average salary of the whole company, with their average.",
    answer: {
      summary: "Compute AVG(salary) per department and compare it in HAVING with a scalar subquery that computes the company-wide average.",
      code: `SELECT department, ROUND(AVG(salary), 2) AS avg_salary
FROM employees
GROUP BY department
HAVING AVG(salary) > (SELECT AVG(salary) FROM employees);`,
      points: [
        "A scalar subquery returns one value; MySQL evaluates it once, not per group.",
        "Compare the unrounded AVG; round only for display.",
        "The company average is the average of employees, not the average of department averages (those differ when department sizes differ).",
      ],
      alt: `-- Follow-up: show both averages and the difference
WITH company AS (SELECT AVG(salary) AS avg_all FROM employees)
SELECT e.department,
       ROUND(AVG(e.salary), 2) AS dept_avg,
       ROUND(c.avg_all, 2) AS company_avg,
       ROUND(AVG(e.salary) - c.avg_all, 2) AS diff
FROM employees e
CROSS JOIN company c
GROUP BY e.department, c.avg_all;`,
    },
  },

  "sql-q-duplicate-emails": {
    tables: [{ name: "person", columns: [["id", "INT PK"], ["email", "VARCHAR"]] }],
    scenario: "Report all emails that appear more than once in the person table.",
    answer: {
      summary: "Group by email and keep the groups with more than one row.",
      code: `SELECT email
FROM person
GROUP BY email
HAVING COUNT(*) > 1;`,
      points: [
        "Each duplicated email is returned once, because there's one group per email.",
        "With a case-insensitive collation 'A@x.com' and 'a@x.com' already group together; otherwise GROUP BY LOWER(TRIM(email)).",
        "The permanent fix is a UNIQUE index on email.",
      ],
      alt: `-- Follow-up: every row involved in a duplicate
SELECT id, email
FROM (SELECT id, email, COUNT(*) OVER (PARTITION BY email) AS cnt FROM person) t
WHERE cnt > 1
ORDER BY email, id;`,
    },
  },

  "sql-q-conditional-agg": {
    tables: [{ name: "transactions", columns: [["id", "INT PK"], ["country", "VARCHAR"], ["state", "ENUM('approved','declined')"], ["amount", "INT"], ["trans_date", "DATE"]] }],
    scenario:
      "For each month and country, return the number of transactions, the number approved, the total amount, and the approved amount. Month format: 'YYYY-MM'.",
    answer: {
      summary:
        "Group by month and country, then use conditional aggregation: SUM(CASE WHEN state = 'approved' ...) counts or adds only approved rows inside the same group.",
      code: `SELECT DATE_FORMAT(trans_date, '%Y-%m') AS month,
       country,
       COUNT(*) AS trans_count,
       SUM(state = 'approved') AS approved_count,
       SUM(amount) AS trans_total_amount,
       SUM(CASE WHEN state = 'approved' THEN amount ELSE 0 END) AS approved_total_amount
FROM transactions
GROUP BY month, country;`,
      points: [
        "In MySQL a comparison returns 1 or 0, so SUM(state = 'approved') counts approved rows. The CASE form is portable to other databases.",
        "Conditional aggregation replaces several separate queries or self-joins with one scan.",
        "Grouping by the SELECT alias (month) works in MySQL; in stricter databases repeat the expression.",
        "NULL country values form their own group; decide whether to keep them.",
      ],
    },
  },

  "sql-q-percentage": {
    tables: [
      { name: "users", columns: [["user_id", "INT PK"], ["user_name", "VARCHAR"]] },
      { name: "register", columns: [["contest_id", "INT"], ["user_id", "INT"]] },
    ],
    scenario:
      "Find the percentage of all users who registered for each contest, rounded to 2 decimals. Order by percentage descending, then contest_id ascending.",
    answer: {
      summary: "Count registrations per contest and divide by the total number of users from a scalar subquery.",
      code: `SELECT contest_id,
       ROUND(COUNT(DISTINCT user_id) * 100 / (SELECT COUNT(*) FROM users), 2) AS percentage
FROM register
GROUP BY contest_id
ORDER BY percentage DESC, contest_id;`,
      points: [
        "The denominator is all users, not just those who registered for anything.",
        "COUNT(DISTINCT user_id) guards against duplicate registrations.",
        "MySQL's / returns a decimal; in Postgres integer / integer truncates, so multiply by 100.0 there.",
      ],
    },
  },

  "sql-q-group-concat": {
    tables: [{ name: "activities", columns: [["sell_date", "DATE"], ["product", "VARCHAR"]] }],
    scenario: "For each date, return the number of different products sold and their names sorted alphabetically, as one comma-separated string.",
    answer: {
      summary: "GROUP BY sell_date with COUNT(DISTINCT product) and GROUP_CONCAT(DISTINCT product ORDER BY product).",
      code: `SELECT sell_date,
       COUNT(DISTINCT product) AS num_sold,
       GROUP_CONCAT(DISTINCT product ORDER BY product SEPARATOR ',') AS products
FROM activities
GROUP BY sell_date
ORDER BY sell_date;`,
      points: [
        "DISTINCT inside both functions removes repeated sales of the same product on a day.",
        "GROUP_CONCAT output is cut off at group_concat_max_len (1024 bytes by default) without an error.",
        "Postgres uses STRING_AGG(DISTINCT product, ',' ORDER BY product).",
      ],
    },
  },

  "sql-q-managers-5-reports": {
    tables: [{ name: "employee", columns: [["id", "INT PK"], ["name", "VARCHAR"], ["department", "VARCHAR"], ["manager_id", "INT NULL"]] }],
    scenario: "Return the names of managers who have at least five direct reports.",
    answer: {
      summary: "Group employees by manager_id, keep managers with COUNT(*) >= 5, and join back to the same table to get their names.",
      code: `SELECT m.name
FROM employee m
JOIN (
  SELECT manager_id
  FROM employee
  WHERE manager_id IS NOT NULL
  GROUP BY manager_id
  HAVING COUNT(*) >= 5
) r ON r.manager_id = m.id;`,
      points: [
        "The derived table finds manager ids; the join turns ids into names.",
        "Joining on id also drops manager_ids that don't exist as employees.",
        "Equivalent: WHERE id IN (SELECT manager_id ... HAVING COUNT(*) >= 5).",
      ],
    },
  },

  "sql-q-most-orders": {
    tables: [ORDERS],
    scenario: "Find the customer_id of the customer who placed the largest number of orders.",
    answer: {
      summary: "Count orders per customer, sort by the count descending and take the first row.",
      code: `SELECT customer_id
FROM orders
GROUP BY customer_id
ORDER BY COUNT(*) DESC
LIMIT 1;`,
      points: [
        "ORDER BY can use an aggregate directly.",
        "LIMIT 1 returns one customer even if several are tied; say so in the interview.",
      ],
      alt: `-- All customers tied for the most orders
WITH counts AS (
  SELECT customer_id, COUNT(*) AS cnt
  FROM orders
  GROUP BY customer_id
)
SELECT customer_id
FROM counts
WHERE cnt = (SELECT MAX(cnt) FROM counts);`,
    },
  },

  // ---------- Joins ----------
  "sql-q-left-join-basic": {
    tables: [EMPLOYEES_WITH_DEPT_ID, DEPARTMENTS],
    scenario: "List every employee's name with their department name. Employees who don't belong to any department must still appear.",
    answer: {
      summary: "LEFT JOIN keeps every row from the left table (employees); where there's no matching department, the department columns come back NULL.",
      code: `SELECT e.name, d.name AS department
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id;`,
      points: [
        "INNER JOIN would drop employees with a NULL or unknown department_id.",
        "Use table aliases and qualify every column when both tables have a column called name.",
        "Follow-up: COALESCE(d.name, 'Unassigned') AS department.",
      ],
    },
  },

  "sql-q-anti-join": {
    tables: [CUSTOMERS, ORDERS],
    scenario: "Find all customers who have never placed an order.",
    answer: {
      summary: "An anti-join: LEFT JOIN orders and keep rows where no order matched (the order's key IS NULL), or use NOT EXISTS.",
      code: `SELECT c.id, c.name
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;`,
      points: [
        "Check a column that's never NULL for a real match (the primary key), not a nullable column.",
        "NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id) is equally clear and fast in MySQL 8.",
        "NOT IN (SELECT customer_id FROM orders) returns zero rows if any customer_id in orders is NULL.",
      ],
      alt: `SELECT c.id, c.name
FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);`,
    },
  },

  "sql-q-self-join-manager": {
    tables: [{ name: "employee", columns: [["id", "INT PK"], ["name", "VARCHAR"], ["salary", "INT"], ["manager_id", "INT NULL"]] }],
    scenario: "Find the employees who earn more than their managers.",
    answer: {
      summary: "Join the employee table to itself: one copy for the employee, one for the manager, matched on e.manager_id = m.id.",
      code: `SELECT e.name AS employee
FROM employee e
JOIN employee m ON m.id = e.manager_id
WHERE e.salary > m.salary;`,
      points: [
        "Self-joins need aliases so each copy can be referenced separately.",
        "Employees without a manager have no match and correctly drop out with an INNER JOIN.",
        "Common in org charts, referrals, and 'compare with previous row' problems.",
      ],
    },
  },

  "sql-q-join-agg": {
    tables: [
      ORDER_ITEMS,
      { name: "products", columns: [["id", "INT PK"], ["name", "VARCHAR"], ["category_id", "INT FK"], ["price", "DECIMAL(10,2)"]] },
      { name: "categories", columns: [["id", "INT PK"], ["name", "VARCHAR"]] },
      ORDERS,
    ],
    scenario: "Report total revenue per product category, from orders that weren't cancelled, highest first.",
    answer: {
      summary:
        "Join order lines to orders (to filter status), products and categories, then SUM(quantity × unit_price) per category. Use the price stored on the order line, since product prices change over time.",
      code: `SELECT c.name AS category,
       SUM(oi.quantity * oi.unit_price) AS revenue
FROM order_items oi
JOIN orders o     ON o.id = oi.order_id
JOIN products p   ON p.id = oi.product_id
JOIN categories c ON c.id = p.category_id
WHERE o.status <> 'cancelled'
GROUP BY c.id, c.name
ORDER BY revenue DESC;`,
      points: [
        "Revenue must come from what was actually charged (order_items.unit_price), not today's products.price.",
        "Filter cancelled orders in WHERE before aggregating.",
        "Group by the category id too: two categories can share a name.",
        "Follow-up with zero-sales categories: start FROM categories and LEFT JOIN the rest, with the status filter moved into the ON clause.",
      ],
    },
  },

  "sql-q-cross-join": {
    tables: [
      { name: "students", columns: [["student_id", "INT PK"], ["student_name", "VARCHAR"]] },
      { name: "subjects", columns: [["subject_name", "VARCHAR PK"]] },
      { name: "examinations", columns: [["student_id", "INT"], ["subject_name", "VARCHAR"]] },
    ],
    scenario: "For every student and every subject, report how many times the student attended that subject's exam, including zero.",
    answer: {
      summary: "CROSS JOIN students and subjects to create every pair, LEFT JOIN the exam attendances on both keys, and count matches.",
      code: `SELECT s.student_id, s.student_name, sub.subject_name,
       COUNT(e.subject_name) AS attended_exams
FROM students s
CROSS JOIN subjects sub
LEFT JOIN examinations e
  ON e.student_id = s.student_id
 AND e.subject_name = sub.subject_name
GROUP BY s.student_id, s.student_name, sub.subject_name
ORDER BY s.student_id, sub.subject_name;`,
      points: [
        "CROSS JOIN produces rows × rows combinations (1,000 students × 20 subjects = 20,000 rows).",
        "COUNT(e.subject_name) counts only real matches; COUNT(*) would count 1 for the NULL row.",
        "Both join conditions must be in ON; putting one in WHERE drops the zero rows.",
      ],
    },
  },

  "sql-q-bought-all": {
    tables: [
      { name: "customer", columns: [["customer_id", "INT"], ["product_key", "INT FK"]] },
      { name: "product", columns: [["product_key", "INT PK"]] },
    ],
    scenario: "Return the ids of customers who bought all the products in the product table.",
    answer: {
      summary: "Count the distinct products each customer bought and keep those whose count equals the total number of products (relational division).",
      code: `SELECT customer_id
FROM customer
GROUP BY customer_id
HAVING COUNT(DISTINCT product_key) = (SELECT COUNT(*) FROM product);`,
      points: [
        "DISTINCT is essential: buying one product 5 times shouldn't count as 5 products.",
        "This assumes product_key in customer always exists in product (a foreign key guarantees it).",
        "Alternative 'double NOT EXISTS': no product exists that this customer didn't buy.",
      ],
    },
  },

  "sql-q-multi-join": {
    tables: [ORDERS, CUSTOMERS, ORDER_ITEMS, PRODUCTS],
    scenario: "List each order line with the order id, order date, customer name, product name and quantity.",
    answer: {
      summary: "Chain joins from orders to customers, and from orders through order_items to products. The result has one row per order line.",
      code: `SELECT o.id AS order_id, o.created_at, c.name AS customer, p.name AS product, oi.quantity
FROM orders o
JOIN customers c   ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p    ON p.id = oi.product_id
ORDER BY o.id;`,
      points: [
        "Each JOIN needs its own ON condition; a missing condition creates a cartesian product.",
        "Joining a one-to-many table multiplies rows: an order with 3 items appears 3 times.",
        "Follow-up: one row per order with GROUP BY o.id and GROUP_CONCAT(p.name).",
      ],
    },
  },

  "sql-q-manager-left": {
    tables: [{ name: "employees", columns: [["employee_id", "INT PK"], ["name", "VARCHAR"], ["manager_id", "INT NULL"], ["salary", "INT"]] }],
    scenario:
      "Find employees earning less than 30,000 whose manager has left the company (the manager_id no longer exists in the table). Order by employee_id.",
    answer: {
      summary: "Self LEFT JOIN on manager_id and keep rows where the manager wasn't found, plus the salary filter.",
      code: `SELECT e.employee_id
FROM employees e
LEFT JOIN employees m ON m.employee_id = e.manager_id
WHERE e.salary < 30000
  AND e.manager_id IS NOT NULL
  AND m.employee_id IS NULL
ORDER BY e.employee_id;`,
      points: [
        "manager_id IS NOT NULL: employees with no manager at all didn't 'lose' one.",
        "NOT IN (SELECT employee_id FROM employees) also works here because employee_id is never NULL.",
        "A foreign key with ON DELETE SET NULL would prevent dangling manager_ids, at the cost of losing that information.",
      ],
    },
  },

  "sql-q-confirmation-rate": {
    tables: [
      { name: "signups", columns: [["user_id", "INT PK"], ["time_stamp", "DATETIME"]] },
      { name: "confirmations", columns: [["user_id", "INT"], ["time_stamp", "DATETIME"], ["action", "ENUM('confirmed','timeout')"]] },
    ],
    scenario:
      "The confirmation rate of a user is confirmed messages divided by total confirmation requests (0 if they made none). Return each user's rate rounded to 2 decimals.",
    answer: {
      summary: "LEFT JOIN signups to confirmations so every user appears, then AVG over a 1/0 expression; users without requests get NULL, which IFNULL turns into 0.",
      code: `SELECT s.user_id,
       ROUND(IFNULL(AVG(c.action = 'confirmed'), 0), 2) AS confirmation_rate
FROM signups s
LEFT JOIN confirmations c ON c.user_id = s.user_id
GROUP BY s.user_id;`,
      points: [
        "AVG of 1s and 0s is the fraction of 1s: a neat trick for rates.",
        "AVG ignores NULLs, so a user with no confirmation rows gets NULL, not 0.",
        "Portable version: SUM(CASE WHEN c.action = 'confirmed' THEN 1 ELSE 0 END) / NULLIF(COUNT(c.user_id), 0).",
      ],
    },
  },
};
