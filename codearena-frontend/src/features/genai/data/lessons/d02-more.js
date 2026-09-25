// Day 2: MongoDB with Beanie, authentication, testing with a database. Merged into d02.js. Shape: see ./index.js

export const mongodb = {
  minutes: 60,
  level: "Intermediate",
  intro:
    "As a MERN developer you know MongoDB and Mongoose well. In Python, **Beanie** plays Mongoose's role: document classes, validation (through Pydantic), queries, indexes and relations. This lesson maps Mongoose to Beanie so you can keep using MongoDB where it fits, and explains when Postgres is the better choice for GenAI projects.",
  sections: [
    {
      h: "The Python MongoDB stack",
      blocks: [
        {
          table: {
            head: ["Node", "Python", "Notes"],
            rows: [
              ["`mongodb` driver", "**PyMongo** (sync, and an async API in recent versions) / **Motor** (older async driver)", "Low-level driver"],
              ["Mongoose", "**Beanie** (async ODM built on Pydantic)", "Models, validation, queries"],
              ["`mongoose.connect()`", "`await init_beanie(database=..., document_models=[...])`", "Call once at startup (FastAPI lifespan)"],
              ["Schema + validators", "`class Product(Document)` with Pydantic fields", "Same model validates API data too"],
              ["`ObjectId`", "`PydanticObjectId`", "Serialises as a string in JSON"],
            ],
          },
        },
        {
          lang: "bash",
          code: `docker run -d --name shop-mongo -p 27017:27017 mongo:7
uv add beanie`,
        },
        {
          note: "Beanie 2.x uses PyMongo's native async client (`AsyncMongoClient`); older tutorials use Motor's `AsyncIOMotorClient`. The document and query API is the same either way. Check the version you install.",
        },
      ],
    },
    {
      h: "Documents, indexes and connecting",
      blocks: [
        {
          lang: "python",
          code: `# app/models/product_doc.py
from datetime import datetime, timezone
from typing import Annotated
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

class ProductDoc(Document):
    name: Annotated[str, Indexed(unique=True)]
    price: float = Field(gt=0)
    stock: int = Field(default=0, ge=0)
    category: Annotated[str, Indexed()]
    owner_id: PydanticObjectId
    tags: list[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "products"          # collection name`,
        },
        {
          lang: "python",
          code: `# app/main.py (lifespan)
from contextlib import asynccontextmanager
from beanie import init_beanie
from pymongo import AsyncMongoClient

@asynccontextmanager
async def lifespan(app):
    client = AsyncMongoClient(get_settings().mongo_url)          # mongodb://localhost:27017
    await init_beanie(database=client["shop"], document_models=[ProductDoc, UserDoc])
    yield
    await client.close()

app = FastAPI(lifespan=lifespan)`,
        },
      ],
    },
    {
      h: "Queries: Mongoose → Beanie",
      blocks: [
        {
          lang: "python",
          code: `# create
product = ProductDoc(name="Masala Chai 250g", price=249, category="beverages", owner_id=user.id)
await product.insert()

# find by id / find one
p = await ProductDoc.get(product_id)                          # None if missing
p = await ProductDoc.find_one(ProductDoc.name == "Masala Chai 250g")

# find many: filter, sort, skip, limit
items = await (ProductDoc
    .find(ProductDoc.category == "beverages", ProductDoc.price >= 100)
    .sort(-ProductDoc.price)
    .skip(0).limit(20)
    .to_list())
total = await ProductDoc.find(ProductDoc.category == "beverages").count()

# raw Mongo query syntax works too
cheap = await ProductDoc.find({"price": {"$lt": 100}, "tags": "tea"}).to_list()

# update
await p.set({ProductDoc.price: 199})                         # $set
await ProductDoc.find(ProductDoc.stock == 0).update({"$set": {"category": "archived"}})

# delete
await p.delete()

# aggregation pipeline
stats = await ProductDoc.aggregate([
    {"$group": {"_id": "$category", "count": {"$sum": 1}, "avg_price": {"$avg": "$price"}}},
    {"$sort": {"count": -1}},
]).to_list()`,
        },
        {
          table: {
            head: ["Mongoose", "Beanie"],
            rows: [
              ["`Product.create(data)`", "`await ProductDoc(**data).insert()`"],
              ["`Product.findById(id)`", "`await ProductDoc.get(id)`"],
              ["`Product.find({...}).sort({price: -1}).skip(n).limit(m)`", "`ProductDoc.find(...).sort(-ProductDoc.price).skip(n).limit(m).to_list()`"],
              ["`countDocuments(filter)`", "`await ProductDoc.find(filter).count()`"],
              ["`updateOne({$set})`", "`await doc.set({...})` / `find(...).update({...})`"],
              ["`deleteOne`", "`await doc.delete()`"],
              ["`aggregate([...])`", "`await ProductDoc.aggregate([...]).to_list()`"],
              ["`populate(\"owner\")`", "`Link[UserDoc]` fields with `fetch_links=True`, or a second query"],
            ],
          },
        },
      ],
    },
    {
      h: "Postgres or MongoDB for GenAI projects?",
      blocks: [
        {
          table: {
            head: ["", "PostgreSQL + SQLAlchemy", "MongoDB + Beanie"],
            rows: [
              ["Data shape", "Relational, consistent structure", "Flexible documents, nested data"],
              ["Transactions across entities", "Strong, simple", "Supported (replica sets), more ceremony"],
              ["Vector search", "**pgvector** anywhere (including AWS RDS)", "Atlas Vector Search (Atlas cloud)"],
              ["Reporting / joins", "Excellent (SQL)", "Aggregation pipelines"],
              ["Your familiarity", "New", "High"],
              ["In GenAI job descriptions", "Very common", "Common"],
            ],
          },
        },
        "This plan uses **Postgres** for the main projects (it doubles as the vector database with pgvector), and the optional build guide shows the same Shop API on MongoDB so you can use either. Being able to explain the trade-off is worth more in interviews than either choice.",
      ],
    },
  ],
  revise: [
    "Beanie = async ODM on Pydantic (Mongoose equivalent); PyMongo async / Motor = drivers.",
    "`class X(Document)` + `class Settings: name = \"collection\"`; `Indexed(unique=True)` for indexes; `PydanticObjectId` for ids.",
    "`init_beanie(...)` once in the FastAPI lifespan.",
    "`insert`, `get`, `find(...).sort().skip().limit().to_list()`, `count()`, `set({...})`, `delete()`, `aggregate([...])`.",
    "Postgres for relational data, transactions and pgvector; MongoDB for flexible documents; know the trade-off.",
  ],
  interview: [
    {
      q: "When would you choose MongoDB over PostgreSQL?",
      a: "MongoDB fits flexible or rapidly changing document shapes, deeply nested data read as a whole, and horizontal scaling of simple access patterns. PostgreSQL fits relational data with joins, strong multi-entity transactions, complex reporting in SQL and strict constraints, and with pgvector it also serves as a vector database. For most business backends and RAG systems I'd default to Postgres, but choose Mongo when the data is naturally document-shaped or the team already runs it well.",
    },
    {
      q: "What is Beanie?",
      a: "An async MongoDB ODM for Python built on Pydantic. Documents are Pydantic models, so the same class gives validation, serialisation and typed queries; it supports indexes, relations via `Link`, aggregation and migrations. It's the closest Python equivalent to Mongoose and fits naturally with FastAPI.",
    },
  ],
  practice: [
    "Run MongoDB in Docker, define `ProductDoc`, insert 10 products and write the Beanie equivalent of 3 Mongoose queries you've used before.",
  ],
};

export const auth = {
  minutes: 90,
  level: "Intermediate",
  intro:
    "Almost every backend needs users: sign up, log in, protect routes, and make sure people only touch their own data. You've probably done this in Express with bcrypt and jsonwebtoken. This lesson builds the same thing in FastAPI the way the official docs recommend, and covers the security details interviewers probe.",
  sections: [
    {
      h: "Authentication vs authorisation",
      blocks: [
        {
          list: [
            "**Authentication** answers \"who are you?\": logging in with a password, verifying a token. Failure → **401**.",
            "**Authorisation** answers \"what are you allowed to do?\": roles (admin vs customer), ownership (only your orders). Failure → **403** (or 404 for resources you shouldn't know exist).",
          ],
        },
      ],
    },
    {
      h: "Storing passwords: hash, never encrypt",
      blocks: [
        "Passwords are stored as **one-way hashes** from a slow, salted algorithm designed for passwords: **Argon2** (recommended) or **bcrypt**. Never store plain text, never use fast hashes like MD5 or SHA-256 alone, and never encrypt them (encryption can be reversed).",
        {
          lang: "python",
          code: `# uv add "pwdlib[argon2]" pyjwt
from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()       # Argon2 with sensible settings

hashed = password_hash.hash("s3cret-Pass!")      # store this string
password_hash.verify("s3cret-Pass!", hashed)     # True
password_hash.verify("wrong", hashed)            # False`,
        },
        {
          list: [
            "A **salt** (random data per password) is built into the hash, so identical passwords produce different hashes and precomputed \"rainbow tables\" don't work.",
            "**Slowness is the point:** it makes brute-forcing leaked hashes expensive.",
            "The FastAPI docs now use `pwdlib`; `passlib` appears in older tutorials.",
          ],
        },
      ],
    },
    {
      h: "JWT access tokens",
      blocks: [
        "A **JWT** (JSON Web Token) is a signed string with three parts, `header.payload.signature`. The payload holds **claims** like `sub` (the user id) and `exp` (expiry). The server signs it with a secret; later it verifies the signature, so it can trust the claims without a database lookup.",
        {
          lang: "python",
          code: `# app/core/security.py
from datetime import datetime, timedelta, timezone
import jwt
from app.core.config import get_settings

ALGORITHM = "HS256"

def create_access_token(user_id: int, role: str, minutes: int = 30) -> str:
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "role": role, "iat": now, "exp": now + timedelta(minutes=minutes)}
    return jwt.encode(payload, get_settings().jwt_secret.get_secret_value(), algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    # raises jwt.ExpiredSignatureError / jwt.InvalidTokenError when invalid
    return jwt.decode(token, get_settings().jwt_secret.get_secret_value(), algorithms=[ALGORITHM])`,
        },
        {
          warn: "A JWT payload is **encoded, not encrypted**: anyone can read it (paste one into jwt.io). Never put secrets or personal data in it. Always pass `algorithms=[...]` when decoding so an attacker can't choose a weaker algorithm.",
        },
        {
          lang: "bash",
          code: `# generate a strong secret for .env
python3 -c "import secrets; print(secrets.token_urlsafe(64))"`,
        },
      ],
    },
    {
      h: "Login and protected routes in FastAPI",
      blocks: [
        {
          lang: "python",
          code: `# app/api/routes/auth.py
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.api.deps import CurrentUser, UserServiceDep
from app.schemas.user import Token, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: UserCreate, users: UserServiceDep):
    return UserOut.model_validate(await users.register(body))      # 409 if email exists

@router.post("/login", response_model=Token)
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], users: UserServiceDep):
    user = await users.authenticate(form.username, form.password)   # username field holds the email
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password",
                            headers={"WWW-Authenticate": "Bearer"})
    return Token(access_token=create_access_token(user.id, user.role), token_type="bearer")

@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return UserOut.model_validate(user)`,
        },
        {
          lang: "python",
          code: `# app/api/deps.py
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")   # adds "Authorize" to /docs

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], session: SessionDep) -> User:
    unauthorized = HTTPException(401, "Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise unauthorized
    user = await session.get(User, user_id)
    if user is None:
        raise unauthorized
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

def require_role(*roles: str):
    async def checker(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(403, "You don't have permission to do this")
        return user
    return checker

AdminUser = Annotated[User, Depends(require_role("admin"))]`,
        },
        {
          list: [
            "`OAuth2PasswordBearer` reads `Authorization: Bearer <token>` and makes Swagger's **Authorize** button work.",
            "`OAuth2PasswordRequestForm` expects form fields `username` and `password` (it needs `python-multipart`, included in `fastapi[standard]`). Use the email as the username.",
            "Use the **same** error message for \"no such user\" and \"wrong password\", so attackers can't discover which emails are registered.",
            "`require_role(\"admin\")` is a **dependency factory**: a function that returns a dependency, the FastAPI version of `authorize(\"admin\")` middleware in Express.",
          ],
        },
      ],
    },
    {
      h: "Ownership: users only touch their own data",
      blocks: [
        "Role checks aren't enough: a customer must not edit **another** customer's product just by changing the id in the URL (this is called IDOR, insecure direct object reference, one of the most common real-world API bugs). Check ownership in the service, using the user from the token, never an id sent by the client.",
        {
          lang: "python",
          code: `# app/services/product_service.py
async def update_product(self, user: User, product_id: int, data: ProductUpdate) -> Product:
    product = await self.repo.get(product_id)
    if product is None or (product.owner_id != user.id and user.role != "admin"):
        raise NotFoundError(f"Product {product_id} not found")      # 404: don't reveal it exists
    return await self.repo.update(product, **data.model_dump(exclude_unset=True))`,
        },
      ],
    },
    {
      h: "Refresh tokens, logout and where to store tokens",
      blocks: [
        {
          list: [
            "Keep **access tokens short-lived** (15–30 minutes) to limit damage if one leaks.",
            "Issue a longer-lived **refresh token** (days) that can only be used to get new access tokens. Store refresh tokens (or their hashes) in the database so you can revoke them: that's how logout and \"log out of all devices\" work. Rotate them on each use.",
            "JWTs can't be \"deleted\" before expiry; revocation needs a server-side list (refresh-token table, or a deny-list of token ids in Redis).",
            "**In the browser:** an `httpOnly`, `Secure`, `SameSite` cookie protects the token from JavaScript (XSS) but needs CSRF protection; `localStorage` is simpler but readable by any injected script. Many SPAs keep the access token in memory and the refresh token in an httpOnly cookie.",
          ],
        },
        {
          table: {
            head: ["", "Server sessions (cookie + session store)", "JWT (stateless)"],
            rows: [
              ["State", "Session data in Redis/DB", "Claims inside the signed token"],
              ["Revoke instantly", "Yes (delete the session)", "Only with extra server-side state"],
              ["Scaling", "Needs shared session store", "Any server can verify"],
              ["Good for", "Classic web apps", "APIs, mobile apps, microservices"],
            ],
          },
        },
      ],
    },
    {
      h: "Security checklist for a Python API",
      blocks: [
        {
          list: [
            "HTTPS everywhere; secrets (JWT secret, DB password, API keys) from environment/secret store, never in code.",
            "Hash passwords with Argon2/bcrypt; enforce minimum length; rate-limit login attempts.",
            "Validate all input with Pydantic; use parameterised queries (the ORM does this) to prevent SQL injection.",
            "Check ownership on every object access (prevent IDOR); return 404 for others' data.",
            "Restrict CORS to your frontend origins; don't reflect arbitrary origins with credentials.",
            "Don't leak internals: response models without password hashes, generic 500 messages, no stack traces to clients.",
            "Log security events (logins, permission denials) without logging passwords or tokens.",
            "Keep dependencies updated (`uv lock --upgrade`, Dependabot) and scan them for vulnerabilities (`pip-audit`).",
          ],
        },
      ],
    },
  ],
  revise: [
    "Authentication = who you are (401); authorisation = what you may do (403/404).",
    "Passwords: Argon2/bcrypt hashes with salt (`pwdlib`); never plain text, fast hashes or encryption.",
    "JWT = signed (not encrypted) `header.payload.signature`; claims `sub`, `exp`; decode with an explicit `algorithms=[...]`.",
    "FastAPI: `OAuth2PasswordRequestForm` login → token; `OAuth2PasswordBearer` + `get_current_user` dependency; `require_role(...)` factory.",
    "Ownership checks in services using the token's user (prevent IDOR); same error for unknown email and wrong password.",
    "Short access tokens + revocable, rotating refresh tokens; httpOnly cookies vs localStorage trade-off.",
    "Checklist: HTTPS, secrets management, input validation, parameterised queries, CORS, no leaked internals, rate limits, dependency updates.",
  ],
  mistakes: [
    "Storing passwords with MD5/SHA-256 or reversible encryption.",
    "Putting sensitive data in JWT payloads, or decoding without specifying algorithms.",
    "Trusting a `user_id` from the request body instead of the token.",
    "Different login errors for \"unknown email\" and \"wrong password\".",
    "Long-lived access tokens with no way to revoke them.",
  ],
  interview: [
    {
      q: "How do you implement JWT authentication in FastAPI?",
      a: "A login endpoint accepts credentials (`OAuth2PasswordRequestForm`), verifies the password hash with Argon2/bcrypt, and returns a signed JWT with `sub` (user id), `exp` and maybe a role. `OAuth2PasswordBearer` extracts the bearer token, and a `get_current_user` dependency decodes and verifies it (explicit algorithm, expiry) and loads the user, raising 401 on failure. Protected routes depend on it, roles are checked with a dependency factory, and ownership is checked in services. Refresh tokens stored server-side allow revocation.",
    },
    {
      q: "JWT vs session-based authentication?",
      a: "Sessions store state on the server (Redis/DB) and give the client an opaque cookie; they're easy to revoke but need a shared session store. JWTs carry signed claims so any server can verify them without a lookup, which suits APIs and microservices, but they can't be revoked before expiry without extra state, and their payload is readable. A common compromise is short-lived JWT access tokens plus server-stored, revocable refresh tokens.",
    },
    {
      q: "What is IDOR and how do you prevent it?",
      a: "Insecure Direct Object Reference: an API lets a user access or modify another user's object just by changing an id in the request, because it checks authentication but not ownership. Prevent it by always scoping queries to the authenticated user (`WHERE owner_id = :current_user`) or checking ownership in the service layer, using the identity from the token, and returning 404 for objects the user doesn't own.",
    },
    {
      q: "Why hash passwords instead of encrypting them?",
      a: "Encryption is reversible with the key, so anyone who gets the key (or the server) gets every password. Hashing is one-way: you verify by hashing the login attempt and comparing. Password hashing algorithms like Argon2 and bcrypt are deliberately slow and salted, so leaked hashes are expensive to brute-force and identical passwords don't produce identical hashes.",
    },
  ],
  practice: [
    "Decode one of your own JWTs at jwt.io and list the claims you see. Then change one character of the signature and confirm `decode_access_token` rejects it.",
    "Write a test proving user B gets 404 when trying to PATCH user A's product.",
  ],
};

export const testing = {
  minutes: 60,
  level: "Intermediate",
  intro:
    "On Day 1 you tested an in-memory API with `TestClient`. With a real database and async code, tests need a little more setup: an isolated test database, async test functions, fixtures that create users and log them in, and coverage reports. This is what a professional FastAPI test suite looks like.",
  sections: [
    {
      h: "Test setup: async tests and a test database",
      blocks: [
        {
          lang: "bash",
          code: `uv add --dev pytest pytest-asyncio httpx aiosqlite pytest-cov`,
        },
        {
          lang: "toml",
          code: `# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"          # every async test and fixture runs on asyncio automatically
testpaths = ["tests"]`,
        },
        {
          lang: "python",
          code: `# tests/conftest.py  (fixtures here are available to every test file)
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool
from app.db.base import Base
from app.db.session import get_session
from app.main import app
import app.models  # noqa: F401  register every model on Base.metadata

@pytest.fixture
async def session_maker():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)        # fresh schema for each test
    yield async_sessionmaker(engine, expire_on_commit=False)
    await engine.dispose()

@pytest.fixture
async def client(session_maker):
    async def override_session():
        async with session_maker() as session:
            yield session
    app.dependency_overrides[get_session] = override_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
async def auth_headers(client):
    await client.post("/api/v1/auth/register", json={"email": "asha@test.com", "password": "password123"})
    r = await client.post("/api/v1/auth/login", data={"username": "asha@test.com", "password": "password123"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}`,
        },
        {
          list: [
            "`conftest.py` is pytest's shared-fixture file (like Jest's setup files).",
            "An in-memory SQLite database per test is fast and fully isolated. `StaticPool` keeps the single in-memory connection alive across sessions.",
            "`AsyncClient` with `ASGITransport` calls your app in-process, in the same event loop as the async fixtures.",
            "`auth_headers` is a fixture built on another fixture: register, log in, return the header.",
          ],
        },
        {
          warn: "SQLite isn't Postgres: some types, constraints and functions behave differently. Use SQLite for fast unit-level API tests, and run important integration tests against real Postgres too (a Postgres service in CI, or the `testcontainers` library that starts one in Docker for the test run).",
        },
      ],
    },
    {
      h: "Writing the tests",
      blocks: [
        {
          lang: "python",
          code: `# tests/test_products.py
CHAI = {"name": "Masala Chai 250g", "price": 249, "stock": 40, "category": "beverages"}

async def test_create_requires_login(client):
    r = await client.post("/api/v1/products", json=CHAI)
    assert r.status_code == 401

async def test_create_and_list(client, auth_headers):
    r = await client.post("/api/v1/products", json=CHAI, headers=auth_headers)
    assert r.status_code == 201
    body = (await client.get("/api/v1/products", params={"category": "beverages"})).json()
    assert body["total"] == 1 and body["items"][0]["name"] == CHAI["name"]

async def test_duplicate_is_409(client, auth_headers):
    await client.post("/api/v1/products", json=CHAI, headers=auth_headers)
    r = await client.post("/api/v1/products", json=CHAI, headers=auth_headers)
    assert r.status_code == 409

async def test_cannot_edit_someone_elses_product(client, auth_headers):
    product_id = (await client.post("/api/v1/products", json=CHAI, headers=auth_headers)).json()["id"]
    await client.post("/api/v1/auth/register", json={"email": "ravi@test.com", "password": "password123"})
    token = (await client.post("/api/v1/auth/login",
             data={"username": "ravi@test.com", "password": "password123"})).json()["access_token"]
    r = await client.patch(f"/api/v1/products/{product_id}", json={"price": 1},
                           headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 404`,
        },
        {
          list: [
            "Name tests after the behaviour: `test_cannot_edit_someone_elses_product` reads like a requirement.",
            "Cover the **unhappy paths**: 401, 403/404, 409, 422. They're where real bugs and security holes live.",
            "Each test builds its own data, so tests don't depend on each other's order.",
          ],
        },
      ],
    },
    {
      h: "Unit-testing services without HTTP",
      blocks: [
        "Services take a repository, so you can test business rules with a fake repository and no database at all:",
        {
          lang: "python",
          code: `class FakeRepo:
    def __init__(self): self.items = {}
    async def get_by_name(self, name): return next((p for p in self.items.values() if p.name == name), None)
    async def add(self, **data):
        p = SimpleNamespace(id=len(self.items) + 1, **data); self.items[p.id] = p; return p

async def test_service_rejects_duplicate_names():
    service = ProductService(FakeRepo())
    owner = SimpleNamespace(id=1, role="customer")
    await service.create_product(owner, ProductCreate(**CHAI))
    with pytest.raises(ConflictError):
        await service.create_product(owner, ProductCreate(**CHAI))`,
        },
        "`pytest.raises(...)` asserts that the block raises that exception, like Jest's `expect(...).rejects.toThrow()`.",
      ],
    },
    {
      h: "Coverage and running tests in CI",
      blocks: [
        {
          lang: "bash",
          code: `uv run pytest -q                              # all tests
uv run pytest -q -k duplicate                  # tests whose name matches "duplicate"
uv run pytest -x                               # stop at the first failure
uv run pytest --cov=app --cov-report=term-missing   # which lines were never executed`,
        },
        {
          list: [
            "Coverage shows untested lines, not correctness. Aim for high coverage of services and routes, and read the \"missing\" lines for untested error paths.",
            "Run the same command in CI on every pull request (GitHub Actions; Day 18), with a real Postgres service for integration tests.",
          ],
        },
      ],
    },
  ],
  revise: [
    "`pytest-asyncio` with `asyncio_mode = \"auto\"`; `httpx.AsyncClient(transport=ASGITransport(app=app))` for async API tests.",
    "`conftest.py` holds shared fixtures: fresh in-memory SQLite schema per test, overridden `get_session`, `auth_headers`.",
    "SQLite for fast tests; also test against real Postgres (CI service or testcontainers).",
    "Test unhappy paths (401, 404, 409, 422) and ownership rules; each test creates its own data.",
    "Unit-test services with fake repositories; `pytest.raises` for expected exceptions.",
    "`pytest -k`, `-x`, `--cov=app --cov-report=term-missing`; run in CI on every PR.",
  ],
  interview: [
    {
      q: "How do you test a FastAPI app that uses a database?",
      a: "I override the session dependency to point at an isolated test database: an in-memory SQLite engine with the schema created per test for speed, and a real Postgres (CI service or testcontainers) for integration tests. I call endpoints with httpx's `AsyncClient` over `ASGITransport` using pytest-asyncio, use fixtures for users and auth headers, test success and error paths including ownership rules, and unit-test services with fake repositories. Coverage reports and CI run on every pull request.",
    },
    {
      q: "What's in `conftest.py`?",
      a: "Shared pytest fixtures and hooks that are automatically available to all tests in that directory and below: database engines and sessions, the test client with dependency overrides, factory fixtures for users and data, and auth headers. It avoids importing fixtures in every test file.",
    },
  ],
  practice: [
    "Write `conftest.py` for your upgraded Shop API and get 8 tests passing, including an ownership test.",
    "Run coverage and add one test for a line reported as missing.",
  ],
};
