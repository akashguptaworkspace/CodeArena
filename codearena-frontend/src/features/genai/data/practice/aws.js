// Practice exercises: AWS deployment. Picked into day files (d04.js, …); shape: see ./index.js
// Shared setup for these exercises (sample data, helper files, notes); each day's practice file adds it after its own folder setup.
export const SETUP_EXTRAS = [
  {
    warn: "Before anything else, create a **budget alert** in AWS Billing (e.g. $5/month) so a mistake can't cost you much. In the Bedrock console, check which models are available in your region and enable access to one text model.",
  },
  {
    tip: "Use an IAM user or SSO profile with limited permissions for practice, never your root account. Put `export AWS_PROFILE=practice` in your shell if you use named profiles.",
  },
];

export default {
  groups: [
    {
      title: "Bedrock",
      exercises: [
        {
          id: "whoami",
          title: "Check credentials and list Bedrock models",
          level: "Easy",
          task: [
            "With boto3, print your AWS account id and ARN (STS `get_caller_identity`), then list the text-generation foundation models available in your region (provider and model id).",
          ],
          solution: `import boto3

session = boto3.Session()
print("region:", session.region_name)
print(session.client("sts").get_caller_identity()["Arn"])

bedrock = session.client("bedrock")                     # control plane (list models, etc.)
models = bedrock.list_foundation_models(byOutputModality="TEXT")["modelSummaries"]
for m in sorted(models, key=lambda m: (m["providerName"], m["modelId"])):
    print(f"{m['providerName']:<12} {m['modelId']}")`,
          explanation: [
            "boto3 finds credentials automatically (from `aws configure`, environment variables, SSO or an IAM role). No keys in your code.",
            "`bedrock` is the control-plane client (manage and list models); `bedrock-runtime` is the one you call for inference.",
            "Some newer models must be called through an **inference profile** id (often prefixed like `us.` or `apac.`) rather than the plain model id. The Bedrock console shows the right id to use.",
          ],
          concepts: [
            ["boto3", "The AWS SDK for Python."],
            ["STS `get_caller_identity`", "Tells you which AWS identity your credentials belong to."],
            ["Region", "The AWS data-centre location your calls go to (e.g. `ap-south-1` is Mumbai)."],
          ],
        },
        {
          id: "converse",
          title: "Call a model with the Converse API",
          level: "Easy",
          task: [
            "Call a Bedrock text model with `converse`, including a system prompt and `maxTokens`. Print the answer, the stop reason and the token usage. Then change only the model id to a different provider's model and run again.",
          ],
          solution: `import boto3

MODEL_ID = "PASTE-A-MODEL-OR-INFERENCE-PROFILE-ID"   # from the previous exercise / Bedrock console
brt = boto3.client("bedrock-runtime")

resp = brt.converse(
    modelId=MODEL_ID,
    system=[{"text": "You are a concise assistant for Indian tax questions."}],
    messages=[{"role": "user", "content": [{"text": "What is Section 80C in two sentences?"}]}],
    inferenceConfig={"maxTokens": 300},
)
print(resp["output"]["message"]["content"][0]["text"])
print("stop:", resp["stopReason"], "| usage:", resp["usage"])`,
          explanation: [
            "`converse` uses one request shape for every model family on Bedrock, so switching providers is a one-string change.",
            "Message content is a list of blocks (`[{\"text\": ...}]`), which also allows images and documents.",
            "Authentication is IAM: the permission needed is `bedrock:InvokeModel`. No separate API key to leak.",
          ],
          concepts: [
            ["Amazon Bedrock", "AWS's managed service for calling foundation models from several providers."],
            ["Converse API", "Bedrock's unified chat API across model families."],
            ["IAM", "AWS Identity and Access Management: who can do what."],
          ],
        },
        {
          id: "converse-stream",
          title: "Stream from Bedrock",
          level: "Easy",
          task: [
            "Use `converse_stream` to print an answer token by token, then print the usage from the final metadata event.",
          ],
          solution: `import boto3

MODEL_ID = "PASTE-A-MODEL-OR-INFERENCE-PROFILE-ID"
brt = boto3.client("bedrock-runtime")

resp = brt.converse_stream(
    modelId=MODEL_ID,
    messages=[{"role": "user", "content": [{"text": "Explain RAG to a new developer in 5 sentences."}]}],
    inferenceConfig={"maxTokens": 400},
)
for event in resp["stream"]:
    if "contentBlockDelta" in event:
        print(event["contentBlockDelta"]["delta"].get("text", ""), end="", flush=True)
    elif "metadata" in event:
        print("\\n\\nusage:", event["metadata"]["usage"])`,
          explanation: [
            "The stream is a sequence of events; text arrives in `contentBlockDelta` events and usage in the final `metadata` event.",
            "Relay these deltas as SSE from FastAPI exactly like Day 4, and your chat UI works on Bedrock unchanged.",
          ],
          concepts: [
            ["Event stream", "A response delivered as a series of typed events."],
          ],
        },
        {
          id: "bedrock-provider",
          title: "A Bedrock provider for your adapter",
          level: "Medium",
          task: [
            "Implement `BedrockProvider` with the same interface as your Day 4 adapter: `complete(system, messages, max_tokens) -> Completion` where messages use `{\"role\", \"content\": str}`. Convert the messages to Converse format inside the class. Test it with a 2-turn conversation.",
          ],
          solution: `from dataclasses import dataclass
import boto3

@dataclass
class Completion:
    text: str
    input_tokens: int
    output_tokens: int
    model: str

class BedrockProvider:
    name = "bedrock"

    def __init__(self, model_id: str, region: str | None = None):
        self.model_id = model_id
        self.client = boto3.client("bedrock-runtime", region_name=region)

    def complete(self, system: str, messages: list[dict], max_tokens: int = 1024) -> Completion:
        converse_messages = [{"role": m["role"], "content": [{"text": m["content"]}]} for m in messages]
        r = self.client.converse(
            modelId=self.model_id, system=[{"text": system}],
            messages=converse_messages, inferenceConfig={"maxTokens": max_tokens},
        )
        text = "".join(block.get("text", "") for block in r["output"]["message"]["content"])
        return Completion(text, r["usage"]["inputTokens"], r["usage"]["outputTokens"], self.model_id)

llm = BedrockProvider("PASTE-A-MODEL-OR-INFERENCE-PROFILE-ID")
history = [{"role": "user", "content": "My name is Ravi and I work on payments."},
           {"role": "assistant", "content": "Nice to meet you, Ravi!"},
           {"role": "user", "content": "What team do I work on?"}]
print(llm.complete("You are a friendly assistant.", history))`,
          explanation: [
            "Your app code keeps using `complete(...)`; only this adapter knows Bedrock's message format. Switching between OpenAI, Claude's API and Bedrock becomes configuration.",
            "Joining all text blocks handles responses that come back as more than one block.",
            "The `Completion` dataclass carries token usage, so cost tracking keeps working whatever the provider.",
          ],
          concepts: [
            ["Adapter pattern", "Wrapping different APIs behind one common interface."],
            ["`@dataclass`", "A class that just holds data, with the boilerplate generated."],
          ],
        },
      ],
    },
    {
      title: "Storage and shipping",
      exercises: [
        {
          id: "s3-presigned",
          title: "Upload to S3 with a presigned POST",
          level: "Medium",
          task: [
            "Create a private bucket. Write `presigned_upload(user_id)` that returns a presigned POST for a PDF under 5 MB with a generated key, then upload a local PDF with httpx using it (as a browser would), and list the object.",
            { lang: "bash", code: `aws s3 mb s3://genai-practice-<your-unique-suffix> --region ap-south-1` },
          ],
          solution: `import uuid
import boto3
import httpx

BUCKET = "genai-practice-<your-unique-suffix>"
s3 = boto3.client("s3")

def presigned_upload(user_id: int) -> dict:
    key = f"uploads/{user_id}/{uuid.uuid4()}.pdf"          # never use the user's filename as the key
    return s3.generate_presigned_post(
        Bucket=BUCKET, Key=key,
        Fields={"Content-Type": "application/pdf"},
        Conditions=[{"Content-Type": "application/pdf"}, ["content-length-range", 1, 5 * 1024 * 1024]],
        ExpiresIn=300,
    )

post = presigned_upload(user_id=42)
with open("sample.pdf", "rb") as f:
    r = httpx.post(post["url"], data=post["fields"], files={"file": ("sample.pdf", f, "application/pdf")})
print("upload status:", r.status_code)             # 204 = success

for obj in s3.list_objects_v2(Bucket=BUCKET, Prefix="uploads/42/").get("Contents", []):
    print(obj["Key"], obj["Size"])`,
          explanation: [
            "A presigned POST lets the **browser** upload directly to S3 with a short-lived permission you signed on the server, so big files never pass through your API.",
            "Conditions enforce the content type and a size limit on S3's side, even if someone edits the request.",
            "Generated keys (`uuid4`) avoid path tricks and name collisions. Store the key in your database with the owner.",
            "Delete the bucket when you're done: `aws s3 rb s3://... --force`.",
          ],
          concepts: [
            ["S3", "AWS object storage for files."],
            ["Presigned URL/POST", "A time-limited, signed permission to upload or download one object."],
            ["`uuid.uuid4()`", "A random unique id."],
          ],
        },
        {
          id: "dockerise",
          title: "Containerise a FastAPI app with a health check",
          level: "Medium",
          task: [
            "Write a tiny FastAPI app (`app/main.py` with `/health` and `/chat` calling your `BedrockProvider`), a production `Dockerfile` (slim base, non-root user, uv install), and a `.dockerignore`. Build it for `linux/amd64`, run it locally with your AWS credentials mounted read-only, and hit `/health`.",
          ],
          solution: `# Dockerfile
FROM python:3.12-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY app ./app
RUN useradd --create-home appuser
USER appuser
ENV PATH="/app/.venv/bin:$PATH"
EXPOSE 8000
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# .dockerignore
# .venv
# .env
# __pycache__
# .git

# build and run
# docker build --platform linux/amd64 -t genai-api .
# docker run --rm -p 8000:8000 -e AWS_REGION=ap-south-1 \\
#   -v ~/.aws:/home/appuser/.aws:ro genai-api
# curl http://127.0.0.1:8000/health`,
          explanation: [
            "Copying `pyproject.toml` and `uv.lock` before the code means dependency layers are cached; editing code doesn't reinstall everything.",
            "Running as a non-root user and excluding `.env` and `.venv` via `.dockerignore` are basic container security.",
            "Mounting `~/.aws` read-only is for **local testing only**. On ECS the container gets credentials from its **task role**, so no keys are ever baked into the image.",
            "`--platform linux/amd64` matters on Apple Silicon Macs if you deploy to x86 Fargate.",
          ],
          concepts: [
            ["Dockerfile", "Instructions to build a container image."],
            ["Layer caching", "Docker reuses unchanged build steps, making rebuilds fast."],
            ["Task role", "The IAM role an ECS task runs with; how the app gets AWS permissions without keys."],
            ["HEALTHCHECK", "A command Docker runs to decide whether the container is healthy."],
          ],
        },
        {
          id: "ci-workflow",
          title: "A GitHub Actions workflow that tests and builds",
          level: "Easy",
          task: [
            "Add `.github/workflows/ci.yml` that runs on every push and pull request: checkout, install uv, `uv sync`, run `pytest`, then build the Docker image. Push to a GitHub repo and watch it run in the Actions tab. Break a test on purpose and see it fail.",
          ],
          solution: `# .github/workflows/ci.yml
name: ci
on:
  push:
  pull_request:
jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --frozen
      - run: uv run pytest -q
      - run: docker build -t genai-api:\${{ github.sha }} .

# tests/test_health.py
# from fastapi.testclient import TestClient
# from app.main import app
# def test_health():
#     assert TestClient(app).get("/health").json() == {"status": "ok"}`,
          explanation: [
            "CI runs your tests on every change, so broken code is caught before deployment.",
            "Tagging images with `github.sha` (the commit id) makes every build traceable and easy to roll back.",
            "The deploy step (push to ECR, update ECS) uses OIDC to get short-lived AWS credentials without storing keys. See the CI/CD lesson for that part.",
          ],
          concepts: [
            ["CI (continuous integration)", "Automatically testing and building every change."],
            ["GitHub Actions", "GitHub's built-in CI/CD system, configured with YAML workflows."],
            ["`github.sha`", "The commit id the workflow is running for."],
          ],
        },
      ],
    },
  ],
};
