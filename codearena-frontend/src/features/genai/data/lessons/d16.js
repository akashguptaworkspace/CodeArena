// Day 16: Deploy on AWS (+ Azure awareness). Shape: see ./index.js
export default {
  bedrock: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "**Amazon Bedrock** gives you foundation models (Anthropic's Claude, Meta Llama, Mistral, Amazon Nova and others) through AWS APIs, with AWS security, IAM, VPC networking and billing. Many Indian enterprises and GCCs already run on AWS, so \"GenAI on Bedrock\" appears in a lot of job descriptions.",
    sections: [
      {
        h: "Why companies use Bedrock",
        blocks: [
          {
            list: [
              "**Data stays in AWS** under the company's existing agreements; data isn't used to train the models.",
              "**IAM** controls who can call which model; no separate API keys to leak.",
              "**Private networking** via VPC endpoints (PrivateLink); regional deployment options.",
              "**One bill** and existing AWS procurement.",
              "**Managed extras:** Knowledge Bases (managed RAG), Guardrails, Agents, model evaluation, batch inference.",
            ],
          },
          {
            note: "Before first use, open the Bedrock console and check that the models you want are available in your region and enabled for your account (model access). Model IDs and availability differ by region.",
          },
        ],
      },
      {
        h: "The Converse API with boto3",
        blocks: [
          "`converse` is Bedrock's unified chat API: the same request shape for every model family, so switching models is a one-string change.",
          {
            lang: "python",
            code: `# uv add boto3   (credentials from your AWS profile / IAM role)
import boto3

brt = boto3.client("bedrock-runtime", region_name="ap-south-1")   # Mumbai; check model availability
MODEL_ID = "..."        # copy the exact model or inference-profile ID from the Bedrock console

resp = brt.converse(
    modelId=MODEL_ID,
    system=[{"text": "You are a concise assistant for Indian tax FAQs."}],
    messages=[{"role": "user", "content": [{"text": "What is Section 80C?"}]}],
    inferenceConfig={"maxTokens": 500},
)
print(resp["output"]["message"]["content"][0]["text"])
print(resp["usage"])            # inputTokens, outputTokens

# streaming
stream = brt.converse_stream(modelId=MODEL_ID, messages=[...], inferenceConfig={"maxTokens": 500})
for event in stream["stream"]:
    if "contentBlockDelta" in event:
        print(event["contentBlockDelta"]["delta"]["text"], end="", flush=True)`,
          },
          "Converse also supports tool use (`toolConfig`) with the same shapes across models. For Claude specifically, the Anthropic Python SDK has a Bedrock client, so the code from Day 4 works with AWS credentials instead of an Anthropic API key.",
        ],
      },
      {
        h: "Knowledge Bases, Guardrails, Agents",
        blocks: [
          {
            table: {
              head: ["Feature", "What it gives you", "Trade-off vs building it yourself"],
              rows: [
                ["**Knowledge Bases**", "Managed RAG: point at S3; it chunks, embeds and stores in a vector store (OpenSearch Serverless, Aurora pgvector, and others); `retrieve` or `retrieve_and_generate` APIs", "Fast to set up; less control over chunking, retrieval and prompts"],
                ["**Guardrails**", "Configurable content filters, denied topics, PII redaction, prompt-attack detection, grounding checks; apply to any model call", "Easy policy layer; tune to avoid false blocks"],
                ["**Agents**", "Managed agent with action groups (Lambda functions or APIs) and knowledge bases", "Quick for simple agents; less flexible than LangGraph"],
              ],
            },
          },
          {
            lang: "python",
            code: `agent_rt = boto3.client("bedrock-agent-runtime", region_name="ap-south-1")
r = agent_rt.retrieve_and_generate(
    input={"text": "How many casual leaves do interns get?"},
    retrieveAndGenerateConfiguration={
        "type": "KNOWLEDGE_BASE",
        "knowledgeBaseConfiguration": {"knowledgeBaseId": KB_ID, "modelArn": MODEL_ARN},
    },
)
print(r["output"]["text"], r["citations"])`,
          },
          "In interviews, being able to compare \"Bedrock Knowledge Bases vs my own pgvector RAG\" (speed of setup vs control) is valuable. You've built the custom version, so you can explain exactly what the managed one hides.",
        ],
      },
    ],
    revise: [
      "Bedrock = foundation models via AWS: IAM auth, data stays in AWS, VPC endpoints, one bill.",
      "Enable model access; model IDs and availability vary by region.",
      "`bedrock-runtime` `converse` / `converse_stream`: one request shape across models; tools via `toolConfig`.",
      "Knowledge Bases (managed RAG), Guardrails (filters, PII, grounding), Agents (managed agents).",
      "Managed = faster setup, less control; custom = full control.",
    ],
    interview: [
      {
        q: "Bedrock vs calling OpenAI (or Anthropic) directly?",
        a: "Bedrock keeps traffic and data inside the company's AWS account and agreements, uses IAM instead of API keys, supports private networking and regional deployment, consolidates billing, and adds managed Knowledge Bases, Guardrails and Agents across several model families. Direct APIs often get new models and features first and can be simpler for startups. The choice usually follows the company's cloud, compliance and procurement situation, and a provider-agnostic interface keeps it switchable.",
      },
    ],
    practice: [
      "Call one Bedrock model with `converse` from your laptop using your AWS profile; print the usage.",
    ],
  },

  containers: {
    minutes: 60,
    level: "Intermediate",
    intro:
      "You've deployed with Docker before; now do it the standard AWS way: push images to **ECR**, run them on **ECS Fargate** behind an **Application Load Balancer**. This is how many Indian companies run Python APIs, and it's a solid talking point for DevOps questions.",
    sections: [
      {
        h: "The target architecture",
        blocks: [
          {
            lang: "text",
            code: `Users → Route 53 → ALB (HTTPS, ACM certificate)
                    ├─ /api/* → ECS Fargate service: FastAPI containers (2+ tasks, private subnets)
                    │             ├─ RDS Postgres + pgvector
                    │             ├─ S3 (uploads)
                    │             ├─ Bedrock / LLM APIs
                    │             └─ Secrets Manager (keys, DB password)
                    └─ frontend: Vercel, or S3 + CloudFront`,
          },
        ],
      },
      {
        h: "Push to ECR",
        blocks: [
          {
            lang: "bash",
            code: `AWS_REGION=ap-south-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REPO=docchat-api

aws ecr create-repository --repository-name $REPO --region $AWS_REGION
aws ecr get-login-password --region $AWS_REGION | \\
  docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com

docker build --platform linux/amd64 -t $REPO .
docker tag $REPO:latest $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:v1
docker push $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:v1`,
            caption: "On Apple Silicon Macs, `--platform linux/amd64` avoids \"exec format error\" on Fargate x86 tasks (or choose ARM64 Fargate tasks instead).",
          },
        ],
      },
      {
        h: "ECS Fargate essentials",
        blocks: [
          {
            table: {
              head: ["Piece", "What to set"],
              rows: [
                ["Task definition", "Image URI, CPU/memory (e.g. 0.5 vCPU / 1 GB to start), port 8000, log driver `awslogs` (CloudWatch)"],
                ["Task role", "IAM permissions the **app** needs: `bedrock:InvokeModel*`, S3 bucket access, Secrets Manager read"],
                ["Execution role", "Permissions for **ECS** to pull the image and fetch secrets at start"],
                ["Secrets", "Reference Secrets Manager / SSM parameters in the task definition; they arrive as env vars"],
                ["Service", "Desired count ≥ 2 across availability zones; attached to an ALB target group"],
                ["Health check", "`/health` on the target group; tune thresholds for startup time"],
                ["Auto scaling", "Target tracking on CPU or request count per target"],
              ],
            },
          },
          {
            warn: "LLM streaming needs a longer **ALB idle timeout** than the 60-second default (e.g. 300 s), or long answers get cut off. Also make sure nothing in front of the service buffers responses.",
          },
          {
            list: [
              "**Lambda** works for light, short endpoints (webhooks, small classifiers), but cold starts, a 15-minute limit and awkward streaming make ECS a better fit for chat APIs.",
              "**App Runner** is a simpler container service if you want less configuration.",
              "**EKS** (Kubernetes) if the company already runs Kubernetes.",
            ],
          },
          {
            tip: "Define it as code (Terraform, AWS CDK or Copilot) rather than console clicking, so it's reproducible and reviewable. Even a small CDK or Terraform setup in your repo impresses reviewers.",
          },
        ],
      },
    ],
    revise: [
      "ALB (HTTPS) → ECS Fargate (≥2 tasks, private subnets) → RDS pgvector, S3, Bedrock, Secrets Manager.",
      "ECR: create repo, docker login with `get-login-password`, build for the right platform, tag, push.",
      "Task role (app permissions) vs execution role (ECS pull + secrets).",
      "Secrets from Secrets Manager/SSM; CloudWatch logs; health checks; auto scaling.",
      "Raise ALB idle timeout for streaming. Lambda for light endpoints; App Runner/EKS alternatives. Infrastructure as code.",
    ],
    interview: [
      {
        q: "How would you deploy a FastAPI LLM service on AWS?",
        a: "Containerise it, push to ECR, and run it as an ECS Fargate service across two or more availability zones in private subnets behind an Application Load Balancer with HTTPS. The task role grants least-privilege access to Bedrock, S3 and Secrets Manager; secrets are injected from Secrets Manager; logs go to CloudWatch; health checks and target-tracking auto scaling are configured; and the ALB idle timeout is raised for streaming. Data lives in RDS Postgres with pgvector and S3, and everything is defined in Terraform or CDK with CI/CD deploying new image versions.",
      },
    ],
    practice: [
      "Push your DocChat image to ECR and run one Fargate task manually from the console to see it start and log to CloudWatch.",
    ],
  },

  storage: {
    minutes: 40,
    level: "Intermediate",
    intro:
      "A GenAI app on AWS usually needs three kinds of storage: files (S3), a database with vectors (RDS/Aurora Postgres with pgvector, or OpenSearch), and secrets (Secrets Manager or SSM). This lesson covers the patterns and the security basics.",
    sections: [
      {
        h: "S3 for documents",
        blocks: [
          {
            list: [
              "Store uploads in a **private** bucket; never make it public.",
              "Let browsers upload directly with **presigned URLs**, so large files don't pass through your API.",
              "Use **S3 event notifications** (to SQS or Lambda) to trigger indexing when a file lands: a clean, scalable ingestion pipeline.",
              "Enable encryption (on by default) and versioning; set lifecycle rules for old files.",
            ],
          },
          {
            lang: "python",
            code: `s3 = boto3.client("s3")

def presigned_upload(user_id: int, filename: str) -> dict:
    key = f"uploads/{user_id}/{uuid.uuid4()}.pdf"          # never trust the user's filename as a path
    return s3.generate_presigned_post(
        Bucket=BUCKET, Key=key,
        Conditions=[["content-length-range", 1, 20 * 1024 * 1024], {"Content-Type": "application/pdf"}],
        Fields={"Content-Type": "application/pdf"}, ExpiresIn=600,
    )`,
          },
          {
            lang: "text",
            code: `Browser ──presigned POST──▶ S3 ──event──▶ SQS ──▶ indexing worker (ECS task) ──▶ RDS pgvector`,
          },
        ],
      },
      {
        h: "Vector storage options on AWS",
        blocks: [
          {
            table: {
              head: ["Option", "Notes"],
              rows: [
                ["**RDS / Aurora PostgreSQL + pgvector**", "Same as your local setup; app data and vectors together; enable the `vector` extension"],
                ["**OpenSearch (Serverless or managed)**", "Vector + keyword (BM25) search in one engine; common backend for Bedrock Knowledge Bases"],
                ["Amazon S3 Vectors, DocumentDB, MemoryDB", "Newer or niche options; check current features"],
                ["Qdrant/Pinecone", "Self-hosted on ECS/EKS, or their managed clouds (Pinecone is on AWS Marketplace)"],
              ],
            },
          },
        ],
      },
      {
        h: "Secrets and configuration",
        blocks: [
          {
            list: [
              "**Secrets Manager:** database passwords, third-party API keys; supports rotation.",
              "**SSM Parameter Store:** plain configuration and cheaper secrets (SecureString).",
              "Inject into ECS tasks via the task definition, or fetch at startup; never bake them into images or commit them.",
              "Use IAM roles instead of keys wherever possible (Bedrock, S3): no secret to leak at all.",
            ],
          },
        ],
      },
    ],
    revise: [
      "S3: private bucket, presigned uploads with size/type conditions, generated keys, events → SQS → indexing worker.",
      "Vectors on AWS: RDS/Aurora pgvector, OpenSearch (vector + BM25), or managed third parties.",
      "Secrets Manager (rotation) / SSM Parameter Store; inject at runtime; prefer IAM roles over keys.",
    ],
    interview: [
      {
        q: "Design the document ingestion pipeline for a RAG app on AWS.",
        a: "Clients upload directly to a private S3 bucket via presigned URLs with size and type limits. An S3 event puts a message on SQS; an autoscaling worker service on ECS consumes it, downloads the file, parses, chunks and embeds it (Bedrock or another embedding API, batched with retries), and writes chunks with metadata and ACLs to Aurora Postgres with pgvector or OpenSearch, updating a job status table. Failures go to a dead-letter queue with alerts; re-uploads replace old chunks by document id.",
      },
    ],
    practice: [
      "Add presigned S3 uploads to DocChat and trigger indexing from the upload-complete callback.",
    ],
  },

  cicd: {
    minutes: 40,
    level: "Intermediate",
    intro:
      "Every push to `main` should test, build and deploy automatically. With GitHub Actions and AWS OIDC you can do it without storing any AWS keys in GitHub. For GenAI apps, CI can also run your eval set to catch quality regressions.",
    sections: [
      {
        h: "A deploy workflow",
        blocks: [
          {
            lang: "yaml",
            code: `# .github/workflows/deploy.yml
name: deploy
on:
  push:
    branches: [main]
permissions:
  id-token: write      # for OIDC
  contents: read
jobs:
  test-build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v5
      - run: uv sync --frozen
      - run: uv run ruff check . && uv run pytest -q
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-deploy   # trusts this repo via OIDC
          aws-region: ap-south-1
      - uses: aws-actions/amazon-ecr-login@v2
        id: ecr
      - name: Build and push
        run: |
          IMAGE=\${{ steps.ecr.outputs.registry }}/docchat-api:\${{ github.sha }}
          docker build -t $IMAGE .
          docker push $IMAGE
          echo "IMAGE=$IMAGE" >> $GITHUB_ENV
      - name: Deploy to ECS
        run: |
          # render a new task definition with $IMAGE and update the service
          # (the aws-actions/amazon-ecs-render-task-definition and amazon-ecs-deploy-task-definition actions do this)
          echo "deploying $IMAGE"`,
            caption: "Tag images with the commit SHA so every deployment is traceable and easy to roll back.",
          },
          {
            list: [
              "**OIDC:** GitHub proves its identity to AWS, which issues short-lived credentials for a role that trusts only your repository and branch. No long-lived keys in GitHub secrets.",
              "Run database migrations as a separate step (a one-off ECS task) before switching traffic.",
              "ECS rolling deployments with health checks give zero-downtime releases; enable the deployment circuit breaker for automatic rollback.",
            ],
          },
        ],
      },
      {
        h: "Evals in CI",
        blocks: [
          "Prompts and retrieval settings are code, so test them like code:",
          {
            list: [
              "On every pull request: run the fast, cheap checks (retrieval metrics, schema validation, red-team cases) and fail if they drop below thresholds.",
              "Nightly or before release: the full LLM-judge eval (costs money and time).",
              "Post a summary table as a PR comment so reviewers see the quality impact of a prompt change.",
            ],
          },
        ],
      },
    ],
    revise: [
      "GitHub Actions: lint + test → OIDC to AWS → ECR login → build/push (tag = commit SHA) → update ECS service.",
      "OIDC = short-lived credentials, no stored AWS keys.",
      "Migrations as a separate task; rolling deploys with health checks and circuit-breaker rollback.",
      "Evals in CI: cheap checks per PR, full judge evals nightly or pre-release.",
    ],
    interview: [
      {
        q: "How do you test and release prompt changes safely?",
        a: "Treat prompts as versioned code. A pull request runs automated checks: unit tests, schema validation, retrieval metrics and a regression eval set with thresholds, posting results to the PR. Larger LLM-judge evals run nightly or before release. Deployments are gradual (canary or A/B by prompt version) with monitoring of quality signals, cost and latency, and easy rollback because the prompt version is logged with every trace.",
      },
    ],
    practice: [
      "Set up the workflow up to \"Build and push\" for DocChat using OIDC.",
    ],
  },

  azure: {
    minutes: 25,
    level: "Beginner",
    intro:
      "Many Indian IT services companies and enterprises (and their clients) standardise on Microsoft Azure, so **Azure OpenAI** and **Azure AI Search** come up often in interviews at TCS, Infosys, Wipro, Accenture and similar companies. You need to know the equivalents, not master them.",
    sections: [
      {
        h: "The Azure equivalents",
        blocks: [
          {
            table: {
              head: ["Need", "AWS", "Azure"],
              rows: [
                ["Managed foundation models", "Bedrock", "Azure OpenAI / Azure AI Foundry (OpenAI models plus others)"],
                ["Managed RAG / search", "Bedrock Knowledge Bases, OpenSearch", "Azure AI Search (vector + keyword + semantic ranker)"],
                ["Safety filters", "Bedrock Guardrails", "Azure AI Content Safety"],
                ["Containers", "ECS / EKS", "Container Apps / AKS"],
                ["Files", "S3", "Blob Storage"],
                ["Secrets", "Secrets Manager", "Key Vault"],
                ["Identity for apps", "IAM roles", "Managed identities (Entra ID)"],
              ],
            },
          },
        ],
      },
      {
        h: "Calling Azure OpenAI",
        blocks: [
          {
            lang: "python",
            code: `from openai import AzureOpenAI     # same openai package

client = AzureOpenAI(
    azure_endpoint="https://<your-resource>.openai.azure.com",
    api_key=os.environ["AZURE_OPENAI_API_KEY"],     # or Entra ID token auth
    api_version="2024-10-21",                       # use a current GA version
)
r = client.chat.completions.create(
    model="my-gpt4o-mini-deployment",               # your DEPLOYMENT name, not the model name
    messages=[{"role": "user", "content": "Hello"}],
)`,
          },
          "The main difference from OpenAI: you create **deployments** of models in your Azure resource and call them by deployment name, in your chosen region, with Azure's security and compliance.",
        ],
      },
    ],
    revise: [
      "Azure OpenAI / AI Foundry ≈ Bedrock; Azure AI Search ≈ managed vector + keyword search; Content Safety ≈ Guardrails.",
      "Container Apps/AKS, Blob Storage, Key Vault, managed identities.",
      "`AzureOpenAI` client from the `openai` package; call by deployment name; API version required.",
    ],
    interview: [
      {
        q: "A client is on Azure. How would your RAG architecture change?",
        a: "The design stays the same; the services map across: Azure OpenAI or AI Foundry for LLMs and embeddings, Azure AI Search for hybrid vector and keyword retrieval with its semantic ranker, Blob Storage with Event Grid for ingestion triggers, Container Apps or AKS for the API, Key Vault for secrets, managed identities instead of keys, and Content Safety for filtering. My code stays portable because the LLM and vector store sit behind interfaces.",
      },
    ],
    practice: [
      "Write the AWS → Azure mapping of your DocChat architecture as a small table in your README.",
    ],
  },

  "capstone-deploy": {
    minutes: 300,
    level: "Advanced",
    intro:
      "Start the capstone, **AI Support Copilot**, by setting up its production foundation on AWS first: container, database, secrets, CI/CD and a Bedrock model call. Building features on top of a working deployment from day one avoids the classic \"it works locally\" crunch at the end.",
    sections: [
      {
        h: "The capstone in one paragraph",
        blocks: [
          "A support copilot for an e-commerce company. Customers (or support agents) chat with it. It answers from help-centre documents with citations (RAG), looks up orders through tools, and can create refund requests that a human approves. It streams responses, has auth, is evaluated and monitored, and runs on AWS. It combines everything from Days 1–15.",
        ],
      },
      {
        h: "Today: the walking skeleton",
        blocks: [
          {
            list: [
              "New repo `support-copilot` with the FastAPI structure from Day 2 and your LLM adapter from Day 4, with a **Bedrock provider** added.",
              "`/health` and `/chat/stream` (plain LLM streaming for now) deployed to **ECS Fargate** behind an ALB with HTTPS (or App Runner if you want fewer moving parts).",
              "**RDS Postgres** (smallest instance, or Aurora Serverless) with pgvector enabled; migrations running.",
              "**Secrets Manager** for the DB password; task role for Bedrock and S3.",
              "**GitHub Actions** deploying on push to main with OIDC.",
              "**CloudWatch** logs with request IDs; an alarm on 5xx rate.",
              "A **budget alert** in AWS Billing so a mistake can't cost you a lot.",
            ],
            ordered: true,
          },
          {
            warn: "Clean up what you don't use (NAT gateways, idle load balancers and databases cost money even when idle). Write down every resource you create, or use infrastructure as code so `destroy` removes everything.",
          },
        ],
      },
      {
        h: "Architecture diagram for the README",
        blocks: [
          {
            lang: "text",
            code: `GitHub ─Actions (OIDC)─▶ ECR ─▶ ECS Fargate (FastAPI) ◀── ALB (HTTPS) ◀── Next.js (Vercel)
                                   │
          ┌────────────────┬───────┼───────────┬────────────────┐
          ▼                ▼       ▼           ▼                ▼
   RDS Postgres+pgvector  S3   Bedrock   Secrets Manager   CloudWatch / Langfuse`,
          },
        ],
      },
    ],
    revise: [
      "Walking skeleton first: deploy an end-to-end thin slice, then add features.",
      "ECS/App Runner + ALB HTTPS, RDS pgvector, Secrets Manager, task role for Bedrock/S3, OIDC CI/CD, CloudWatch alarms, budget alert.",
      "Track and clean up AWS resources; prefer infrastructure as code.",
    ],
    practice: [
      "Write the capstone's feature list and a 3-day plan in its README before coding tomorrow.",
    ],
  },
};
