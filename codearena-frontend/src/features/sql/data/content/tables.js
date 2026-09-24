// Table schemas reused by several query questions: { name, columns: [[column, type]] }.

export const EMPLOYEES = {
  name: "employees",
  columns: [["id", "INT PK"], ["name", "VARCHAR"], ["department", "VARCHAR"], ["salary", "INT"]],
};

export const EMPLOYEES_WITH_DEPT_ID = {
  name: "employees",
  columns: [["id", "INT PK"], ["name", "VARCHAR"], ["department_id", "INT NULL FK"], ["salary", "INT"], ["manager_id", "INT NULL"]],
};

export const DEPARTMENTS = {
  name: "departments",
  columns: [["id", "INT PK"], ["name", "VARCHAR"]],
};

export const CUSTOMERS = {
  name: "customers",
  columns: [["id", "INT PK"], ["name", "VARCHAR"], ["city", "VARCHAR"], ["created_at", "DATETIME"]],
};

export const ORDERS = {
  name: "orders",
  columns: [["id", "INT PK"], ["customer_id", "INT FK"], ["status", "VARCHAR"], ["total", "DECIMAL(10,2)"], ["created_at", "DATETIME"]],
};

export const ORDER_ITEMS = {
  name: "order_items",
  columns: [["id", "INT PK"], ["order_id", "INT FK"], ["product_id", "INT FK"], ["quantity", "INT"], ["unit_price", "DECIMAL(10,2)"]],
};

export const PRODUCTS = {
  name: "products",
  columns: [["id", "INT PK"], ["name", "VARCHAR"], ["category", "VARCHAR"], ["price", "DECIMAL(10,2)"]],
};

export const LOGINS = {
  name: "logins",
  columns: [["user_id", "INT"], ["login_at", "DATETIME"]],
};
