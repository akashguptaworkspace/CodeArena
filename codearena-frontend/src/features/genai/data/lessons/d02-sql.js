// Day 2: PostgreSQL with SQLAlchemy 2.0 (async) + Alembic. Merged into d02.js. Shape: see ./index.js

export const sqlalchemy = {
  minutes: 100,
  level: "Intermediate",
  intro:
    "SQLAlchemy is Python's standard way to talk to SQL databases, used by most FastAPI projects. Version 2.0 has a clean, typed style and full async support. Coming from Mongoose (or Sequelize/Prisma), you'll map concepts across quickly; this lesson goes from connecting to Postgres to relationships, transactions and the N+1 problem that interviewers love to ask about.",
  sections: [
    {
      h: "Run Postgres locally and connect",
      blocks: [
        {
          lang: "bash",
          code: `# Postgres 16 with the pgvector extension (you'll need vectors on Day 8)
docker run -d --name shop-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=shop \\
  -p 5432:5432 -v shop-pgdata:/var/lib/postgresql/data pgvector/pgvector:pg16

uv add "sqlalchemy[asyncio]" asyncpg`,
        },
        {
          table: {
            head: ["Piece", "What it is", "Node equivalent"],
            rows: [
              ["PostgreSQL", "The database server", "Same"],
              ["`asyncpg`", "Async Postgres **driver** (talks the wire protocol)", "`pg` (node-postgres)"],
              ["SQLAlchemy **Core**", "SQL expression builder: `select(...)`, `insert(...)`", "Knex query builder"],
              ["SQLAlchemy **ORM**", "Classes mapped to tables, sessions, relationships", "Sequelize / TypeORM / Prisma"],
              ["Alembic", "Migrations for SQLAlchemy models", "Sequelize migrations / Prisma migrate"],
            ],
          },
        },
        {
          lang: "python",
          code: `# app/db/session.py
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import get_settings

engine = create_async_engine(
    get_settings().database_url,          # postgresql+asyncpg://postgres:postgres@localhost:5432/shop
    pool_size=5, max_overflow=10,         # connection pool
    pool_pre_ping=True,                   # drop dead connections before using them
    echo=False,                           # True prints every SQL statement (great while learning)
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_session():                  # FastAPI dependency: one session per request
    async with SessionLocal() as session:
        yield session`,
        },
        {
          list: [
            "The **engine** owns a **connection pool**: a set of open connections reused across requests (opening a DB connection is slow). One engine per app.",
            "A **session** is a unit of work for one request: it tracks objects you load and change, and sends SQL when you flush or commit.",
            "`expire_on_commit=False` keeps objects usable after commit, which avoids surprise lazy reloads in async code.",
          ],
        },
      ],
    },
    {
      h: "Models: tables as Python classes",
      blocks: [
        {
          lang: "python",
          code: `# app/db/base.py
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass`,
        },
        {
          lang: "python",
          code: `# app/models/user.py and app/models/product.py
from datetime import datetime
from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="customer")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    products: Mapped[list["Product"]] = relationship(back_populates="owner")

class Product(Base):
    __tablename__ = "products"
    __table_args__ = (CheckConstraint("price > 0", name="price_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2, asdecimal=False))
    stock: Mapped[int] = mapped_column(default=0)
    category: Mapped[str] = mapped_column(String(50), index=True)
    description: Mapped[str | None]                          # nullable because of "| None"
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    owner: Mapped[User] = relationship(back_populates="products")`,
        },
        {
          table: {
            head: ["Mongoose", "SQLAlchemy 2.0"],
            rows: [
              ["`new Schema({...})`", "`class Product(Base)` with `Mapped[...]` fields"],
              ["`required: true`", "Non-optional type (`Mapped[str]`) → `NOT NULL`"],
              ["Optional field", "`Mapped[str | None]` → nullable"],
              ["`unique: true` / `index: true`", "`mapped_column(unique=True, index=True)`"],
              ["`default: 0`", "`default=0` (Python side) or `server_default=...` (database side)"],
              ["`timestamps: true`", "`created_at` / `updated_at` with `func.now()`"],
              ["`ref: \"User\"` + `populate`", "`ForeignKey(\"users.id\")` + `relationship()` + eager loading"],
              ["Validators", "Pydantic at the API edge + database constraints (`CheckConstraint`, unique)"],
            ],
          },
        },
        {
          tip: "Put rules in the database too (unique, foreign keys, check constraints). Application checks can race when two requests arrive at once; the database is the final guard.",
        },
      ],
    },
    {
      h: "CRUD with the 2.0 query style",
      blocks: [
        "SQLAlchemy 2.0 builds queries with `select()`, `update()`, `delete()` and runs them with `await session.execute(...)` or the `scalars()`/`scalar()` helpers.",
        {
          lang: "python",
          code: `from sqlalchemy import delete, func, select, update

# CREATE
product = Product(name="Masala Chai 250g", price=249, stock=40, category="beverages", owner_id=1)
session.add(product)
await session.commit()                  # INSERT ... RETURNING id
print(product.id)

# READ one
product = await session.get(Product, 42)                                   # by primary key, or None
product = await session.scalar(select(Product).where(Product.name == "Masala Chai 250g"))

# READ many with filters, sorting, pagination
stmt = (select(Product)
        .where(Product.category == "beverages", Product.price >= 100)
        .order_by(Product.price.desc())
        .offset(0).limit(20))
products = (await session.scalars(stmt)).all()

# COUNT (for pagination totals)
total = await session.scalar(select(func.count()).select_from(Product).where(Product.category == "beverages"))

# SEARCH (case-insensitive)
matches = (await session.scalars(select(Product).where(Product.name.ilike("%chai%")))).all()

# UPDATE one object (the session tracks changes)
product.price = 199
await session.commit()                  # UPDATE products SET price=... WHERE id=...

# BULK UPDATE / DELETE without loading rows
await session.execute(update(Product).where(Product.stock == 0).values(category="archived"))
await session.execute(delete(Product).where(Product.id == 42))
await session.commit()`,
        },
        {
          table: {
            head: ["Mongoose", "SQLAlchemy"],
            rows: [
              ["`Product.create({...})`", "`session.add(Product(...)); await session.commit()`"],
              ["`Product.findById(id)`", "`await session.get(Product, id)`"],
              ["`Product.findOne({name})`", "`await session.scalar(select(Product).where(Product.name == name))`"],
              ["`Product.find({...}).sort().skip().limit()`", "`select(Product).where(...).order_by(...).offset(...).limit(...)`"],
              ["`countDocuments`", "`select(func.count()).select_from(Product)`"],
              ["`findByIdAndUpdate`", "load, change attributes, `commit()`; or `update(...)`"],
              ["`deleteOne`", "`await session.delete(obj)` or `delete(Product).where(...)`"],
            ],
          },
        },
        {
          note: "Filters use Python operators on columns: `==`, `!=`, `>=`, `.in_([...])`, `.ilike(...)`, `.is_(None)`, and `and_()`/`or_()`. They're compiled to **parameterised** SQL, so values are never pasted into the query string (safe from SQL injection).",
        },
      ],
    },
    {
      h: "Relationships and the N+1 problem",
      blocks: [
        "Relationships let you navigate between objects: `product.owner`, `user.products`. The trap is **how** related rows are loaded.",
        "**The N+1 problem:** you load 50 products (1 query), then access `product.owner` for each one, triggering 50 more queries: 51 in total. It's slow, and in **async** SQLAlchemy lazy loading isn't even allowed (you get a `MissingGreenlet` error), which forces you to load relationships explicitly.",
        {
          lang: "python",
          code: `from sqlalchemy.orm import joinedload, selectinload

# many-to-one (product → owner): a JOIN in the same query
stmt = select(Product).options(joinedload(Product.owner)).limit(50)
products = (await session.scalars(stmt)).all()
for p in products:
    print(p.name, p.owner.email)          # no extra queries

# one-to-many (user → products): one extra "SELECT ... WHERE owner_id IN (...)" for all users
stmt = select(User).options(selectinload(User.products))
users = (await session.scalars(stmt)).all()`,
        },
        {
          table: {
            head: ["Strategy", "SQL it runs", "Best for"],
            rows: [
              ["Lazy (default)", "A query each time you touch the attribute", "Rarely what you want; not usable in async"],
              ["`joinedload`", "One query with a JOIN", "Many-to-one (product → owner)"],
              ["`selectinload`", "One extra `IN (...)` query per relationship", "One-to-many collections (user → products)"],
            ],
          },
        },
        {
          tip: "While developing, set `echo=True` on the engine and watch how many SQL statements each endpoint runs. Seeing 51 queries for one page is the fastest way to spot N+1.",
        },
      ],
    },
    {
      h: "Transactions",
      blocks: [
        "A transaction groups several changes so they all succeed or all fail (atomicity). Placing an order must decrease stock **and** insert the order together, never just one.",
        {
          lang: "python",
          code: `from sqlalchemy.exc import IntegrityError

async def place_order(session: AsyncSession, user_id: int, product_id: int, qty: int) -> Order:
    async with session.begin():                                   # commits at the end, rolls back on error
        product = await session.get(Product, product_id, with_for_update=True)   # lock the row
        if product is None:
            raise NotFoundError("Product not found")
        if product.stock < qty:
            raise AppError("Not enough stock")
        product.stock -= qty
        order = Order(user_id=user_id, product_id=product_id, qty=qty, total=qty * product.price)
        session.add(order)
    return order

try:
    session.add(User(email="asha@example.com", password_hash="..."))
    await session.commit()
except IntegrityError:                     # e.g. unique constraint on email
    await session.rollback()
    raise ConflictError("Email already registered")`,
        },
        {
          list: [
            "`async with session.begin():` commits when the block ends and rolls back if an exception escapes.",
            "`with_for_update=True` adds `SELECT ... FOR UPDATE`, locking the row so two simultaneous orders can't both take the last item.",
            "Catch `IntegrityError` for constraint violations and turn it into a 409; checking \"does it exist?\" first isn't enough under concurrency.",
          ],
        },
      ],
    },
    {
      h: "Raw SQL, indexes and performance basics",
      blocks: [
        {
          lang: "python",
          code: `from sqlalchemy import text

rows = await session.execute(
    text("SELECT category, COUNT(*) AS n, AVG(price) AS avg_price FROM products "
         "WHERE price > :min GROUP BY category ORDER BY n DESC"),
    {"min": 100},                         # bound parameter, never an f-string
)
for row in rows.mappings():
    print(row["category"], row["n"], round(row["avg_price"], 2))`,
        },
        {
          list: [
            "The ORM is great for CRUD; `text()` or Core is fine for complex reports. Always use bound parameters (`:min`).",
            "**Index** columns you filter, join or sort on (`category`, `owner_id`, `email`). Without an index, Postgres scans the whole table.",
            "Check a slow query with `EXPLAIN ANALYZE` in `psql`: look for `Seq Scan` on large tables.",
            "Too many connections: size the pool per process (`pool_size`), remembering that 4 workers × 15 connections = 60 connections on the database.",
          ],
        },
      ],
    },
    {
      h: "The async repository you'll use in the build",
      blocks: [
        "Here's Day 1's `ProductRepository`, rewritten for Postgres. The method names are the same; they're now `async` and take a session.",
        {
          lang: "python",
          code: `# app/repositories/product_repository.py
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.product import Product

SORTS = {"price": Product.price.asc(), "-price": Product.price.desc(),
         "name": Product.name.asc(), "-created_at": Product.created_at.desc()}

class ProductRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, category, q, sort, offset, limit) -> tuple[list[Product], int]:
        stmt = select(Product)
        if category:
            stmt = stmt.where(Product.category == category)
        if q:
            stmt = stmt.where(Product.name.ilike(f"%{q}%"))
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery()))
        items = await self.session.scalars(stmt.order_by(SORTS[sort]).offset(offset).limit(limit))
        return list(items), total or 0

    async def get(self, product_id: int) -> Product | None:
        return await self.session.get(Product, product_id)

    async def get_by_name(self, name: str) -> Product | None:
        return await self.session.scalar(select(Product).where(func.lower(Product.name) == name.lower()))

    async def add(self, **data) -> Product:
        product = Product(**data)
        self.session.add(product)
        await self.session.commit()
        await self.session.refresh(product)
        return product

    async def update(self, product: Product, **changes) -> Product:
        for key, value in changes.items():
            setattr(product, key, value)
        await self.session.commit()
        await self.session.refresh(product)
        return product

    async def delete(self, product: Product) -> None:
        await self.session.delete(product)
        await self.session.commit()`,
        },
        "`f\"%{q}%\"` here is safe: it builds the **value** passed as a bound parameter to `ILIKE`, not SQL text. The `SORTS` dict is an allow-list, so users can't inject into `ORDER BY`.",
      ],
    },
  ],
  revise: [
    "asyncpg = driver; SQLAlchemy Core = query builder; ORM = mapped classes + sessions; Alembic = migrations.",
    "One engine (with a connection pool) per app; one `AsyncSession` per request via a `yield` dependency; `expire_on_commit=False`.",
    "Models: `class X(Base)`, `Mapped[type]`, `mapped_column(...)`; `| None` = nullable; `ForeignKey` + `relationship(back_populates=...)`.",
    "Queries: `select(M).where(...).order_by(...).offset().limit()`; `session.get`, `scalar`, `scalars().all()`; `func.count()` for totals.",
    "N+1: load relationships explicitly: `joinedload` (many-to-one), `selectinload` (collections). Async forbids lazy loading.",
    "Transactions: `async with session.begin()`; `with_for_update` for row locks; catch `IntegrityError` → 409.",
    "Constraints in the database; indexes on filter/join/sort columns; `EXPLAIN ANALYZE`; bound parameters always.",
  ],
  mistakes: [
    "Accessing a relationship attribute in async code without eager loading (`MissingGreenlet` error).",
    "Sharing one session across requests or background tasks.",
    "Building SQL with f-strings from user input.",
    "\"Check then insert\" for uniqueness without a unique constraint (race conditions).",
    "Forgetting `await` on `session.commit()` or `session.execute()`.",
  ],
  interview: [
    {
      q: "What is the N+1 query problem and how do you fix it?",
      a: "Loading N parent rows with one query and then triggering one more query per row to load a relationship, for N+1 queries total. It's invisible in code but slow in production. Fix it with eager loading: a JOIN (`joinedload`) for many-to-one, or a single batched `IN` query (`selectinload`) for collections, or by writing an explicit join/aggregate query. Detect it by logging SQL (`echo=True`) or with APM tools.",
    },
    {
      q: "Why use a connection pool?",
      a: "Opening a database connection involves network round trips, authentication and server resources, so doing it per request is slow and can exhaust the database's connection limit. A pool keeps a set of open connections that requests borrow and return. You size it per process (`pool_size`, `max_overflow`) with the total across all workers in mind, and enable `pool_pre_ping` to discard dead connections.",
    },
    {
      q: "How do you prevent two users from buying the last item at the same time?",
      a: "Do the check and update inside one transaction with a row lock: `SELECT ... FOR UPDATE` on the product, verify stock, decrement, insert the order, commit. Alternatively an atomic conditional update (`UPDATE products SET stock = stock - 1 WHERE id = :id AND stock >= 1`) and check the affected row count, plus a `CHECK (stock >= 0)` constraint as the final guard.",
    },
    {
      q: "ORM or raw SQL?",
      a: "The ORM speeds up CRUD, relationships and keeps models in one place with type safety; raw SQL or SQLAlchemy Core is clearer and faster to tune for complex reports and bulk operations. I use the ORM by default, drop to Core/`text()` with bound parameters when needed, and always check generated SQL for performance problems like N+1.",
    },
  ],
  practice: [
    "Start Postgres with Docker, create the tables with `Base.metadata.create_all` (just for today), and insert 3 users and 10 products from a script.",
    "Set `echo=True`, list products with their owner's email with and without `joinedload`, and count the SQL statements.",
    "Write `place_order` with a transaction and prove, with two concurrent tasks (`asyncio.gather`), that stock never goes negative.",
  ],
};

export const alembic = {
  minutes: 45,
  level: "Intermediate",
  intro:
    "Your database schema changes as the app grows: new tables, new columns, new indexes. **Migrations** are versioned scripts that apply those changes step by step, the same way on every developer's laptop, CI and production. Alembic is the migration tool for SQLAlchemy, like Sequelize migrations or `prisma migrate`.",
  sections: [
    {
      h: "Why not just `create_all()`?",
      blocks: [
        "`Base.metadata.create_all()` creates missing tables but never **changes** existing ones: it won't add a column, rename anything or add an index to a table that already exists. In production you also need a history of changes, reviewable in pull requests, that you can apply and roll back. That's what migrations are.",
      ],
    },
    {
      h: "Set up Alembic (async)",
      blocks: [
        {
          lang: "bash",
          code: `uv add alembic
uv run alembic init -t async migrations      # creates alembic.ini and migrations/ with an async env.py`,
        },
        "Edit `migrations/env.py` so Alembic knows your models and reads the database URL from your settings:",
        {
          lang: "python",
          code: `# migrations/env.py  (near the top)
from app.core.config import get_settings
from app.db.base import Base
import app.models            # noqa: F401  make sure every model module is imported

config = context.config
config.set_main_option("sqlalchemy.url", get_settings().database_url)
target_metadata = Base.metadata`,
        },
        {
          lang: "python",
          code: `# app/models/__init__.py
from app.models.user import User          # noqa: F401
from app.models.product import Product    # noqa: F401`,
          caption: "Autogenerate only sees models that have been imported, so import them all in one place.",
        },
      ],
    },
    {
      h: "The daily workflow",
      blocks: [
        {
          lang: "bash",
          code: `# 1. change your models (e.g. add Product.description)
# 2. generate a migration by comparing models with the database
uv run alembic revision --autogenerate -m "add product description"
# 3. READ the generated file in migrations/versions/ and fix anything wrong
# 4. apply it
uv run alembic upgrade head

uv run alembic current          # which revision the database is at
uv run alembic history          # list of migrations
uv run alembic downgrade -1     # undo the last migration`,
        },
        {
          lang: "python",
          code: `# migrations/versions/3f2a_add_product_description.py  (generated, then reviewed)
revision = "3f2a..."
down_revision = "9c1b..."

def upgrade() -> None:
    op.add_column("products", sa.Column("description", sa.String(), nullable=True))
    op.create_index("ix_products_category", "products", ["category"])

def downgrade() -> None:
    op.drop_index("ix_products_category", table_name="products")
    op.drop_column("products", "description")`,
        },
        {
          warn: "Autogenerate is a draft, not the truth. It can't detect renames (it sees a drop plus an add, which **loses data**), and it misses some changes (certain constraint and type changes). Always read and edit the migration before applying it.",
        },
      ],
    },
    {
      h: "Safe migrations on a live database",
      blocks: [
        {
          list: [
            "**Adding a NOT NULL column to a table with data** fails unless you give a default. Add it as nullable, backfill values, then make it NOT NULL in a second migration.",
            "**Renaming a column** that running code still uses breaks the app. Use expand → migrate → contract: add the new column, write to both, backfill, switch reads, then drop the old column later.",
            "**Data migrations** (changing existing values) can live in migration files with `op.execute(...)`, but keep them small and idempotent.",
            "Run `alembic upgrade head` as a **separate deployment step** (a one-off job) before starting new app versions, not inside every app process at startup.",
            "Commit migration files to Git; never edit a migration that has already run in production. Write a new one instead.",
          ],
        },
      ],
    },
  ],
  revise: [
    "Migrations = versioned, reviewable schema changes applied the same everywhere; `create_all` can't alter existing tables.",
    "`alembic init -t async migrations`; in `env.py` set the URL from settings and `target_metadata = Base.metadata`; import all models.",
    "Workflow: change models → `revision --autogenerate -m` → **review** → `upgrade head`; `downgrade -1` to undo.",
    "Autogenerate can't see renames (drop + add = data loss); always edit the draft.",
    "Live databases: nullable → backfill → NOT NULL; expand/migrate/contract for renames; run migrations as a separate deploy step.",
  ],
  interview: [
    {
      q: "How do you manage database schema changes in a Python project?",
      a: "With Alembic migrations: every schema change is a versioned script generated from model changes (`alembic revision --autogenerate`), reviewed and edited by hand, committed with the code change, and applied with `alembic upgrade head` in CI and as a separate deployment step. For zero-downtime changes I use backward-compatible steps: add nullable columns and backfill, and expand-then-contract for renames.",
    },
    {
      q: "What can go wrong with autogenerated migrations?",
      a: "Autogenerate compares models with the database, so it interprets a rename as drop plus add (losing data), misses some changes such as certain server defaults, constraint names or type changes depending on configuration, and only sees models that are imported. It also generates no data migrations. That's why every generated migration must be reviewed.",
    },
  ],
  practice: [
    "Set up Alembic in your Shop API, generate the initial migration, apply it, then add a `description` column with a second migration and roll it back with `downgrade -1`.",
  ],
};
