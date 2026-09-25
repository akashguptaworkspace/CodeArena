// Day 18 practice: AWS and the capstone. Exercises live in ./aws.js and ./capstone.js.
import aws, { SETUP_EXTRAS as AWS_SETUP } from "./aws.js";
import capstone, { SETUP_EXTRAS as CAPSTONE_SETUP } from "./capstone.js";

export default {
  intro:
    "AWS exercises first: check your credentials, call Bedrock (plain and streaming), wrap Bedrock in your provider interface, upload files to S3 with presigned URLs, containerise a FastAPI app and write a CI workflow. Then capstone skills: assess a product photo with a vision model, shrink images before sending them, transcribe speech locally, write behaviour tests for LLM features, record and replay LLM calls, and load-test an API with Locust.",
  setup: [
    {
      lang: "bash",
      code: `mkdir -p ~/genai-practice/day18 && cd ~/genai-practice/day18
uv init --no-readme .
uv add boto3 httpx "fastapi[standard]" pytest openai python-dotenv pydantic pillow faster-whisper locust
cp ../day03/llm.py ../day03/.env .
# AWS CLI: https://aws.amazon.com/cli/ then
aws configure            # access key, secret, default region (e.g. ap-south-1)`,
    },
    ...AWS_SETUP,
    ...CAPSTONE_SETUP,
  ],
  groups: [...aws.groups, ...capstone.groups],
};
