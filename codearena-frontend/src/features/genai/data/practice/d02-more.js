// Day 2 practice, part 2: REST design, SQLAlchemy, Alembic, auth, MongoDB, testing. Merged into d02.js.

export const moreGroups = [
  {
    title: "REST API design",
    exercises: [
      {
        id: "error-format",
        title: "One error shape for every error",
        level: "Medium",
        task: [
          "In a small FastAPI app, make **every** error use `{\"error\": {\"code\", \"message\", \"details\"}}`: your own `NotFoundError`, FastAPI's validation errors (422) and `HTTPException`. Add three routes that trigger each one and check them with curl.",
        ],
        solution: `from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.exceptions import HTTPException as StarletteHTTPException

app = FastAPI()

class AppError(Exception):
    status_code, code = 400, "bad_request"
    def __init__(self, message: str):
        super().__init__(message); self.message = message

class NotFoundError(AppError):
    status_code, code = 404, "not_found"

def body(code, message, details=None):
    return {"error": {"code": code, "message": message, "details": details or []}}

@app.exception_handler(AppError)
async def app_error(request: Request, exc: AppError):
    return JSONResponse(status_code=exc.status_code, content=body(exc.code, exc.message))

@app.exception_handler(RequestValidationError)
async def validation(request: Request, exc: RequestValidationError):
    details = [{"field": ".".join(map(str, e["loc"][1:])), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=422, content=body("validation_error", "Some fields are invalid", details))

@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content=body("http_error", str(exc.detail)))

class Item(BaseModel):
    price: float = Field(gt=0)

@app.get("/items/{item_id}")
def get_item(item_id: int):
    raise NotFoundError(f"Item {item_id} not found")

@app.post("/items")
def create_item(item: Item):
    return item

@app.get("/admin")
def admin():
    raise HTTPException(403, "Admins only")

# curl localhost:8000/items/5                          → 404 not_found
# curl -X POST localhost:8000/items -H "Content-Type: application/json" -d '{"price": -1}'   → 422
# curl localhost:8000/admin                            → 403 http_error
# curl localhost:8000/does-not-exist                   → 404 http_error (routing errors too)`,
        explanation: [
          "FastAPI's `HTTPException` subclasses Starlette's, so handling the Starlette class also covers FastAPI's and the router's own 404/405 errors.",
          "`e[\"loc\"]` looks like `(\"body\", \"price\")`; dropping the first element gives the field name the frontend cares about.",
          "A consistent error shape lets your React code handle errors in one place, and `code` lets it branch without parsing messages.",
        ],
        concepts: [
          ["Exception handler", "A function that turns a raised exception into an HTTP response."],
          ["`RequestValidationError`", "What FastAPI raises when request data fails validation (422)."],
        ],
      },
      {
        id: "paginate-filter-sort",
        title: "Pagination, filtering and safe sorting",
        level: "Medium",
        task: [
          "Using an in-memory list of 50 generated products, build `GET /products` with `page`, `size` (max 50), `category`, `min_price` and `sort` (`price`, `-price`, `name`). Return `{items, total, page, size}`. An unknown sort value must return 422.",
        ],
        solution: `import random
from typing import Literal
from fastapi import FastAPI, Query

app = FastAPI()
random.seed(1)
PRODUCTS = [{"id": i, "name": f"Product {i:02d}", "price": round(random.uniform(50, 2000), 2),
             "category": random.choice(["tea", "snacks", "kitchen"])} for i in range(1, 51)]
SORT_KEYS = {"price": ("price", False), "-price": ("price", True), "name": ("name", False)}

@app.get("/products")
def list_products(page: int = Query(1, ge=1), size: int = Query(10, ge=1, le=50),
                  category: str | None = None, min_price: float | None = Query(None, ge=0),
                  sort: Literal["price", "-price", "name"] = "name"):
    rows = [p for p in PRODUCTS
            if (category is None or p["category"] == category)
            and (min_price is None or p["price"] >= min_price)]
    field, reverse = SORT_KEYS[sort]
    rows.sort(key=lambda p: (p[field], p["id"]), reverse=reverse)
    start = (page - 1) * size
    return {"items": rows[start:start + size], "total": len(rows), "page": page, "size": size}

# /products?category=tea&sort=-price&page=2&size=5
# /products?sort=drop_table   → 422 (not in the Literal)`,
        explanation: [
          "Filters are applied first, then the total is counted, then one page is sliced, which is the same order a SQL query uses (`WHERE` → `COUNT` → `ORDER BY ... LIMIT/OFFSET`).",
          "`Literal[...]` is an allow-list: FastAPI rejects anything else before your code runs, which is how you keep user input out of `ORDER BY` in SQL.",
          "Sorting by `(field, id)` gives a stable order when values tie, so items don't jump between pages.",
        ],
        concepts: [
          ["Offset pagination", "`page`/`size` translated to skip `(page-1)*size` items and take `size`."],
          ["Allow-list", "Accept only known values; reject everything else."],
        ],
      },
    ],
  },
  {
    title: "PostgreSQL with SQLAlchemy",
    exercises: [
      {
        id: "sa-models-seed",
        title: "Models, tables and seed data",
        level: "Easy",
        task: [
          "With Postgres running in Docker, define `User` and `Product` models (one user has many products), create the tables with `Base.metadata.create_all`, and seed 3 users and 12 products from an async script. Print the row counts.",
          { lang: "bash", code: `docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=shop -p 5432:5432 pgvector/pgvector:pg16\nuv add "sqlalchemy[asyncio]" asyncpg` },
        ],
        solution: `# seed.py
import asyncio, random
from sqlalchemy import ForeignKey, String, func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

class Base(DeclarativeBase): ...

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    products: Mapped[list["Product"]] = relationship(back_populates="owner")

class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    price: Mapped[float]
    category: Mapped[str] = mapped_column(String(50), index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    owner: Mapped[User] = relationship(back_populates="products")

engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:5432/shop", echo=False)
Session = async_sessionmaker(engine, expire_on_commit=False)

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with Session() as s:
        users = [User(email=f"user{i}@shop.in") for i in range(1, 4)]
        s.add_all(users)
        random.seed(2)
        s.add_all(Product(name=f"Item {i}", price=round(random.uniform(50, 1500), 2),
                          category=random.choice(["tea", "snacks", "kitchen"]), owner=random.choice(users))
                  for i in range(1, 13))
        await s.commit()
        print("users:", await s.scalar(select(func.count()).select_from(User)))
        print("products:", await s.scalar(select(func.count()).select_from(Product)))
    await engine.dispose()

if __name__ == "__main__":        # other exercises import models from this file without re-seeding
    asyncio.run(main())`,
        explanation: [
          "`engine.begin()` opens a connection with a transaction; `run_sync` runs the synchronous `create_all` inside the async connection.",
          "Setting `owner=user` (the relationship) fills in `owner_id` automatically when the rows are inserted.",
          "`create_all` is fine for practice scripts; real apps use Alembic migrations.",
        ],
        concepts: [
          ["`DeclarativeBase`", "The base class your SQLAlchemy models inherit from."],
          ["`Mapped[...]` / `mapped_column`", "Declares a column with its Python type and database options."],
          ["`relationship()`", "An attribute that links related objects (`product.owner`, `user.products`)."],
        ],
      },
      {
        id: "sa-queries",
        title: "Translate Mongoose queries to SQLAlchemy",
        level: "Medium",
        task: [
          "Using the seeded database, write SQLAlchemy versions of these Mongoose queries and print the results:",
          {
            lang: "javascript",
            code: `Product.find({ category: "tea", price: { $gte: 200 } }).sort({ price: -1 }).limit(3)
Product.countDocuments({ category: "snacks" })
Product.find({ name: /item 1/i })
Product.aggregate([{ $group: { _id: "$category", avg: { $avg: "$price" }, n: { $sum: 1 } } }])
User.findOne({ email: "user1@shop.in" }).populate("products")`,
          },
        ],
        solution: `import asyncio
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from seed import Product, Session, User, engine

async def main():
    async with Session() as s:
        tea = await s.scalars(select(Product)
                              .where(Product.category == "tea", Product.price >= 200)
                              .order_by(Product.price.desc()).limit(3))
        print([(p.name, p.price) for p in tea])

        print(await s.scalar(select(func.count()).select_from(Product)
                             .where(Product.category == "snacks")))

        found = await s.scalars(select(Product).where(Product.name.ilike("%item 1%")))
        print([p.name for p in found])

        rows = await s.execute(select(Product.category, func.avg(Product.price), func.count())
                               .group_by(Product.category))
        print([(c, round(avg, 2), n) for c, avg, n in rows])

        user = await s.scalar(select(User).options(selectinload(User.products))
                              .where(User.email == "user1@shop.in"))
        print(user.email, [p.name for p in user.products])
    await engine.dispose()

asyncio.run(main())`,
        explanation: [
          "`where(a, b)` with several conditions means AND; `.order_by(col.desc())` replaces `sort({price: -1})`.",
          "Aggregations are just `select` of `func.avg`, `func.count` with `group_by`, like SQL `GROUP BY`.",
          "`populate` becomes eager loading with `selectinload`; without it, accessing `user.products` in async code raises an error.",
        ],
        concepts: [
          ["`scalars()` vs `execute()`", "`scalars` returns objects from the first column; `execute` returns rows with several columns."],
          ["`group_by`", "SQL aggregation per group, the equivalent of `$group`."],
          ["`selectinload`", "Eager-loads a collection with one extra `IN` query."],
        ],
      },
      {
        id: "sa-n-plus-one",
        title: "See the N+1 problem with your own eyes",
        level: "Medium",
        task: [
          "Turn on SQL logging (`echo=True`). List all products with their owner's email two ways: (1) loading owners one by one with `session.get(User, p.owner_id)`, (2) with `joinedload(Product.owner)`. Count the SQL statements for each.",
        ],
        solution: `import asyncio
from sqlalchemy import event, select
from sqlalchemy.orm import joinedload
from seed import Product, Session, User, engine

count = {"n": 0}

@event.listens_for(engine.sync_engine, "before_cursor_execute")
def on_query(*args):
    count["n"] += 1

async def main():
    async with Session() as s:
        count["n"] = 0
        products = (await s.scalars(select(Product))).all()
        for p in products:
            owner = await s.execute(select(User.email).where(User.id == p.owner_id))
            owner.scalar()
        print("one query per product (N+1):", count["n"], "queries")

    async with Session() as s:
        count["n"] = 0
        products = (await s.scalars(select(Product).options(joinedload(Product.owner)))).all()
        emails = [p.owner.email for p in products]
        print("joinedload:", count["n"], "query")
    await engine.dispose()

asyncio.run(main())`,
        explanation: [
          "The first version runs 1 query for products plus 1 per product: 13 queries for 12 products, and it grows with every row.",
          "`joinedload` fetches products and owners in a single JOIN query: 1 query no matter how many rows.",
          "The event listener counts every SQL statement sent to the database. It's a handy trick for spotting N+1 in tests.",
        ],
        concepts: [
          ["N+1 problem", "1 query for a list plus 1 query per item for related data."],
          ["`joinedload`", "Eager-loads a related object in the same query using a JOIN."],
          ["SQLAlchemy events", "Hooks that run on database activity, e.g. before each statement."],
        ],
      },
      {
        id: "sa-transaction",
        title: "Stop two buyers taking the last item",
        level: "Hard",
        task: [
          "Give one product `stock = 1`. Write `buy(product_id)` that decrements stock inside a transaction with a row lock (`with_for_update=True`) and raises if stock is 0. Run 5 buyers at once with `asyncio.gather` (each with its own session) and show that exactly one succeeds.",
        ],
        solution: `import asyncio
from sqlalchemy import CheckConstraint, String
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase): ...

class StockItem(Base):
    __tablename__ = "stock_items"
    __table_args__ = (CheckConstraint("stock >= 0", name="stock_not_negative"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    stock: Mapped[int]

engine = create_async_engine("postgresql+asyncpg://postgres:postgres@localhost:5432/shop")
Session = async_sessionmaker(engine, expire_on_commit=False)

class OutOfStock(Exception): ...

async def buy(buyer: int, item_id: int) -> str:
    async with Session() as s, s.begin():                     # commit at the end, rollback on error
        item = await s.get(StockItem, item_id, with_for_update=True)   # SELECT ... FOR UPDATE
        if item.stock < 1:
            raise OutOfStock(f"buyer {buyer}: sold out")
        item.stock -= 1
    return f"buyer {buyer}: bought it"

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    async with Session() as s, s.begin():
        s.add(StockItem(id=1, name="Last Pressure Cooker", stock=1))

    results = await asyncio.gather(*(buy(i, 1) for i in range(5)), return_exceptions=True)
    for r in results:
        print(r)
    async with Session() as s:
        print("stock left:", (await s.get(StockItem, 1)).stock)       # 0, never negative
    await engine.dispose()

asyncio.run(main())`,
        explanation: [
          "`SELECT ... FOR UPDATE` locks the row until the transaction ends, so the other four buyers wait, then see `stock = 0` and fail with `OutOfStock`.",
          "Without the lock, several buyers could read `stock = 1` at the same moment and all \"buy\" it: a classic race condition. Try removing `with_for_update=True`; the `CHECK (stock >= 0)` constraint then turns the bug into database errors instead of silent overselling.",
          "`async with Session() as s, s.begin():` opens a session and a transaction in one line: it commits when the block ends and rolls back if an exception escapes.",
        ],
        concepts: [
          ["Transaction", "A group of changes that succeed or fail together."],
          ["Row lock (`FOR UPDATE`)", "Prevents other transactions changing a row until you finish."],
          ["Race condition", "A bug caused by two operations interleaving at the wrong moment."],
        ],
      },
    ],
  },
  {
    title: "Migrations with Alembic",
    exercises: [
      {
        id: "alembic-flow",
        title: "Add a column with a migration, then roll it back",
        level: "Medium",
        task: [
          "In your Shop API: initialise Alembic (async template), generate and apply the initial migration, then add `Product.discount_percent: Mapped[int] = mapped_column(default=0, server_default=\"0\")`, generate a second migration, apply it, inspect the table, and finally `downgrade -1`.",
        ],
        solution: `uv run alembic init -t async migrations
# edit migrations/env.py: set sqlalchemy.url from settings, target_metadata = Base.metadata, import app.models

uv run alembic revision --autogenerate -m "initial tables"
uv run alembic upgrade head

# add the column to app/models/product.py:
#   discount_percent: Mapped[int] = mapped_column(default=0, server_default="0")

uv run alembic revision --autogenerate -m "add discount_percent"
# review the file: it should contain op.add_column(... server_default='0' ...) and a matching drop in downgrade()
uv run alembic upgrade head
docker compose exec db psql -U postgres -d shop -c "\\d products"

uv run alembic downgrade -1
uv run alembic current
uv run alembic history --verbose`,
        explanation: [
          "`server_default=\"0\"` matters: adding a NOT NULL column to a table that already has rows fails unless the database knows what to put in existing rows.",
          "Always read the generated migration before applying it. Autogenerate is a draft.",
          "`downgrade -1` runs the `downgrade()` function of the latest migration, so write it carefully too.",
        ],
        concepts: [
          ["Migration", "A versioned script that changes the database schema."],
          ["`server_default`", "A default applied by the database itself, which also fills existing rows."],
          ["`alembic current` / `history`", "Show the database's revision and the list of migrations."],
        ],
      },
    ],
  },
  {
    title: "Authentication",
    exercises: [
      {
        id: "hash-jwt",
        title: "Hash passwords and sign/verify JWTs",
        level: "Easy",
        task: [
          "With `pwdlib` and `pyjwt`: hash a password twice and show the two hashes differ but both verify. Create a JWT with `sub` and a 1-minute `exp`, decode it, then (a) tamper with one character and (b) create one that's already expired, and show both are rejected.",
          { lang: "bash", code: `uv add "pwdlib[argon2]" pyjwt` },
        ],
        solution: `from datetime import datetime, timedelta, timezone
import jwt
from pwdlib import PasswordHash

hasher = PasswordHash.recommended()
h1, h2 = hasher.hash("chai-lover-123"), hasher.hash("chai-lover-123")
print(h1 != h2, hasher.verify("chai-lover-123", h1), hasher.verify("wrong", h1))   # True True False

SECRET, ALG = "practice-secret-change-me", "HS256"
now = datetime.now(timezone.utc)
token = jwt.encode({"sub": "42", "exp": now + timedelta(minutes=1)}, SECRET, algorithm=ALG)
print(jwt.decode(token, SECRET, algorithms=[ALG]))

tampered = token[:-2] + ("A" if token[-2] != "A" else "B") + token[-1]
expired = jwt.encode({"sub": "42", "exp": now - timedelta(seconds=1)}, SECRET, algorithm=ALG)
for name, t in [("tampered", tampered), ("expired", expired)]:
    try:
        jwt.decode(t, SECRET, algorithms=[ALG])
    except jwt.ExpiredSignatureError:
        print(name, "→ rejected: expired")
    except jwt.InvalidTokenError as e:
        print(name, "→ rejected:", type(e).__name__)`,
        explanation: [
          "The hashes differ because each includes a random **salt**, yet both verify: that's how password hashing is supposed to work.",
          "Changing any character breaks the signature, so the server can trust claims inside a valid token.",
          "`exp` is checked automatically by `jwt.decode`. Always pass `algorithms=[...]`.",
          "Paste the token into jwt.io: you can read the payload without the secret. JWTs are signed, not encrypted.",
        ],
        concepts: [
          ["Salt", "Random data mixed into a hash so equal passwords get different hashes."],
          ["JWT claims", "Fields in the token payload: `sub` (subject/user id), `exp` (expiry), `iat` (issued at)."],
          ["Signature", "Proof that the token was created by someone holding the secret and hasn't been changed."],
        ],
      },
      {
        id: "protect-ownership",
        title: "Protect routes and enforce ownership",
        level: "Medium",
        task: [
          "Build a mini API with an in-memory user store: `POST /login` returns a JWT, `GET /notes` returns only the caller's notes, `DELETE /notes/{id}` returns 404 when the note belongs to someone else. Use `OAuth2PasswordBearer` and a `get_current_user` dependency. Test it in Swagger with two users.",
        ],
        solution: `from datetime import datetime, timedelta, timezone
from typing import Annotated
import jwt
from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

app = FastAPI()
SECRET, ALG = "practice-secret-change-me", "HS256"
USERS = {"asha@x.in": {"id": 1, "password": "pass-asha"}, "ravi@x.in": {"id": 2, "password": "pass-ravi"}}
NOTES = {1: {"owner": 1, "text": "Asha's note"}, 2: {"owner": 2, "text": "Ravi's note"}}   # plain passwords only for practice!
oauth2 = OAuth2PasswordBearer(tokenUrl="/login")

@app.post("/login")
def login(form: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = USERS.get(form.username)
    if not user or user["password"] != form.password:
        raise HTTPException(401, "Incorrect email or password")
    exp = datetime.now(timezone.utc) + timedelta(minutes=30)
    return {"access_token": jwt.encode({"sub": str(user["id"]), "exp": exp}, SECRET, ALG), "token_type": "bearer"}

def current_user_id(token: Annotated[str, Depends(oauth2)]) -> int:
    try:
        return int(jwt.decode(token, SECRET, algorithms=[ALG])["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(401, "Invalid token", headers={"WWW-Authenticate": "Bearer"})

UserId = Annotated[int, Depends(current_user_id)]

@app.get("/notes")
def my_notes(user_id: UserId):
    return [{"id": i, **n} for i, n in NOTES.items() if n["owner"] == user_id]

@app.delete("/notes/{note_id}", status_code=204)
def delete_note(note_id: int, user_id: UserId):
    note = NOTES.get(note_id)
    if note is None or note["owner"] != user_id:
        raise HTTPException(404, "Note not found")      # don't reveal other users' notes exist
    del NOTES[note_id]`,
        explanation: [
          "The user id always comes from the verified token, never from the URL or body. That's the core rule that prevents IDOR bugs.",
          "Returning 404 for someone else's note hides whether it exists.",
          "Click **Authorize** in `/docs`, log in as Asha, and try deleting note 2: 404. Log in as Ravi and it works.",
          "Plain-text passwords are only here to keep the exercise short; the Shop API build uses Argon2 hashes.",
        ],
        concepts: [
          ["`OAuth2PasswordBearer`", "Reads the bearer token from the Authorization header and adds the Authorize button to Swagger."],
          ["IDOR", "Accessing another user's object by changing an id; prevented by ownership checks."],
        ],
      },
    ],
  },
  {
    title: "MongoDB and testing",
    exercises: [
      {
        id: "beanie-crud",
        title: "Beanie CRUD and an aggregation",
        level: "Medium",
        task: [
          "With MongoDB in Docker and Beanie: define `ProductDoc`, insert 10 products, update one price, delete one, find all `tea` products under ₹500 sorted by price, and compute count and average price per category with an aggregation.",
          { lang: "bash", code: `docker run -d --name mongo -p 27017:27017 mongo:7\nuv add beanie` },
        ],
        solution: `import asyncio, random
from typing import Annotated
from beanie import Document, Indexed, init_beanie
from pymongo import AsyncMongoClient

class ProductDoc(Document):
    name: Annotated[str, Indexed(unique=True)]
    price: float
    category: str
    class Settings:
        name = "products"

async def main():
    client = AsyncMongoClient("mongodb://localhost:27017")
    await init_beanie(database=client["practice"], document_models=[ProductDoc])
    await ProductDoc.delete_all()

    random.seed(3)
    for i in range(1, 11):
        await ProductDoc(name=f"Item {i}", price=round(random.uniform(50, 900), 2),
                         category=random.choice(["tea", "snacks"])).insert()

    first = await ProductDoc.find_one(ProductDoc.name == "Item 1")
    await first.set({ProductDoc.price: 99})
    await (await ProductDoc.find_one(ProductDoc.name == "Item 2")).delete()

    cheap_tea = await ProductDoc.find(ProductDoc.category == "tea", ProductDoc.price < 500) \\
                                .sort(+ProductDoc.price).to_list()
    print([(p.name, p.price) for p in cheap_tea])

    stats = await ProductDoc.aggregate([
        {"$group": {"_id": "$category", "n": {"$sum": 1}, "avg": {"$avg": "$price"}}},
        {"$sort": {"n": -1}},
    ]).to_list()
    print(stats)
    await client.close()

asyncio.run(main())`,
        explanation: [
          "Beanie documents are Pydantic models, so the same class validates data and maps to a collection.",
          "Query expressions like `ProductDoc.price < 500` compile to Mongo filters (`{\"price\": {\"$lt\": 500}}`); raw dict filters work too.",
          "Aggregation pipelines are the same stages you know from Mongoose.",
          "If your Beanie version is older, replace `AsyncMongoClient` with Motor's `AsyncIOMotorClient`.",
        ],
        concepts: [
          ["Beanie `Document`", "A Pydantic model stored as a MongoDB document."],
          ["`init_beanie`", "Connects Beanie to a database and registers document models (like `mongoose.connect`)."],
          ["Aggregation pipeline", "A list of stages (`$match`, `$group`, `$sort`) that transform documents."],
        ],
      },
      {
        id: "async-tests",
        title: "Async API tests with a fresh database per test",
        level: "Hard",
        task: [
          "For your upgraded Shop API, write `tests/conftest.py` with an in-memory SQLite database per test (overriding `get_session`), an `AsyncClient`, and a helper that registers and logs in a user. Then write 4 tests: create requires auth (401), create works (201), duplicate name (409), and another user gets 404 on PATCH.",
        ],
        hint: "Install `pytest-asyncio httpx aiosqlite` and set `asyncio_mode = \"auto\"` in `[tool.pytest.ini_options]`. Set `JWT_SECRET` in `os.environ` before importing the app.",
        solution: `# The complete conftest.py and tests are in today's build guide ("Upgrade the Shop API", Step 10).
# The core pieces:

@pytest.fixture
async def client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def override_session():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_session] = override_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
    await engine.dispose()

async def test_other_user_gets_404(client):
    asha = await login(client, "asha@test.com")
    pid = (await client.post("/api/v1/products", json=CHAI, headers=asha)).json()["id"]
    ravi = await login(client, "ravi@test.com")
    r = await client.patch(f"/api/v1/products/{pid}", json={"price": 1}, headers=ravi)
    assert r.status_code == 404`,
        explanation: [
          "Each test gets a brand-new empty database, so tests never affect each other and can run in any order.",
          "`ASGITransport` sends requests straight into the app in the same event loop as your async fixtures, with no server process.",
          "Try writing the whole file yourself first; then compare with the build guide's Step 10.",
        ],
        concepts: [
          ["Fixture", "Setup code that pytest runs for a test and injects by parameter name."],
          ["Dependency override", "Replacing a FastAPI dependency (like the DB session) in tests."],
          ["Test isolation", "Each test starts from a clean state and doesn't depend on others."],
        ],
      },
    ],
  },
];
