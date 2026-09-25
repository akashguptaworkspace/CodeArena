// Day 2 build guides: Shop API on Postgres with auth, and the MongoDB variant. Merged into d02.js.

export const crudApi = {
  minutes: 300,
  level: "Intermediate",
  intro:
    "Take the in-memory Shop API from Day 1 and make it production-shaped: **PostgreSQL** with SQLAlchemy 2.0 (async), **Alembic** migrations, **users** with Argon2 password hashing and **JWT** login, ownership rules, consistent errors, pagination with filters and sorting, and an async **test suite**. Because of the layers, you'll mostly add files; routes and services change only a little. Plan a full day (or two) for this.",
  sections: [
    {
      h: "What changes from Day 1",
      blocks: [
        {
          table: {
            head: ["Layer", "Day 1", "Day 2"],
            rows: [
              ["Storage", "Python dict", "PostgreSQL via SQLAlchemy async + asyncpg"],
              ["Schema changes", "None", "Alembic migrations"],
              ["Models", "`@dataclass Product`", "SQLAlchemy `User` and `Product` tables with a foreign key"],
              ["Repository", "Sync methods on a dict", "Same method names, `async`, using a session"],
              ["Service", "Sync", "`async`, plus ownership checks and `IntegrityError` → 409"],
              ["Auth", "None", "Register, login (JWT), `/me`, protected writes"],
              ["Errors", "`{\"error\": \"...\"}`", "`{\"error\": {\"code\", \"message\", \"details\"}}` everywhere"],
              ["Tests", "Sync `TestClient`", "Async tests with an isolated SQLite database per test"],
            ],
          },
        },
        {
          lang: "text",
          code: `shop-api/
├── app/
│   ├── main.py
│   ├── core/        config.py  errors.py  security.py
│   ├── db/          base.py  session.py
│   ├── models/      __init__.py  user.py  product.py
│   ├── schemas/     common.py  user.py  product.py
│   ├── repositories/ user_repository.py  product_repository.py
│   ├── services/    user_service.py  product_service.py
│   └── api/         deps.py  pagination.py  routes/{health,auth,products}.py
├── migrations/      (Alembic)
├── tests/           conftest.py  test_auth.py  test_products.py
├── docker-compose.yml  alembic.ini  .env  .env.example  pyproject.toml`,
        },
      ],
    },
    {
      h: "Step 1: dependencies, Postgres and settings",
      blocks: [
        {
          lang: "bash",
          code: `cd shop-api
uv add "sqlalchemy[asyncio]" asyncpg alembic "pydantic[email]" "pwdlib[argon2]" pyjwt
uv add --dev pytest-asyncio httpx aiosqlite pytest-cov
mkdir -p app/db                      # Windows: New-Item -ItemType Directory app\\db
touch app/db/__init__.py             # Windows: New-Item app\\db\\__init__.py`,
        },
        {
          lang: "yaml",
          code: `# docker-compose.yml  →  docker compose up -d
services:
  db:
    image: pgvector/pgvector:pg16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: shop
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
volumes:
  pgdata:`,
        },
        {
          lang: "bash",
          code: `# .env  (and the same keys with fake values in .env.example)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/shop
JWT_SECRET=paste-output-of: python3 -c "import secrets; print(secrets.token_urlsafe(64))"
ACCESS_TOKEN_MINUTES=30
CORS_ORIGINS=["http://localhost:5173"]`,
        },
        {
          lang: "python",
          code: `# app/core/config.py
from functools import lru_cache
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Shop API"
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:5173"]
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/shop"
    jwt_secret: SecretStr                       # required: the app refuses to start without it
    access_token_minutes: int = 30

@lru_cache
def get_settings() -> Settings:
    return Settings()`,
        },
      ],
    },
    {
      h: "Step 2: database session and models",
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
          code: `# app/db/session.py
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.core.config import get_settings

engine = create_async_engine(get_settings().database_url, pool_size=5, max_overflow=10, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def get_session():
    async with SessionLocal() as session:
        yield session`,
        },
        {
          lang: "python",
          code: `# app/models/user.py
from datetime import datetime
from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="customer")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    products: Mapped[list["Product"]] = relationship(back_populates="owner")`,
        },
        {
          lang: "python",
          code: `# app/models/product.py
from datetime import datetime
from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price > 0", name="price_positive"),
        CheckConstraint("stock >= 0", name="stock_not_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2, asdecimal=False))
    stock: Mapped[int] = mapped_column(default=0)
    category: Mapped[str] = mapped_column(String(50), index=True)
    description: Mapped[str | None] = mapped_column(String(1000))
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    owner: Mapped["User"] = relationship(back_populates="products")`,
        },
        {
          lang: "python",
          code: `# app/models/__init__.py  (import every model so Alembic and create_all can see them)
from app.models.product import Product  # noqa: F401
from app.models.user import User        # noqa: F401`,
        },
        "Delete Day 1's dataclass `app/models/product.py` content; the SQLAlchemy class replaces it.",
      ],
    },
    {
      h: "Step 3: create the tables with Alembic",
      blocks: [
        {
          lang: "bash",
          code: `docker compose up -d
uv run alembic init -t async migrations`,
        },
        {
          lang: "python",
          code: `# migrations/env.py  (edit the top part)
from app.core.config import get_settings
from app.db.base import Base
import app.models  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", get_settings().database_url)
target_metadata = Base.metadata`,
        },
        {
          lang: "bash",
          code: `uv run alembic revision --autogenerate -m "create users and products"
# open migrations/versions/xxxx_create_users_and_products.py and read it
uv run alembic upgrade head
docker compose exec db psql -U postgres -d shop -c "\\d products"    # see the real table`,
        },
      ],
    },
    {
      h: "Step 4: errors and security",
      blocks: [
        {
          lang: "python",
          code: `# app/core/errors.py
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

class AppError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

class NotFoundError(AppError):
    status_code, code = 404, "not_found"

class ConflictError(AppError):
    status_code, code = 409, "conflict"

def error_body(code: str, message: str, details: list | None = None) -> dict:
    return {"error": {"code": code, "message": message, "details": details or []}}

def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content=error_body(exc.code, exc.message))

    @app.exception_handler(RequestValidationError)
    async def handle_validation(request: Request, exc: RequestValidationError):
        details = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
        return JSONResponse(status_code=422, content=error_body("validation_error", "Some fields are invalid", details))

    @app.exception_handler(StarletteHTTPException)
    async def handle_http(request: Request, exc: StarletteHTTPException):
        return JSONResponse(status_code=exc.status_code, content=error_body("http_error", str(exc.detail)),
                            headers=getattr(exc, "headers", None))`,
        },
        {
          lang: "python",
          code: `# app/core/security.py
from datetime import datetime, timedelta, timezone
import jwt
from pwdlib import PasswordHash
from app.core.config import get_settings

ALGORITHM = "HS256"
_hasher = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return _hasher.hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return _hasher.verify(password, hashed)

DUMMY_HASH = hash_password("timing-equaliser")      # used when the email doesn't exist

def create_access_token(user_id: int, role: str) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {"sub": str(user_id), "role": role, "iat": now,
               "exp": now + timedelta(minutes=settings.access_token_minutes)}
    return jwt.encode(payload, settings.jwt_secret.get_secret_value(), algorithm=ALGORITHM)

def decode_access_token(token: str) -> dict:
    return jwt.decode(token, get_settings().jwt_secret.get_secret_value(), algorithms=[ALGORITHM])`,
        },
        "`DUMMY_HASH` lets login spend the same time verifying a password whether or not the email exists, so attackers can't discover registered emails by timing responses.",
      ],
    },
    {
      h: "Step 5: schemas",
      blocks: [
        {
          lang: "python",
          code: `# app/schemas/common.py
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar("T")

class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int`,
        },
        {
          lang: "python",
          code: `# app/schemas/user.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    role: str
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"`,
        },
        {
          lang: "python",
          code: `# app/schemas/product.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=100, examples=["Masala Chai 250g"])
    price: float = Field(gt=0, examples=[249.0])
    stock: int = Field(default=0, ge=0)
    category: str = Field(min_length=2, max_length=50, examples=["beverages"])
    description: str | None = Field(default=None, max_length=1000)

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    price: float | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)
    category: str | None = Field(default=None, min_length=2, max_length=50)
    description: str | None = Field(default=None, max_length=1000)

class ProductOut(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime`,
        },
      ],
    },
    {
      h: "Step 6: repositories",
      blocks: [
        {
          lang: "python",
          code: `# app/repositories/user_repository.py
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User

class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get(self, user_id: int) -> User | None:
        return await self.session.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        return await self.session.scalar(select(User).where(func.lower(User.email) == email.lower()))

    async def add(self, email: str, password_hash: str) -> User:
        user = User(email=email, password_hash=password_hash)
        self.session.add(user)
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise
        await self.session.refresh(user)
        return user`,
        },
        {
          lang: "python",
          code: `# app/repositories/product_repository.py
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.product import Product

SORTS = {
    "price": Product.price.asc(), "-price": Product.price.desc(),
    "name": Product.name.asc(), "-created_at": Product.created_at.desc(),
}

class ProductRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list(self, category: str | None, q: str | None, sort: str,
                   offset: int, limit: int) -> tuple[list[Product], int]:
        stmt = select(Product)
        if category:
            stmt = stmt.where(Product.category == category)
        if q:
            stmt = stmt.where(Product.name.ilike(f"%{q}%"))
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery()))
        rows = await self.session.scalars(stmt.order_by(SORTS[sort], Product.id).offset(offset).limit(limit))
        return list(rows), total or 0

    async def get(self, product_id: int) -> Product | None:
        return await self.session.get(Product, product_id)

    async def get_by_name(self, name: str) -> Product | None:
        return await self.session.scalar(select(Product).where(func.lower(Product.name) == name.lower()))

    async def _commit(self) -> None:
        try:
            await self.session.commit()
        except IntegrityError:
            await self.session.rollback()
            raise

    async def add(self, **data) -> Product:
        product = Product(**data)
        self.session.add(product)
        await self._commit()
        await self.session.refresh(product)
        return product

    async def update(self, product: Product, **changes) -> Product:
        for key, value in changes.items():
            setattr(product, key, value)
        await self._commit()
        await self.session.refresh(product)
        return product

    async def delete(self, product: Product) -> None:
        await self.session.delete(product)
        await self._commit()`,
        },
        "`Product.id` as a second sort key makes pagination order stable when two products have the same price or timestamp.",
      ],
    },
    {
      h: "Step 7: services",
      blocks: [
        {
          lang: "python",
          code: `# app/services/user_service.py
from sqlalchemy.exc import IntegrityError
from app.core.errors import ConflictError
from app.core.security import DUMMY_HASH, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate

class UserService:
    def __init__(self, repo: UserRepository):
        self.repo = repo

    async def get_user(self, user_id: int) -> User | None:
        return await self.repo.get(user_id)

    async def register(self, data: UserCreate) -> User:
        email = data.email.lower()
        if await self.repo.get_by_email(email):
            raise ConflictError("Email already registered")
        try:
            return await self.repo.add(email=email, password_hash=hash_password(data.password))
        except IntegrityError:                      # two sign-ups at the same moment
            raise ConflictError("Email already registered")

    async def authenticate(self, email: str, password: str) -> User | None:
        user = await self.repo.get_by_email(email)
        if user is None:
            verify_password(password, DUMMY_HASH)   # same timing as a real check
            return None
        return user if verify_password(password, user.password_hash) else None`,
        },
        {
          lang: "python",
          code: `# app/services/product_service.py
from sqlalchemy.exc import IntegrityError
from app.core.errors import ConflictError, NotFoundError
from app.models.product import Product
from app.models.user import User
from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate

class ProductService:
    def __init__(self, repo: ProductRepository):
        self.repo = repo

    async def list_products(self, category, q, sort, offset, limit) -> tuple[list[Product], int]:
        return await self.repo.list(category, q, sort, offset, limit)

    async def get_product(self, product_id: int) -> Product:
        product = await self.repo.get(product_id)
        if product is None:
            raise NotFoundError(f"Product {product_id} not found")
        return product

    async def _owned(self, user: User, product_id: int) -> Product:
        product = await self.repo.get(product_id)
        if product is None or (product.owner_id != user.id and user.role != "admin"):
            raise NotFoundError(f"Product {product_id} not found")      # 404, not 403
        return product

    async def create_product(self, user: User, data: ProductCreate) -> Product:
        if await self.repo.get_by_name(data.name):
            raise ConflictError(f"A product named '{data.name}' already exists")
        try:
            return await self.repo.add(**data.model_dump(), owner_id=user.id)
        except IntegrityError:
            raise ConflictError(f"A product named '{data.name}' already exists")

    async def update_product(self, user: User, product_id: int, data: ProductUpdate) -> Product:
        product = await self._owned(user, product_id)
        changes = data.model_dump(exclude_unset=True)
        if "name" in changes:
            existing = await self.repo.get_by_name(changes["name"])
            if existing and existing.id != product.id:
                raise ConflictError(f"A product named '{changes['name']}' already exists")
        try:
            return await self.repo.update(product, **changes)
        except IntegrityError:
            raise ConflictError("Update conflicts with existing data")

    async def delete_product(self, user: User, product_id: int) -> None:
        await self.repo.delete(await self._owned(user, product_id))`,
        },
      ],
    },
    {
      h: "Step 8: dependencies, pagination and routes",
      blocks: [
        {
          lang: "python",
          code: `# app/api/deps.py
from typing import Annotated
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import decode_access_token
from app.db.session import get_session
from app.models.user import User
from app.repositories.product_repository import ProductRepository
from app.repositories.user_repository import UserRepository
from app.services.product_service import ProductService
from app.services.user_service import UserService

SessionDep = Annotated[AsyncSession, Depends(get_session)]

def get_user_service(session: SessionDep) -> UserService:
    return UserService(UserRepository(session))

def get_product_service(session: SessionDep) -> ProductService:
    return ProductService(ProductRepository(session))

UserServiceDep = Annotated[UserService, Depends(get_user_service)]
ProductServiceDep = Annotated[ProductService, Depends(get_product_service)]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)], users: UserServiceDep) -> User:
    unauthorized = HTTPException(401, "Could not validate credentials", headers={"WWW-Authenticate": "Bearer"})
    try:
        user_id = int(decode_access_token(token)["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise unauthorized
    user = await users.get_user(user_id)
    if user is None:
        raise unauthorized
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]`,
        },
        {
          lang: "python",
          code: `# app/api/pagination.py
from typing import Annotated
from fastapi import Depends, Query
from pydantic import BaseModel

class PageParams(BaseModel):
    page: int
    size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size

def page_params(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100)) -> PageParams:
    return PageParams(page=page, size=size)

Pagination = Annotated[PageParams, Depends(page_params)]`,
        },
        {
          lang: "python",
          code: `# app/api/routes/auth.py
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from app.api.deps import CurrentUser, UserServiceDep
from app.core.security import create_access_token
from app.schemas.user import Token, UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserOut, status_code=201)
async def register(body: UserCreate, users: UserServiceDep):
    return UserOut.model_validate(await users.register(body))

@router.post("/login", response_model=Token)
async def login(form: Annotated[OAuth2PasswordRequestForm, Depends()], users: UserServiceDep):
    user = await users.authenticate(form.username, form.password)
    if user is None:
        raise HTTPException(401, "Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    return Token(access_token=create_access_token(user.id, user.role))

@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return UserOut.model_validate(user)`,
        },
        {
          lang: "python",
          code: `# app/api/routes/products.py
from typing import Literal
from fastapi import APIRouter, Query
from app.api.deps import CurrentUser, ProductServiceDep
from app.api.pagination import Pagination
from app.schemas.common import Page
from app.schemas.product import ProductCreate, ProductOut, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])
Sort = Literal["price", "-price", "name", "-created_at"]

@router.get("", response_model=Page[ProductOut])
async def list_products(service: ProductServiceDep, paging: Pagination,
                        category: str | None = None,
                        q: str | None = Query(None, min_length=2, description="Search by name"),
                        sort: Sort = "-created_at"):
    items, total = await service.list_products(category, q, sort, paging.offset, paging.size)
    return Page[ProductOut](items=[ProductOut.model_validate(p) for p in items],
                            total=total, page=paging.page, size=paging.size)

@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, service: ProductServiceDep):
    return ProductOut.model_validate(await service.get_product(product_id))

@router.post("", response_model=ProductOut, status_code=201)
async def create_product(body: ProductCreate, user: CurrentUser, service: ProductServiceDep):
    return ProductOut.model_validate(await service.create_product(user, body))

@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(product_id: int, body: ProductUpdate, user: CurrentUser, service: ProductServiceDep):
    return ProductOut.model_validate(await service.update_product(user, product_id, body))

@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: int, user: CurrentUser, service: ProductServiceDep):
    await service.delete_product(user, product_id)`,
        },
        {
          lang: "python",
          code: `# app/main.py  (changes from Day 1)
from app.api.routes import auth, health, products
...
    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(auth.router, prefix="/api/v1")
    app.include_router(products.router, prefix="/api/v1")`,
        },
        {
          note: "Both services depend on `get_session`. FastAPI caches a dependency within one request, so they share the **same** session, which is exactly what you want for a single unit of work.",
        },
      ],
    },
    {
      h: "Step 9: run it and try it in Swagger",
      blocks: [
        {
          lang: "bash",
          code: `uv run fastapi dev app/main.py
# http://127.0.0.1:8000/docs`,
        },
        {
          list: [
            "`POST /api/v1/auth/register` with an email and an 8+ character password.",
            "Click **Authorize** (top right), enter the email as username and the password. Swagger now sends the token.",
            "Create two products, then list with `?category=beverages&sort=-price&page=1&size=1`.",
            "Register a second user, authorise as them, and try to PATCH the first user's product: you should get 404.",
            "Try a negative price (422), a duplicate name (409) and an expired or garbage token (401). Every error has the same shape.",
            "Check the data really is in Postgres: `docker compose exec db psql -U postgres -d shop -c \"select id, name, owner_id from products\"`.",
          ],
          ordered: true,
        },
      ],
    },
    {
      h: "Step 10: tests",
      blocks: [
        {
          lang: "toml",
          code: `# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]`,
        },
        {
          lang: "python",
          code: `# tests/conftest.py
import os
os.environ.setdefault("JWT_SECRET", "test-secret-do-not-use-in-production")

import pytest  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402
import app.models  # noqa: E402,F401
from app.db.base import Base  # noqa: E402
from app.db.session import get_session  # noqa: E402
from app.main import app  # noqa: E402

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

async def login(client: AsyncClient, email: str, password: str = "password123") -> dict:
    await client.post("/api/v1/auth/register", json={"email": email, "password": password})
    r = await client.post("/api/v1/auth/login", data={"username": email, "password": password})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}

@pytest.fixture
async def asha(client):
    return await login(client, "asha@test.com")`,
        },
        {
          lang: "python",
          code: `# tests/test_auth.py
async def test_register_and_me(client, asha):
    r = await client.get("/api/v1/auth/me", headers=asha)
    assert r.status_code == 200 and r.json()["email"] == "asha@test.com"

async def test_duplicate_email_409(client, asha):
    r = await client.post("/api/v1/auth/register", json={"email": "ASHA@test.com", "password": "password123"})
    assert r.status_code == 409

async def test_wrong_password_401(client, asha):
    r = await client.post("/api/v1/auth/login", data={"username": "asha@test.com", "password": "nope-nope"})
    assert r.status_code == 401

async def test_garbage_token_401(client):
    r = await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.token"})
    assert r.status_code == 401`,
        },
        {
          lang: "python",
          code: `# tests/test_products.py
from tests.conftest import login

CHAI = {"name": "Masala Chai 250g", "price": 249, "stock": 40, "category": "beverages"}

async def test_create_requires_auth(client):
    assert (await client.post("/api/v1/products", json=CHAI)).status_code == 401

async def test_create_list_filter_sort(client, asha):
    await client.post("/api/v1/products", json=CHAI, headers=asha)
    await client.post("/api/v1/products", json={**CHAI, "name": "Green Tea", "price": 399, "category": "tea"}, headers=asha)
    body = (await client.get("/api/v1/products", params={"sort": "-price", "size": 1})).json()
    assert body["total"] == 2 and body["items"][0]["name"] == "Green Tea"

async def test_duplicate_name_409_shape(client, asha):
    await client.post("/api/v1/products", json=CHAI, headers=asha)
    r = await client.post("/api/v1/products", json=CHAI, headers=asha)
    assert r.status_code == 409 and r.json()["error"]["code"] == "conflict"

async def test_validation_error_shape(client, asha):
    r = await client.post("/api/v1/products", json={**CHAI, "price": -5}, headers=asha)
    assert r.status_code == 422 and r.json()["error"]["details"][0]["field"] == "price"

async def test_other_user_gets_404(client, asha):
    product_id = (await client.post("/api/v1/products", json=CHAI, headers=asha)).json()["id"]
    ravi = await login(client, "ravi@test.com")
    assert (await client.patch(f"/api/v1/products/{product_id}", json={"price": 1}, headers=ravi)).status_code == 404
    assert (await client.delete(f"/api/v1/products/{product_id}", headers=ravi)).status_code == 404

async def test_owner_can_patch_and_delete(client, asha):
    product_id = (await client.post("/api/v1/products", json=CHAI, headers=asha)).json()["id"]
    r = await client.patch(f"/api/v1/products/{product_id}", json={"price": 199}, headers=asha)
    assert r.json()["price"] == 199
    assert (await client.delete(f"/api/v1/products/{product_id}", headers=asha)).status_code == 204
    assert (await client.get(f"/api/v1/products/{product_id}")).status_code == 404`,
        },
        {
          lang: "bash",
          code: `touch tests/__init__.py              # lets tests import helpers from conftest
uv run pytest -q --cov=app --cov-report=term-missing
uv run ruff format . && uv run ruff check .`,
        },
      ],
    },
    {
      h: "Definition of done",
      blocks: [
        {
          list: [
            "`docker compose up -d`, `alembic upgrade head` and `fastapi dev` start everything from a fresh clone (write these steps in the README).",
            "Register, login, create, list with filters/sorting/pagination, update and delete all work in Swagger with **Authorize**.",
            "Other users get 404 on your products; all errors share one JSON shape.",
            "10 tests pass; coverage report reviewed; Ruff clean.",
            "No secrets committed: `.env` is in `.gitignore`, `.env.example` is committed.",
          ],
        },
        "You now have the backend skeleton for every GenAI project in this plan: DocChat (Day 9) adds document and chunk tables and a `rag` service; the agent project adds tools that call these services.",
      ],
    },
  ],
  revise: [
    "Order: deps + Postgres → settings → db session + models → Alembic migration → errors + security → schemas → repositories → services → deps + routes → tests.",
    "Repositories commit and roll back on `IntegrityError`; services translate it to `ConflictError` (409).",
    "Ownership in services via `_owned()`; 404 for other users' products; admins bypass.",
    "Both services share one per-request session through FastAPI's dependency cache.",
    "Tests: `JWT_SECRET` env before importing the app; in-memory SQLite per test; `login()` helper; check status codes and the error shape.",
  ],
  practice: [
    "Add an `orders` table and `POST /api/v1/orders` that decrements stock inside a transaction with `with_for_update`.",
    "Add `role=\"admin\"` users (set manually in the database) who can see `GET /api/v1/admin/users`, protected with `require_role(\"admin\")`.",
    "Add a refresh-token table and `POST /auth/refresh` with token rotation.",
  ],
};

export const mongoApi = {
  minutes: 150,
  level: "Intermediate",
  intro:
    "Optional, for MERN developers: build the same Shop API on **MongoDB with Beanie**. The routes, schemas, errors and auth stay the same; only the models, repositories and startup change. Doing this once proves the value of layered architecture, and gives you a MongoDB answer in interviews.",
  sections: [
    {
      h: "What changes and what stays",
      blocks: [
        {
          table: {
            head: ["Part", "Changes?", "How"],
            rows: [
              ["Routes, services, errors, security, pagination", "No (almost)", "Ids become strings instead of ints"],
              ["Pydantic API schemas", "Slightly", "`id: str`, `owner_id: str`"],
              ["Models", "Yes", "Beanie `Document` classes instead of SQLAlchemy tables"],
              ["Repositories", "Yes", "Beanie queries, same method names"],
              ["Startup", "Yes", "`init_beanie` in the lifespan; no SQL session dependency"],
              ["Migrations", "No Alembic", "Schema lives in code; use Beanie migrations for data changes if needed"],
            ],
          },
        },
        {
          lang: "bash",
          code: `cp -r shop-api shop-api-mongo && cd shop-api-mongo
uv remove "sqlalchemy[asyncio]" asyncpg alembic aiosqlite
uv add beanie
docker run -d --name shop-mongo -p 27017:27017 mongo:7
# .env: MONGO_URL=mongodb://localhost:27017  MONGO_DB=shop`,
        },
      ],
    },
    {
      h: "Documents",
      blocks: [
        {
          lang: "python",
          code: `# app/models/documents.py
from datetime import datetime, timezone
from typing import Annotated
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field

def now() -> datetime:
    return datetime.now(timezone.utc)

class UserDoc(Document):
    email: Annotated[str, Indexed(unique=True)]
    password_hash: str
    role: str = "customer"
    created_at: datetime = Field(default_factory=now)

    class Settings:
        name = "users"

class ProductDoc(Document):
    name: Annotated[str, Indexed(unique=True)]
    price: float
    stock: int = 0
    category: Annotated[str, Indexed()]
    description: str | None = None
    owner_id: PydanticObjectId
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)

    class Settings:
        name = "products"`,
        },
      ],
    },
    {
      h: "Startup with lifespan",
      blocks: [
        {
          lang: "python",
          code: `# app/main.py
from contextlib import asynccontextmanager
from beanie import init_beanie
from pymongo import AsyncMongoClient
from app.models.documents import ProductDoc, UserDoc

@asynccontextmanager
async def lifespan(app):
    settings = get_settings()
    client = AsyncMongoClient(settings.mongo_url)
    await init_beanie(database=client[settings.mongo_db], document_models=[UserDoc, ProductDoc])
    yield
    await client.close()

def create_app() -> FastAPI:
    app = FastAPI(title=get_settings().app_name, lifespan=lifespan)
    ...`,
        },
        "Add `mongo_url: str` and `mongo_db: str = \"shop\"` to `Settings`, and remove `database_url`.",
      ],
    },
    {
      h: "Repositories with the same interface",
      blocks: [
        {
          lang: "python",
          code: `# app/repositories/product_repository.py
import re
from datetime import datetime, timezone
from beanie import PydanticObjectId
from pymongo.errors import DuplicateKeyError
from app.core.errors import ConflictError
from app.models.documents import ProductDoc

SORTS = {"price": "+price", "-price": "-price", "name": "+name", "-created_at": "-created_at"}

class ProductRepository:
    async def list(self, category, q, sort, offset, limit) -> tuple[list[ProductDoc], int]:
        query = {}
        if category:
            query["category"] = category
        if q:
            query["name"] = {"$regex": re.escape(q), "$options": "i"}    # escape user input!
        find = ProductDoc.find(query)
        total = await find.count()
        items = await find.sort(SORTS[sort], "+_id").skip(offset).limit(limit).to_list()
        return items, total

    async def get(self, product_id: str) -> ProductDoc | None:
        try:
            return await ProductDoc.get(PydanticObjectId(product_id))
        except Exception:                        # not a valid ObjectId → treat as missing
            return None

    async def get_by_name(self, name: str) -> ProductDoc | None:
        return await ProductDoc.find_one({"name": {"$regex": f"^{re.escape(name)}$", "$options": "i"}})

    async def add(self, **data) -> ProductDoc:
        try:
            return await ProductDoc(**data).insert()
        except DuplicateKeyError:
            raise ConflictError(f"A product named '{data['name']}' already exists")

    async def update(self, product: ProductDoc, **changes) -> ProductDoc:
        await product.set({**changes, "updated_at": datetime.now(timezone.utc)})
        return product

    async def delete(self, product: ProductDoc) -> None:
        await product.delete()`,
        },
        {
          warn: "Always `re.escape` user input used in a `$regex`: characters like `.*` would otherwise change the query, and a malicious pattern can make the search extremely slow.",
        },
        {
          list: [
            "Services keep the same logic. Remove the SQLAlchemy `IntegrityError` handling (the repository raises `ConflictError` on `DuplicateKeyError`), and compare `product.owner_id != user.id` as ObjectIds.",
            "In `deps.py`, services no longer need a session: `ProductService(ProductRepository())`.",
            "In schemas: `id: str` and `owner_id: str`, and build responses with `ProductOut(id=str(p.id), owner_id=str(p.owner_id), **p.model_dump(exclude={\"id\", \"owner_id\"}))`.",
            "Route paths use `product_id: str`. JWT `sub` holds the string ObjectId.",
          ],
        },
      ],
    },
    {
      h: "Testing and wrap-up",
      blocks: [
        {
          list: [
            "Tests can use a separate database name per test run (e.g. `shop_test_<uuid>`) on your local MongoDB, dropped at the end; or `mongomock-motor`-style fakes for fast unit tests.",
            "Reuse the same test cases from the Postgres version: they should pass with only id-type changes. That's the proof the layers work.",
            "Write a README section comparing the two versions: what changed, and when you'd choose each database.",
          ],
        },
      ],
    },
  ],
  revise: [
    "Only models, repositories, startup and id types change; routes, services, errors and auth stay.",
    "`init_beanie` in the lifespan; `Indexed(unique=True)`; `DuplicateKeyError` → 409.",
    "Escape user input in `$regex`; treat invalid ObjectIds as not found.",
    "Same tests pass on both databases = your layering is right.",
  ],
  practice: [
    "Add an aggregation endpoint `GET /api/v1/stats/categories` returning product count and average price per category.",
  ],
};
