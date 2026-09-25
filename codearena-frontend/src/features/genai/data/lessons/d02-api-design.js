// Day 2: REST API design in FastAPI. Merged into d02.js. Shape: see ./index.js
export default {
  minutes: 70,
  level: "Intermediate",
  intro:
    "A working endpoint isn't the same as a well-designed API. Frontend developers, other services and interviewers judge an API by predictable URLs, correct status codes, consistent errors, pagination, versioning and safe retries. You've built REST APIs in Express, so this lesson focuses on the **conventions** and how to express each one cleanly in FastAPI.",
  sections: [
    {
      h: "Resources, URLs and methods",
      blocks: [
        "REST models your API as **resources** (nouns) and uses HTTP **methods** (verbs) to act on them. URLs are plural nouns; actions come from the method, not the path.",
        {
          table: {
            head: ["Action", "Method + path", "Success status", "Notes"],
            rows: [
              ["List products", "`GET /api/v1/products`", "200", "Paginated, filterable"],
              ["Get one product", "`GET /api/v1/products/{id}`", "200", "404 if missing"],
              ["Create", "`POST /api/v1/products`", "201", "Return the created resource (and a `Location` header)"],
              ["Replace fully", "`PUT /api/v1/products/{id}`", "200", "Client sends every field"],
              ["Update partly", "`PATCH /api/v1/products/{id}`", "200", "Client sends only changed fields"],
              ["Delete", "`DELETE /api/v1/products/{id}`", "204", "No body"],
              ["Nested resource", "`GET /api/v1/users/{id}/orders`", "200", "Orders belonging to a user"],
              ["Action that isn't CRUD", "`POST /api/v1/orders/{id}/cancel`", "200 / 202", "A verb is acceptable for real actions"],
            ],
          },
        },
        {
          list: [
            "**Bad:** `/getProducts`, `/createProduct`, `/products/delete/5`. **Good:** `GET /products`, `POST /products`, `DELETE /products/5`.",
            "Use lowercase, hyphens for multi-word paths (`/order-items`), and keep JSON fields consistently `snake_case` (Python style) or `camelCase` (JS style). Pick one for the whole API.",
            "**Safe** methods (GET, HEAD) don't change data. **Idempotent** methods (GET, PUT, DELETE) have the same effect whether called once or five times. POST and PATCH aren't idempotent by default, which matters for retries.",
          ],
        },
      ],
    },
    {
      h: "Status codes that matter",
      blocks: [
        {
          table: {
            head: ["Code", "Meaning", "Use it when"],
            rows: [
              ["200 OK", "Success with a body", "GET, PUT, PATCH, most POST actions"],
              ["201 Created", "A new resource was created", "Successful POST that creates something"],
              ["202 Accepted", "Accepted for processing later", "Background jobs (document indexing)"],
              ["204 No Content", "Success, no body", "DELETE"],
              ["400 Bad Request", "The request is wrong in a way validation didn't catch", "Business rule violations"],
              ["401 Unauthorized", "Not authenticated", "Missing or invalid token"],
              ["403 Forbidden", "Authenticated, but not allowed", "Wrong role"],
              ["404 Not Found", "Resource doesn't exist (or you may not know it exists)", "Missing id; other users' private data"],
              ["409 Conflict", "Clashes with current state", "Duplicate email or name, version conflict"],
              ["422 Unprocessable Content", "Validation failed", "FastAPI returns it automatically for bad input"],
              ["429 Too Many Requests", "Rate limit hit", "Include a `Retry-After` header"],
              ["500 / 502 / 503 / 504", "Server or upstream failure", "Bugs; upstream (LLM) errors; overload; timeouts"],
            ],
          },
        },
        {
          tip: "For another user's private resource, return **404**, not 403. A 403 confirms the resource exists, which leaks information.",
        },
        {
          lang: "python",
          code: `from fastapi import Response, status

@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(body: ProductCreate, service: ProductServiceDep, response: Response):
    product = await service.create_product(body)
    response.headers["Location"] = f"/api/v1/products/{product.id}"
    return ProductOut.model_validate(product)`,
        },
      ],
    },
    {
      h: "One error format for the whole API",
      blocks: [
        "Clients should be able to handle every error the same way. By default FastAPI returns `{\"detail\": ...}` for `HTTPException` and a list for validation errors, and your custom handler returns `{\"error\": ...}`. Make them consistent:",
        {
          lang: "python",
          code: `# app/core/errors.py
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

class AppError(Exception):
    status_code = 400
    code = "bad_request"               # machine-readable; subclasses override both
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message

class NotFoundError(AppError):
    status_code, code = 404, "not_found"

class ConflictError(AppError):
    status_code, code = 409, "conflict"

def error_body(code: str, message: str, details=None) -> dict:
    return {"error": {"code": code, "message": message, "details": details or []}}

def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error(request: Request, exc: AppError):
        return JSONResponse(status_code=exc.status_code, content=error_body(exc.code, exc.message))

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        details = [{"field": ".".join(str(p) for p in e["loc"][1:]), "message": e["msg"]} for e in exc.errors()]
        return JSONResponse(status_code=422, content=error_body("validation_error", "Some fields are invalid", details))

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException):
        return JSONResponse(status_code=exc.status_code, content=error_body("http_error", str(exc.detail)),
                            headers=getattr(exc, "headers", None))`,
        },
        {
          lang: "json",
          code: `{
  "error": {
    "code": "validation_error",
    "message": "Some fields are invalid",
    "details": [{ "field": "price", "message": "Input should be greater than 0" }]
  }
}`,
        },
        "Give each `AppError` subclass a machine-readable `code` (`\"product_not_found\"`, `\"duplicate_name\"`) so frontends can branch on it and show translated messages, instead of parsing English text.",
      ],
    },
    {
      h: "Pagination, filtering and sorting",
      blocks: [
        "Never return an unbounded list. Two common styles:",
        {
          table: {
            head: ["", "Offset (page / size)", "Cursor (keyset)"],
            rows: [
              ["Request", "`?page=3&size=20`", "`?limit=20&after=eyJpZCI6MTIzfQ`"],
              ["SQL", "`LIMIT 20 OFFSET 40`", "`WHERE id > 123 ORDER BY id LIMIT 20`"],
              ["Pros", "Simple; jump to any page; total count", "Fast on huge tables; stable when rows are added"],
              ["Cons", "Slow for deep pages; items shift when data changes", "No random page jumps"],
              ["Use for", "Admin tables, small/medium datasets", "Feeds, infinite scroll, large tables"],
            ],
          },
        },
        "A reusable pagination dependency keeps every list endpoint consistent:",
        {
          lang: "python",
          code: `from typing import Annotated, Generic, Literal, TypeVar
from fastapi import Depends, Query
from pydantic import BaseModel

T = TypeVar("T")

class PageParams(BaseModel):
    page: int
    size: int
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size

def page_params(page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100)) -> PageParams:
    return PageParams(page=page, size=size)

Pagination = Annotated[PageParams, Depends(page_params)]

class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int

@router.get("", response_model=Page[ProductOut])
async def list_products(
    service: ProductServiceDep,
    paging: Pagination,
    category: str | None = None,
    min_price: float | None = Query(None, ge=0),
    q: str | None = Query(None, min_length=2, description="Search in the name"),
    sort: Literal["price", "-price", "name", "-created_at"] = "-created_at",
):
    items, total = await service.list_products(category, min_price, q, sort, paging.offset, paging.size)
    return Page(items=[ProductOut.model_validate(p) for p in items], total=total,
                page=paging.page, size=paging.size)`,
        },
        {
          list: [
            "Cap `size` on the server (`le=100`) so nobody can request a million rows.",
            "`Literal[...]` for `sort` makes FastAPI reject unknown sort fields with 422 and lists the options in Swagger. **Never** put a raw user string into `ORDER BY`.",
            "A leading `-` for descending order (`-price`) is a common convention.",
            "`Page[ProductOut]` is a generic Pydantic model: one pagination shape reused for every resource.",
          ],
        },
      ],
    },
    {
      h: "Versioning and evolving an API",
      blocks: [
        {
          list: [
            "**URL versioning** (`/api/v1/...`) is the most common and the easiest to see and route. Header-based versioning exists but is harder for clients.",
            "**Additive changes are safe:** new optional fields, new endpoints. **Breaking changes** need a new version: removing or renaming fields, changing types or meaning.",
            "Keep old versions running for a deprecation period, and tell clients (docs, a `Deprecation` header).",
          ],
        },
        {
          lang: "python",
          code: `app.include_router(products_v1.router, prefix="/api/v1")
app.include_router(products_v2.router, prefix="/api/v2")   # v2 can reuse the same services`,
        },
      ],
    },
    {
      h: "File uploads and downloads",
      blocks: [
        "Uploads (PDFs for RAG, product images) use `multipart/form-data`. FastAPI gives you `UploadFile`, which streams large files to a temporary file instead of holding them all in memory.",
        {
          lang: "python",
          code: `import uuid
from pathlib import Path
from fastapi import File, HTTPException, UploadFile

UPLOAD_DIR = Path("uploads"); UPLOAD_DIR.mkdir(exist_ok=True)
MAX_BYTES = 10 * 1024 * 1024

@router.post("/documents", status_code=201)
async def upload_document(file: UploadFile = File(...)):
    if file.content_type != "application/pdf":
        raise HTTPException(415, "Only PDF files are allowed")
    head = await file.read(5)
    if head != b"%PDF-":                         # check the real file signature, not just the header
        raise HTTPException(415, "File is not a valid PDF")
    target = UPLOAD_DIR / f"{uuid.uuid4()}.pdf"  # never use the client's filename as a path
    size = len(head)
    with target.open("wb") as out:
        out.write(head)
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_BYTES:
                out.close(); target.unlink()
                raise HTTPException(413, "File too large (max 10 MB)")
            out.write(chunk)
    return {"id": target.stem, "filename": file.filename, "bytes": size}`,
        },
        {
          warn: "Validate type **and** signature, cap the size, store under a generated name, and in production put files in S3 rather than on the server's disk (Day 18). Never trust `file.filename` as a path; it can contain `../`.",
        },
        "Downloads: return `FileResponse(path, filename=\"report.pdf\")` for files on disk, or `StreamingResponse` for generated content.",
      ],
    },
    {
      h: "Idempotency and rate limiting",
      blocks: [
        "**Idempotency keys** make a POST safe to retry. If a client's network drops after sending \"create order\", it doesn't know whether the order was created. With an `Idempotency-Key` header, the server stores the first result for that key and returns it again for retries, instead of creating a duplicate. Payment APIs (Razorpay, Stripe) work this way.",
        {
          lang: "python",
          code: `@router.post("/orders", status_code=201)
async def create_order(body: OrderIn, user: CurrentUser, service: OrderServiceDep,
                       idempotency_key: str | None = Header(None)):
    if idempotency_key:
        cached = await service.get_idempotent_result(user.id, idempotency_key)
        if cached:
            return cached
    order = await service.create_order(user, body)
    if idempotency_key:
        await service.save_idempotent_result(user.id, idempotency_key, order, ttl_hours=24)
    return order`,
        },
        "**Rate limiting** protects your API and budget (especially LLM endpoints). Limit per user or API key, return **429** with `Retry-After`, and store counters in Redis so all server instances share them. Libraries such as `slowapi` add decorators; API gateways can do it before requests reach you.",
      ],
    },
    {
      h: "Health checks and documentation",
      blocks: [
        {
          list: [
            "`GET /health` (liveness): the process is up. `GET /ready` (readiness): dependencies (database, Redis) are reachable. Load balancers and Kubernetes use these.",
            "Document with `summary`, `description`, `tags`, `responses={404: {\"model\": ErrorOut}}` and `Field(examples=[...])`, so `/docs` is useful to frontend developers without asking you.",
            "Use `response_model` everywhere so the docs show real response shapes.",
          ],
        },
      ],
    },
  ],
  revise: [
    "Plural nouns for resources; methods for actions: GET list/get, POST create (201), PUT replace, PATCH partial, DELETE (204).",
    "Safe = no changes (GET); idempotent = same effect on repeat (GET, PUT, DELETE).",
    "401 = not logged in; 403 = not allowed; 404 for others' private data; 409 conflicts; 422 validation; 429 rate limit.",
    "One error shape everywhere: `{error: {code, message, details}}` via exception handlers (AppError, RequestValidationError, HTTPException).",
    "Always paginate (cap size); offset for simple tables, cursor for large/feeds; `Literal` allow-list for sort fields.",
    "URL versioning `/api/v1`; additive changes are safe, breaking changes need a new version.",
    "Uploads: `UploadFile`, check type + magic bytes + size, generated file names, S3 in production.",
    "Idempotency keys for safe POST retries; rate limiting with 429 + Retry-After, counters in Redis.",
  ],
  mistakes: [
    "Verbs in URLs (`/createProduct`) and inconsistent naming.",
    "Returning 200 with `{\"success\": false}` for errors instead of proper status codes.",
    "Unbounded list endpoints.",
    "Building `ORDER BY` from raw user input (SQL injection).",
    "Trusting uploaded file names and content types.",
  ],
  interview: [
    {
      q: "What's the difference between PUT and PATCH?",
      a: "PUT replaces the whole resource: the client sends the complete representation, and missing fields are reset. PATCH applies a partial update with only the fields sent. PUT is idempotent by definition; PATCH may or may not be. In FastAPI, PATCH is usually implemented with an all-optional schema and `model_dump(exclude_unset=True)`.",
    },
    {
      q: "Offset vs cursor pagination?",
      a: "Offset pagination (`LIMIT/OFFSET` with page numbers) is simple and supports jumping to any page and total counts, but deep pages get slow because the database still scans skipped rows, and results shift when data changes. Cursor (keyset) pagination filters by the last seen sort key (`WHERE id > last_id`), which stays fast on huge tables and is stable during inserts, but doesn't allow random page jumps. I use offset for admin tables and cursor for feeds and large datasets.",
    },
    {
      q: "How do you make a POST endpoint safe to retry?",
      a: "Use an idempotency key: the client sends a unique `Idempotency-Key` header; the server stores the key with the result (and ideally a hash of the request) in a table or Redis with a TTL, protected by a unique constraint. Retries with the same key return the stored result instead of repeating the action. Combine with database constraints to prevent duplicates even under concurrency.",
    },
    {
      q: "401 vs 403?",
      a: "401 Unauthorized means the request isn't authenticated: no token or an invalid one, so the client should log in. 403 Forbidden means the user is authenticated but lacks permission for this action. For resources the user shouldn't even know exist, return 404 to avoid leaking information.",
    },
  ],
  practice: [
    "Design the URL, method, status codes and error cases for: listing a user's orders, cancelling an order, uploading a product image.",
    "Add the consistent error format to your Shop API and check that a 404, a 409 and a 422 all have the same shape.",
  ],
};
