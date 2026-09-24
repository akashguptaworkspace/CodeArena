// Day 1: Python backend structure + first FastAPI project. Merged into d01.js. Shape: see ./index.js

export const backendStructure = {
  minutes: 50,
  level: "Beginner",
  intro:
    "You already know how to organise an Express app: routes, controllers, services, Mongoose models, validators, middleware and an error handler. Python backends use the **same ideas with different names**. This lesson maps each piece across, explains how FastAPI changes a few of them, and shows how Python backend developers work day to day, so the build guide that follows feels familiar.",
  sections: [
    {
      h: "The same request, in Express and in FastAPI",
      blocks: [
        "Here's one endpoint, \"create a product\", written the way you'd write it in Express, then in FastAPI. Read them side by side.",
        {
          lang: "javascript",
          code: `// Express: routes/products.js + controllers/productController.js + validators + service
router.post("/products", validate(createProductSchema), productController.create);

// controllers/productController.js
exports.create = async (req, res, next) => {
  try {
    const product = await productService.create(req.body);   // business logic
    res.status(201).json(product);
  } catch (err) {
    next(err);                                                // goes to error middleware
  }
};`,
        },
        {
          lang: "python",
          code: `# FastAPI: app/api/routes/products.py
@router.post("/products", response_model=ProductOut, status_code=201)
def create_product(body: ProductCreate, service: ProductServiceDep):
    product = service.create_product(body)      # business logic
    return ProductOut.model_validate(product)   # errors raised here go to the exception handler`,
        },
        "Notice what disappeared in FastAPI:",
        {
          list: [
            "**No validation middleware:** typing `body: ProductCreate` (a Pydantic model) makes FastAPI read the JSON body, validate it, and return a 422 with details if it's invalid.",
            "**No `req`, `res`, `next`:** you receive typed arguments and simply `return` data. Errors are `raise`d and handled centrally.",
            "**No manual service wiring:** `service: ProductServiceDep` asks FastAPI's dependency injection to create or provide the service.",
            "**Free API docs:** the route, body schema and response appear in Swagger at `/docs` automatically.",
          ],
        },
      ],
    },
    {
      h: "Express folder structure → Python folder structure",
      blocks: [
        {
          table: {
            head: ["Express (MVC)", "Python / FastAPI", "Job"],
            rows: [
              ["`app.js` / `server.js`", "`app/main.py`", "Create the app, add middleware, include routers"],
              ["`routes/*.js`", "`app/api/routes/*.py` (`APIRouter`)", "URL paths and HTTP methods"],
              ["`controllers/*.js`", "The route functions themselves", "Read input, call a service, shape the response"],
              ["`services/*.js`", "`app/services/*.py`", "Business rules (no HTTP details)"],
              ["Mongoose models / DB calls", "`app/models/*.py` + `app/repositories/*.py`", "Data shape and database access"],
              ["Joi / Zod / express-validator", "`app/schemas/*.py` (Pydantic)", "Validate input, shape output (DTOs)"],
              ["Middleware `(req, res, next)`", "Middleware **and** dependencies (`Depends`)", "Cross-cutting logic: auth, logging, DB sessions"],
              ["Error-handling middleware", "`@app.exception_handler(...)`", "Turn exceptions into HTTP responses"],
              ["`config/` + dotenv", "`app/core/config.py` (pydantic-settings)", "Typed configuration from environment"],
              ["`nodemon`", "`fastapi dev` / `uvicorn --reload`", "Auto-restart on file changes"],
              ["Jest + Supertest", "pytest + `TestClient`", "Tests"],
              ["ESLint + Prettier", "Ruff", "Lint and format"],
            ],
          },
        },
        {
          lang: "text",
          code: `shop-api/
├── app/
│   ├── __init__.py
│   ├── main.py                 # like app.js: create_app(), middleware, routers
│   ├── core/
│   │   ├── config.py           # settings from .env
│   │   └── errors.py           # custom exceptions + exception handlers
│   ├── api/
│   │   ├── deps.py             # dependency providers (services, auth, db)
│   │   └── routes/
│   │       ├── health.py
│   │       └── products.py     # routes + controllers
│   ├── schemas/product.py      # Pydantic request/response models (validators / DTOs)
│   ├── models/product.py       # domain / database models
│   ├── repositories/product_repository.py   # data access only
│   └── services/product_service.py          # business logic only
├── tests/test_products.py
├── .env.example
└── pyproject.toml`,
        },
        {
          note: "Is this \"MVC\"? For a JSON API, the **V**iew is the JSON response, which Pydantic schemas define. **C**ontrollers are the route functions. **M**odels are the data layer. Python teams usually call this a **layered architecture**: routes → services → repositories. The names differ between teams (`crud/` instead of `repositories/`, `routers/` instead of `api/routes/`), but the layers are the same.",
        },
      ],
    },
    {
      h: "The rule of the layers",
      blocks: [
        "Each layer only talks to the one below it, and each has one job. This is what makes code testable and easy to change.",
        {
          lang: "text",
          code: `HTTP request
   │
   ▼
routes (controllers)   knows HTTP: paths, status codes, query params, response models
   │  calls
   ▼
services               knows business rules: "names must be unique", "can't delete an item in an order"
   │  calls
   ▼
repositories           knows storage: SQL / MongoDB / in-memory dict
   │
   ▼
database`,
        },
        {
          list: [
            "**Routes never contain business rules.** If you wrote the same logic in a CLI or a background job, it should live in the service and be reused.",
            "**Services never import FastAPI.** They raise your own exceptions (`NotFoundError`), not `HTTPException`. That keeps them usable outside HTTP, for example from a LangGraph tool later.",
            "**Repositories never contain business rules.** They only save and load. Swapping in-memory storage for Postgres (Day 2) means changing only this layer.",
            "**Schemas are the contract** at the edge: `ProductCreate` for input, `ProductOut` for output, so internal fields (like password hashes) never leak.",
          ],
        },
        {
          tip: "This exact separation is what you'll reuse in every GenAI project: `rag/` or `agents/` become new service modules, and your routes stay thin.",
        },
      ],
    },
    {
      h: "Dependency injection: FastAPI's replacement for most middleware",
      blocks: [
        "In Express you attach things to `req` in middleware (`req.user = ...`). In FastAPI you declare what a route **needs**, and FastAPI provides it per request:",
        {
          lang: "python",
          code: `from typing import Annotated
from fastapi import Depends, Header, HTTPException

def get_current_user(authorization: Annotated[str | None, Header()] = None) -> dict:
    if authorization != "Bearer demo-token":
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"id": 1, "name": "Asha"}

CurrentUser = Annotated[dict, Depends(get_current_user)]

@router.get("/me")
def me(user: CurrentUser):          # FastAPI runs get_current_user first
    return user`,
        },
        {
          list: [
            "Dependencies can depend on other dependencies (the service depends on the repository, the repository on the DB session).",
            "A dependency with `yield` runs cleanup after the response, like closing a DB session.",
            "In tests you replace any dependency with `app.dependency_overrides[...]`, which is much easier than mocking middleware.",
            "Real **middleware** still exists (`@app.middleware(\"http\")`) for things that wrap every request: logging, timing, request IDs, CORS.",
          ],
        },
      ],
    },
    {
      h: "How Python backend developers work day to day",
      blocks: [
        {
          table: {
            head: ["Task", "Command / tool"],
            rows: [
              ["Start a project", "`uv init`, then create the `app/` folders"],
              ["Add a package", "`uv add fastapi` (dev tools: `uv add --dev pytest ruff`)"],
              ["Run the dev server with reload", "`uv run fastapi dev app/main.py`"],
              ["Format and lint", "`uv run ruff format .` and `uv run ruff check . --fix` (or on save in VS Code)"],
              ["Run tests", "`uv run pytest -q` (add `-x` to stop at first failure)"],
              ["Try the API", "`http://127.0.0.1:8000/docs` (Swagger) or `curl` / Postman / Thunder Client"],
              ["Debug", "VS Code debugger with breakpoints (launch config below), or `breakpoint()` in code"],
              ["Before a commit", "format, lint, test (automate with a pre-commit hook and CI)"],
            ],
          },
        },
        "VS Code debug config (`.vscode/launch.json`) so F5 starts the API with breakpoints:",
        {
          lang: "json",
          code: `{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "debugpy",
      "request": "launch",
      "module": "uvicorn",
      "args": ["app.main:app", "--reload"],
      "jinja": true
    }
  ]
}`,
        },
        {
          tip: "Practise the habit that separates juniors from mid-level developers: for every endpoint, write one test for the success case and one for each error (404, 409, 422). It takes minutes with `TestClient`.",
        },
      ],
    },
  ],
  revise: [
    "Express → FastAPI: `app.js` → `main.py`; routes + controllers → route functions in `APIRouter`s; services → services; Mongoose → models + repositories; Joi/Zod → Pydantic schemas; error middleware → exception handlers; dotenv → pydantic-settings.",
    "Layers: routes (HTTP) → services (business rules) → repositories (storage). Each talks only to the layer below.",
    "Services raise your own exceptions, never `HTTPException`; handlers map them to status codes.",
    "Separate input and output schemas so internal fields never leak.",
    "`Depends` provides services, auth and DB sessions per request and is easy to override in tests; middleware wraps every request.",
    "Daily loop: `uv add`, `fastapi dev`, Swagger at `/docs`, Ruff, pytest, debugger.",
  ],
  mistakes: [
    "Putting database queries and business rules directly in route functions (\"fat controllers\").",
    "Raising `HTTPException` inside services, which ties business logic to HTTP.",
    "Returning database models directly, leaking fields you didn't mean to expose.",
    "Creating services or DB clients at import time in every module instead of through dependencies.",
  ],
  interview: [
    {
      q: "How would you structure a FastAPI project compared with Express?",
      a: "The same layered idea: an `app/main.py` that creates the app, adds middleware and includes routers; `api/routes` with thin route functions acting as controllers; `services` for business rules; `repositories` or `crud` for data access; `models` for ORM models; `schemas` with Pydantic models for request validation and response shaping; `core` for config and error handling; and `deps.py` for dependency injection. FastAPI replaces validation middleware with typed Pydantic parameters and most middleware with `Depends`, and it generates OpenAPI docs automatically.",
    },
    {
      q: "Why keep business logic out of route handlers?",
      a: "So it can be reused and tested without HTTP: the same service can be called from an API route, a CLI, a background worker or an LLM agent's tool. It also keeps routes small and readable, and lets you change storage or transport without touching business rules.",
    },
  ],
  practice: [
    "Draw your last Express project's folder structure and write the FastAPI equivalent next to each folder.",
    "Take one of your Express controllers and write its FastAPI version on paper: route, schema, service call, error.",
  ],
};

export const firstApi = {
  minutes: 180,
  level: "Beginner",
  intro:
    "Build your first real Python backend: a **Shop API** for products with create, list (with filters and pagination), get, update and delete. You'll build it file by file in the layered structure from the previous lesson, with Pydantic validation, typed settings, custom errors, logging middleware, CORS, Swagger docs and tests. Storage is in memory today; on Day 2 you'll swap in Postgres by changing only one file.",
  sections: [
    {
      h: "Step 1: create the project",
      blocks: [
        {
          lang: "bash",
          code: `mkdir shop-api && cd shop-api
uv init --python 3.12 --no-readme
rm -f main.py hello.py                 # we'll use the app/ package instead (Windows: del main.py)
uv add "fastapi[standard]" pydantic-settings
uv add --dev pytest ruff

# create the folders (Mac/Linux)
mkdir -p app/core app/api/routes app/schemas app/models app/repositories app/services tests
touch app/__init__.py app/core/__init__.py app/api/__init__.py app/api/routes/__init__.py \\
      app/schemas/__init__.py app/models/__init__.py app/repositories/__init__.py app/services/__init__.py`,
        },
        {
          lang: "powershell",
          code: `# Windows PowerShell equivalent for the folders
"app\\core","app\\api\\routes","app\\schemas","app\\models","app\\repositories","app\\services","tests" |
  ForEach-Object { New-Item -ItemType Directory -Force $_ | Out-Null }
"app","app\\core","app\\api","app\\api\\routes","app\\schemas","app\\models","app\\repositories","app\\services" |
  ForEach-Object { New-Item -ItemType File -Force "$_\\__init__.py" | Out-Null }`,
        },
        "An empty `__init__.py` marks a folder as a Python **package**, so you can import with dotted paths like `from app.schemas.product import ProductCreate`.",
      ],
    },
    {
      h: "Step 2: config (like dotenv + config.js)",
      blocks: [
        {
          lang: "python",
          code: `# app/core/config.py
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Shop API"
    environment: str = "development"
    cors_origins: list[str] = ["http://localhost:5173"]     # your React dev server

@lru_cache
def get_settings() -> Settings:
    return Settings()                    # read .env once, reuse everywhere`,
        },
        {
          lang: "bash",
          code: `# .env.example  (copy to .env; lists must be written as JSON)
APP_NAME="Shop API"
ENVIRONMENT=development
CORS_ORIGINS=["http://localhost:5173"]`,
        },
        "`@lru_cache` makes `get_settings()` return the same object every time, so `.env` is read once, like requiring a config module in Node.",
      ],
    },
    {
      h: "Step 3: schemas (like Joi/Zod validators + DTOs)",
      blocks: [
        {
          lang: "python",
          code: `# app/schemas/product.py
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=100, examples=["Masala Chai 250g"])
    price: float = Field(gt=0, description="Price in INR", examples=[249.0])
    stock: int = Field(default=0, ge=0)
    category: str = Field(min_length=2, max_length=50, examples=["beverages"])

class ProductCreate(ProductBase):
    """Body for POST /products."""

class ProductUpdate(BaseModel):
    """Body for PATCH /products/{id}: every field optional."""
    name: str | None = Field(default=None, min_length=2, max_length=100)
    price: float | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)
    category: str | None = Field(default=None, min_length=2, max_length=50)

class ProductOut(ProductBase):
    """What the API returns."""
    model_config = ConfigDict(from_attributes=True)   # can be built from any object with attributes
    id: int
    created_at: datetime

class ProductPage(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    size: int`,
        },
        {
          list: [
            "`ProductCreate` inherits the fields and rules from `ProductBase`: write them once, reuse them.",
            "`ProductUpdate` makes everything optional for partial updates (PATCH).",
            "`ProductOut` adds server-generated fields (`id`, `created_at`). `from_attributes=True` lets you convert a model object into this schema.",
            "`examples` show up pre-filled in Swagger's \"Try it out\".",
          ],
        },
      ],
    },
    {
      h: "Step 4: model and repository (the data layer)",
      blocks: [
        {
          lang: "python",
          code: `# app/models/product.py
from dataclasses import dataclass, field
from datetime import datetime, timezone

@dataclass
class Product:
    id: int
    name: str
    price: float
    stock: int
    category: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))`,
        },
        {
          lang: "python",
          code: `# app/repositories/product_repository.py
from app.models.product import Product

class ProductRepository:
    """Stores products in memory. On Day 2 this becomes a Postgres repository with the same methods."""

    def __init__(self) -> None:
        self._items: dict[int, Product] = {}
        self._next_id = 1

    def list(self, category: str | None, offset: int, limit: int) -> tuple[list[Product], int]:
        items = [p for p in self._items.values() if category is None or p.category == category]
        return items[offset:offset + limit], len(items)

    def get(self, product_id: int) -> Product | None:
        return self._items.get(product_id)

    def get_by_name(self, name: str) -> Product | None:
        return next((p for p in self._items.values() if p.name.lower() == name.lower()), None)

    def add(self, **data) -> Product:
        product = Product(id=self._next_id, **data)
        self._items[product.id] = product
        self._next_id += 1
        return product

    def update(self, product: Product, **changes) -> Product:
        for key, value in changes.items():
            setattr(product, key, value)
        return product

    def delete(self, product_id: int) -> None:
        self._items.pop(product_id, None)`,
        },
        "The repository only stores and loads. It knows nothing about HTTP or business rules. `**data` collects keyword arguments into a dict (like `...rest`), and `setattr(obj, key, value)` sets an attribute by name.",
      ],
    },
    {
      h: "Step 5: errors and service (business logic)",
      blocks: [
        {
          lang: "python",
          code: `# app/core/errors.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

class AppError(Exception):
    """Base class for errors the API should turn into clean HTTP responses."""
    status_code = 400

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

class NotFoundError(AppError):
    status_code = 404

class ConflictError(AppError):
    status_code = 409

def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.message})`,
        },
        {
          lang: "python",
          code: `# app/services/product_service.py
from app.core.errors import ConflictError, NotFoundError
from app.models.product import Product
from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreate, ProductUpdate

class ProductService:
    def __init__(self, repo: ProductRepository) -> None:
        self.repo = repo

    def list_products(self, category: str | None, page: int, size: int) -> tuple[list[Product], int]:
        return self.repo.list(category, offset=(page - 1) * size, limit=size)

    def get_product(self, product_id: int) -> Product:
        product = self.repo.get(product_id)
        if product is None:
            raise NotFoundError(f"Product {product_id} not found")
        return product

    def create_product(self, data: ProductCreate) -> Product:
        if self.repo.get_by_name(data.name):
            raise ConflictError(f"A product named '{data.name}' already exists")
        return self.repo.add(**data.model_dump())

    def update_product(self, product_id: int, data: ProductUpdate) -> Product:
        product = self.get_product(product_id)
        changes = data.model_dump(exclude_unset=True)       # only fields the client actually sent
        if "name" in changes:
            existing = self.repo.get_by_name(changes["name"])
            if existing and existing.id != product_id:
                raise ConflictError(f"A product named '{changes['name']}' already exists")
        return self.repo.update(product, **changes)

    def delete_product(self, product_id: int) -> None:
        self.get_product(product_id)                          # raises 404 if missing
        self.repo.delete(product_id)`,
        },
        {
          list: [
            "Business rules live here: names must be unique, missing products are an error.",
            "The service raises **your** exceptions. The handler in `errors.py` turns them into `{\"error\": ...}` with the right status, exactly like Express error middleware.",
            "`model_dump(exclude_unset=True)` returns only the fields present in the request, which makes PATCH work correctly.",
          ],
        },
      ],
    },
    {
      h: "Step 6: dependencies and routes (controllers)",
      blocks: [
        {
          lang: "python",
          code: `# app/api/deps.py
from typing import Annotated
from fastapi import Depends
from app.repositories.product_repository import ProductRepository
from app.services.product_service import ProductService

_repository = ProductRepository()          # one shared in-memory store for the running app

def get_product_service() -> ProductService:
    return ProductService(_repository)

ProductServiceDep = Annotated[ProductService, Depends(get_product_service)]`,
        },
        {
          lang: "python",
          code: `# app/api/routes/products.py
from fastapi import APIRouter, Query
from app.api.deps import ProductServiceDep
from app.schemas.product import ProductCreate, ProductOut, ProductPage, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])

@router.get("", response_model=ProductPage, summary="List products")
def list_products(
    service: ProductServiceDep,
    category: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
):
    items, total = service.list_products(category, page, size)
    return ProductPage(items=[ProductOut.model_validate(p) for p in items], total=total, page=page, size=size)

@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, service: ProductServiceDep):
    return ProductOut.model_validate(service.get_product(product_id))

@router.post("", response_model=ProductOut, status_code=201)
def create_product(body: ProductCreate, service: ProductServiceDep):
    return ProductOut.model_validate(service.create_product(body))

@router.patch("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, body: ProductUpdate, service: ProductServiceDep):
    return ProductOut.model_validate(service.update_product(product_id, body))

@router.delete("/{product_id}", status_code=204)
def delete_product(product_id: int, service: ProductServiceDep):
    service.delete_product(product_id)`,
        },
        {
          lang: "python",
          code: `# app/api/routes/health.py
from fastapi import APIRouter
router = APIRouter(tags=["health"])

@router.get("/health")
def health():
    return {"status": "ok"}`,
        },
        "Each route function is a controller: it reads typed inputs, calls the service, and converts the result into an output schema. `ProductOut.model_validate(product)` is the explicit \"model → DTO\" step.",
      ],
    },
    {
      h: "Step 7: main.py (like app.js)",
      blocks: [
        {
          lang: "python",
          code: `# app/main.py
import logging
import time
import uuid
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import health, products
from app.core.config import get_settings
from app.core.errors import register_error_handlers

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("shop-api")

def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        request_id = request.headers.get("x-request-id", uuid.uuid4().hex[:8])
        start = time.perf_counter()
        response = await call_next(request)                 # like next() in Express
        ms = (time.perf_counter() - start) * 1000
        response.headers["x-request-id"] = request_id
        logger.info("%s %s %s %d %.0fms", request_id, request.method, request.url.path, response.status_code, ms)
        return response

    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(products.router, prefix="/api/v1")    # like app.use("/api/v1", router)
    return app

app = create_app()`,
        },
        {
          lang: "bash",
          code: `cp .env.example .env                 # Windows: copy .env.example .env
uv run fastapi dev app/main.py       # like nodemon: reloads on save
# open http://127.0.0.1:8000/docs`,
        },
        "In Swagger, try: create two products, create a duplicate name (409), send a negative price (422), list with `?category=beverages&page=1&size=1`, patch only the price, get a missing id (404), delete one (204). Watch the log line printed for every request.",
        {
          lang: "bash",
          code: `curl -X POST http://127.0.0.1:8000/api/v1/products \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Masala Chai 250g", "price": 249, "stock": 40, "category": "beverages"}'`,
        },
      ],
    },
    {
      h: "Step 8: tests (like Jest + Supertest)",
      blocks: [
        {
          lang: "python",
          code: `# tests/test_products.py
import pytest
from fastapi.testclient import TestClient
from app.api.deps import get_product_service
from app.main import app
from app.repositories.product_repository import ProductRepository
from app.services.product_service import ProductService

@pytest.fixture
def client():
    repo = ProductRepository()                          # a fresh, empty store for each test
    app.dependency_overrides[get_product_service] = lambda: ProductService(repo)
    yield TestClient(app)
    app.dependency_overrides.clear()

CHAI = {"name": "Masala Chai 250g", "price": 249, "stock": 40, "category": "beverages"}

def test_create_and_get(client):
    r = client.post("/api/v1/products", json=CHAI)
    assert r.status_code == 201
    product_id = r.json()["id"]
    assert client.get(f"/api/v1/products/{product_id}").json()["name"] == CHAI["name"]

def test_duplicate_name_is_409(client):
    client.post("/api/v1/products", json=CHAI)
    r = client.post("/api/v1/products", json=CHAI)
    assert r.status_code == 409 and "already exists" in r.json()["error"]

def test_invalid_price_is_422(client):
    assert client.post("/api/v1/products", json={**CHAI, "price": -5}).status_code == 422

def test_patch_only_price(client):
    product_id = client.post("/api/v1/products", json=CHAI).json()["id"]
    r = client.patch(f"/api/v1/products/{product_id}", json={"price": 199})
    assert r.json()["price"] == 199 and r.json()["name"] == CHAI["name"]

def test_missing_is_404(client):
    assert client.get("/api/v1/products/999").status_code == 404

def test_list_filters_and_paginates(client):
    client.post("/api/v1/products", json=CHAI)
    client.post("/api/v1/products", json={**CHAI, "name": "Green Tea", "category": "tea"})
    body = client.get("/api/v1/products", params={"category": "tea", "size": 1}).json()
    assert body["total"] == 1 and body["items"][0]["name"] == "Green Tea"`,
        },
        {
          lang: "bash",
          code: `uv run pytest -q
uv run ruff format . && uv run ruff check .`,
        },
        {
          list: [
            "A **fixture** (`@pytest.fixture`) prepares something for tests, like `beforeEach` in Jest. The code after `yield` is cleanup.",
            "`dependency_overrides` swaps the real service for one with a fresh repository, so tests don't affect each other.",
            "Tests cover the success path and every error path (404, 409, 422).",
          ],
        },
      ],
    },
    {
      h: "Checklist and what's next",
      blocks: [
        {
          list: [
            "The server starts with `uv run fastapi dev app/main.py` and `/docs` shows all endpoints with examples.",
            "All 6 tests pass; Ruff reports no issues.",
            "Every request prints a log line with request id, status and time.",
            "Push to GitHub with a README: what it does, how to run it, and the folder structure with one line per layer.",
          ],
        },
        "**Day 2 preview:** you'll replace `ProductRepository`'s dict with Postgres (SQLAlchemy) and add JWT auth. Because of the layers, the routes and service barely change.",
      ],
    },
  ],
  revise: [
    "Order of building: config → schemas → model → repository → errors → service → deps → routes → main → tests.",
    "Schemas: Base (shared rules) → Create (input), Update (all optional, PATCH), Out (adds id and timestamps, `from_attributes=True`).",
    "Services raise `NotFoundError` / `ConflictError`; one exception handler maps them to 404 / 409.",
    "`model_dump(exclude_unset=True)` for partial updates.",
    "`include_router(router, prefix=\"/api/v1\")` ≈ `app.use(\"/api/v1\", router)`; `@app.middleware(\"http\")` ≈ Express middleware.",
    "Tests: pytest fixture + `dependency_overrides` for a fresh repository per test.",
  ],
  practice: [
    "Add `GET /api/v1/products/search?q=chai` that matches names case-insensitively (route → service → repository).",
    "Add a `low_stock` endpoint returning products with stock under a threshold query param (default 5), with a test.",
    "Add an `X-API-Key` dependency and require it for POST, PATCH and DELETE only.",
  ],
};
