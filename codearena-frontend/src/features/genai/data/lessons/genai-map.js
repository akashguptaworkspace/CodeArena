// Day 3, first lesson: the big picture of Generative AI and the Builder / User mental model. Picked into d03.js.

export const genaiMap = {
  minutes: 45,
  level: "Beginner",
  intro:
    "Generative AI moves so fast that new models, papers, tools and buzzwords appear every week, and it's easy to feel lost or left behind. This lesson gives you one mental model that sorts every term you'll ever meet into place, shows where GenAI is already changing real jobs, checks honestly whether it's worth your time, and lays out the whole road ahead: what the next 17 days cover and why in that order.",
  recap:
    "Days 1–2 gave you Python and a real backend. From today you learn the AI itself, starting with the map of the whole field before any detail.",
  sections: [
    {
      h: "What Generative AI is",
      blocks: [
        "**Definition:** Generative AI is AI that **creates new content** (text, images, audio, video or code) by learning the patterns in huge amounts of existing data. Ask it for a cover letter, a logo idea or a Python function, and it produces something that didn't exist before.",
        "To see why that's a big deal, look at what AI could do before it.",
        {
          table: {
            head: ["Era", "Technique", "What it was good at"],
            rows: [
              ["1950s–1980s", "**Symbolic AI** and expert systems", "Hand-written rules: \"if fever and cough, suggest flu\". Brittle outside its rules"],
              ["1980s–2000s", "Fuzzy logic, evolutionary algorithms, separate NLP and computer-vision research", "Narrow problems, each solved its own way"],
              ["2000s–2010s", "**Machine learning (ML)**", "Learn patterns from data, then predict on new data. Still everywhere today"],
              ["2012 onwards", "**Deep learning**: neural networks with many layers", "Images, speech, translation"],
              ["2017 onwards", "The **transformer** architecture → large language models", "Generating fluent text, code, images: **Generative AI**"],
            ],
          },
        },
        "Traditional ML answers three kinds of question, and all three are about **predicting**, not creating:",
        {
          table: {
            head: ["Problem type", "What it outputs", "Example"],
            rows: [
              ["Regression", "A number", "Tomorrow's price of a stock, a flat's rent in Pune"],
              ["Classification", "One category from a fixed list", "Is this email spam? Is this photo a cat or a dog?"],
              ["Ranking / recommendation", "An ordering of items", "\"Products similar to the one you viewed\" on Flipkart"],
            ],
          },
        },
        "Nobody used ML to write an essay, draw a poster or write working code, because those tasks need something that looks like human creativity. A few years ago the common opinion was that AI could never do creative work. Generative AI has largely proved that wrong, and that's why it feels like a different kind of technology.",
        { flow: ["Artificial Intelligence", "Machine Learning", "Deep Learning", "Generative AI"], caption: "Each field sits inside the one before it. Deep learning uses neural networks; the transformer, a deep-learning architecture from 2017, is what made modern Generative AI possible." },
      ],
    },
    {
      h: "Where GenAI is already changing work",
      blocks: [
        "GenAI shows up in almost every industry, but four areas stand out. They're also where most GenAI developer jobs in India are.",
        {
          table: {
            head: ["Area", "Before", "Now"],
            rows: [
              ["**Customer support**", "Large call centres answer every query and complaint", "A GenAI chatbot handles the first level; only unresolved cases reach a person. \"Chatbot first, humans second\": a team of 10 might now need 2–3 (food delivery and e-commerce apps work this way)"],
              ["**Content creation**", "Writers, designers and editors produce everything by hand", "GenAI drafts blogs, product descriptions, images and video; people edit. Often you can't tell whether a person or an AI wrote it"],
              ["**Education**", "One teacher, many students, fixed hours", "A personal tutor available at 2 a.m.: explains a topic five different ways, helps when you're stuck, makes practice questions. Schools are rethinking homework because of it"],
              ["**Software development**", "Every line written by a developer", "Coding assistants write, explain and fix code; work that needed 5 developers may need 2–3. Writing code was considered deeply creative, and AI does it well"],
            ],
          },
        },
        { tip: "In interviews, when asked \"why GenAI?\", name one of these areas and a concrete change you've seen, for example a support bot you used or the coding assistant you use every day. It sounds far more convincing than \"because it's the future\"." },
      ],
    },
    {
      h: "Is GenAI worth your time? A five-question test",
      blocks: [
        "Before investing months in any technology, check whether it's real or hype. Compare two reference points: **the internet**, the most successful technology of recent decades (it replaced letters, bank queues, railway ticket lines and many shop visits with actions on your phone), and **blockchain and crypto**, which had huge hype but, in many people's view, hasn't yet found a widely used everyday purpose.",
        {
          table: {
            head: ["Question", "Internet", "Crypto", "GenAI", "Evidence for GenAI"],
            rows: [
              ["Does it solve real-world problems?", "Yes", "Unclear", "Yes", "Support at scale; a tutor for every student; faster coding"],
              ["Is it useful every day?", "Yes", "Unclear", "Yes", "Millions of people use ChatGPT, Gemini or Claude daily for work and study"],
              ["Does it move the world economy?", "Yes", "Partly", "Yes", "In January 2025, the launch of China's DeepSeek R1 model wiped hundreds of billions of dollars off US tech stocks in a single day"],
              ["Is it creating new jobs?", "Yes", "Partly", "Yes", "A new role, the **AI Engineer**, and rising GenAI developer openings on Naukri, LinkedIn and Instahyre"],
              ["Is it accessible?", "Yes", "Partly", "Yes", "No coding needed to use it: you just talk to it, in English, Hindi or Hinglish"],
            ],
          },
        },
        "GenAI passes all five, which puts it much closer to the internet than to crypto. And because it hasn't reached its full potential yet, the people who build skills in it **now** benefit most. Expect \"AI Engineer\" to become as ordinary a title as \"web developer\" within a few years.",
      ],
    },
    {
      h: "The one mental model: foundation models",
      blocks: [
        "The field feels chaotic because new models, tools, papers and terms appear every day, and social media turns each one into FOMO. You don't need to chase all of it. You need one idea that organises all of it:",
        { note: "Every GenAI concept either **builds** a foundation model or **uses** one." },
        "A **foundation model** is a very large AI model that:",
        {
          list: [
            "is trained on an enormous amount of data, roughly the scale of the public internet;",
            "needs huge hardware to train (thousands of GPUs, costing crores of rupees or more), so only a few companies can build one;",
            "is **general-purpose, not task-specific**. A traditional ML model that predicts stock prices can't predict cricket scores. A foundation model can summarise, translate, classify sentiment, answer questions and write code, all with the same model, because its huge size and training data taught it very general skills. Think of a person who has read an entire library.",
          ],
        },
        {
          table: {
            head: ["Kind", "Works with", "Examples"],
            rows: [
              ["**LLMs** (large language models)", "Text (and code)", "GPT, Claude, Gemini, Llama, Mistral, Qwen, DeepSeek"],
              ["**LMMs** (large multimodal models)", "Text plus images, audio or video", "GPT-4o, Gemini, Claude with images; image and video generators"],
            ],
          },
        },
        "An LLM learns just one thing during training, **predicting the next word** across internet-scale text, and in doing so it picks up text generation, sentiment analysis, summarisation and question answering for free. That's why one model can power a thousand different products.",
        { flow: ["Foundation models", ["**Builder's side**: create, train, optimise and deploy the models", "**User's side**: build products on top of ready-made models"]], caption: "Two ways to work with foundation models. This split is the map for the rest of the course." },
      ],
    },
    {
      h: "Sort every new term: Builder or User?",
      blocks: [
        "Whenever you meet a new term, look up what it does, then ask one question: **is it about making a model, or using one?** Here's how today's common terms sort:",
        {
          table: {
            head: ["Term", "What it is", "Side"],
            rows: [
              ["Prompt engineering", "Writing better inputs to a ready-made model to get better outputs", "User"],
              ["RAG", "Letting a model answer questions from your own private documents", "User"],
              ["Vector databases", "Storage for embeddings, used to build RAG", "User"],
              ["AI agents", "LLM software that also takes actions: books a ticket, updates a record", "User"],
              ["LangChain, LangGraph, MCP", "Frameworks and protocols for building LLM apps and agents", "User"],
              ["LLMOps", "Evaluating, monitoring and deploying LLM applications", "User"],
              ["Pre-training", "Training a foundation model on internet-scale data with huge hardware", "Builder"],
              ["Tokenization strategy", "How text is cut into tokens before training", "Builder"],
              ["RLHF", "Reinforcement learning from human feedback: shaping a model's behaviour and safety", "Builder"],
              ["Quantization", "Compressing a model so it runs on smaller hardware", "Builder"],
              ["Fine-tuning", "Adapting a model to a specific task or domain", "Both"],
              ["Evaluation", "Measuring how good a model or an app is", "Both"],
            ],
          },
        },
        { tip: "This sorting habit kills FOMO. When a new term trends, place it on the map in two minutes, and decide whether it matters for the job you want." },
      ],
    },
    {
      h: "The Builder's side: how foundation models are made",
      blocks: [
        "The Builder's side is the more technical track, closest to traditional ML and deep learning research. It assumes you know ML fundamentals, deep learning, and one framework (PyTorch is preferred today). Its roadmap has seven steps:",
        { flow: ["Transformer architecture", "Types of transformers", "Pre-training", "Optimisation", "Fine-tuning", "Evaluation", "Deployment"] },
        {
          table: {
            head: ["Step", "What you learn"],
            rows: [
              ["1. Transformer architecture", "Encoder and decoder, embeddings, self-attention, layer normalisation, the idea of language modelling"],
              ["2. Types of transformers", "Encoder-only (BERT), decoder-only (GPT) and encoder–decoder (T5) models, and what each is good at"],
              ["3. Pre-training", "Training objectives, tokenization, single-machine vs distributed training on the cloud, the problems at this scale, and judging whether pre-training worked"],
              ["4. Optimisation", "Making huge models practical: training optimisations, compression (quantization, knowledge distillation), faster inference"],
              ["5. Fine-tuning", "Task-specific and instruction tuning, continued pre-training on a domain, RLHF, parameter-efficient fine-tuning (PEFT, LoRA)"],
              ["6. Evaluation", "Testing across many metrics; this is how leaderboards decide one model beats another"],
              ["7. Deployment", "Serving the model so people can use it; a model nobody can call delivers no value"],
            ],
          },
        },
        "Walk these seven steps and you understand how the big labs (OpenAI, Anthropic, Google, Meta, DeepSeek) build their models.",
      ],
    },
    {
      h: "The User's side: building products on foundation models",
      blocks: [
        "The User's side is less mathematical and, for most developers, more fun: you build useful things quickly. Its roadmap has five steps:",
        { flow: ["Basic LLM apps", "Improving responses", "AI agents", "LLMOps", "Multimodal & more"] },
        {
          table: {
            head: ["Step", "What you learn"],
            rows: [
              ["1. Building basic LLM apps", "Closed-source models through APIs (OpenAI, Claude, Gemini); open-source models on your own machine or server (Hugging Face, Ollama); frameworks like LangChain to build apps"],
              ["2. Improving responses", "**Prompt engineering** (better inputs), **RAG** (give the model your private data; a big field of its own) and **fine-tuning** (at a shallower level than the Builder's side)"],
              ["3. AI agents", "A chatbot only talks; an agent also acts. Give an LLM tools and it can do tasks: a chatbot suggests Goa for a holiday, an agent also books the hotel"],
              ["4. LLMOps", "Everything needed to build, evaluate, improve and deploy LLM apps so real customers can use them"],
              ["5. Miscellaneous", "Multimodal models (audio, images, video in and out) and diffusion models such as Stable Diffusion"],
            ],
          },
        },
        {
          table: {
            head: ["Role", "Focus", "Notes"],
            rows: [
              ["Research scientist / data scientist", "Builder's side", "Also needs some ML engineering and MLOps"],
              ["Software developer", "User's side", "Anyone with solid software skills can do most (roughly 80–85%) of this work"],
              ["**AI Engineer**", "Both, in parallel", "Builds apps on LLMs but understands how models are made, so debugs better, designs better, and earns more"],
            ],
          },
        },
      ],
    },
    {
      h: "How this course follows the map",
      blocks: [
        "You're a MERN developer aiming for GenAI developer and AI Engineer roles, so this course walks the **User's side step by step** and adds the Builder's-side knowledge interviewers expect, without the heavy maths.",
        {
          table: {
            head: ["Map step", "Days", "What you'll do"],
            rows: [
              ["Builder's side, the intuition", "Day 3 (today)", "Tokens, embeddings, attention, training and inference with tiny from-scratch code"],
              ["User 1: basic LLM apps", "Days 4–6", "APIs, open models with Hugging Face and Ollama, then LangChain one component at a time: models, prompts, structured output, parsers, chains, runnables"],
              ["User 2: improving responses (RAG)", "Days 7–11", "Loaders, splitters, embeddings, vector stores, retrievers, RAG end to end, advanced RAG, evaluation"],
              ["User 3: AI agents", "Days 12–15", "Tools, tool calling, ReAct agents, LangGraph, MCP"],
              ["User 4: LLMOps", "Days 16 and 18", "Guardrails, tracing, caching, deployment on AWS"],
              ["Builder's side, hands-on", "Day 17", "Transformer types, quantization, LoRA fine-tuning of a small model"],
              ["Interview mode", "Days 19–20", "System design, coding rounds, mock interviews"],
            ],
          },
        },
        "LangChain comes first on the User's side for a reason: it gives you a taste of nearly every later topic (models, prompts, RAG, agents, even a glimpse of LLMOps), so you get the whole picture early and then go deep on each part.",
        { note: "Learn concepts, not just code. Frameworks change versions often (LangChain changed a lot between 0.1, 0.2, 0.3 and 1.0), but ideas like \"a chain passes one step's output to the next\" stay the same. Every lesson explains **why** something exists before showing **how** to use it." },
      ],
    },
  ],
  revise: [
    "GenAI **creates** new content; traditional ML **predicts** (regression, classification, ranking).",
    "AI ⊃ ML ⊃ deep learning ⊃ GenAI; the 2017 transformer made modern GenAI possible.",
    "Biggest impact today: customer support, content creation, education, software development.",
    "Five-question test: real problems, daily use, economic impact, new jobs, accessibility. GenAI passes all five.",
    "A **foundation model** is huge, expensive to train and general-purpose. LLMs handle text; LMMs add images, audio, video.",
    "Every term is **Builder's side** (make models), **User's side** (use them) or both.",
    "Builder's roadmap: transformer → types → pre-training → optimisation → fine-tuning → evaluation → deployment.",
    "User's roadmap: basic LLM apps → improving responses (prompting, RAG, fine-tuning) → agents → LLMOps → multimodal.",
    "AI Engineers learn both sides in parallel; this course goes deep on the User's side and covers the Builder's side for interviews.",
  ],
  check: [
    "How is a foundation model different from a traditional, task-specific ML model?",
    "Name the five questions used to judge whether a technology is worth learning.",
    "Which side do these belong to: RAG, quantization, AI agents, RLHF, fine-tuning, MCP?",
    "List the seven steps of the Builder's roadmap in order.",
    "What's the difference between a chatbot and an AI agent?",
    "Why does this course start the User's side with LangChain?",
  ],
  mistakes: [
    "Chasing every new model or tool announcement. Place it on the Builder/User map first, then decide if it matters for your goal.",
    "Thinking you must train models to work in GenAI. Most GenAI developer jobs are on the User's side.",
    "Ignoring the Builder's side completely. Interviewers ask how LLMs work, and knowing it makes you better at debugging apps.",
  ],
  interview: [
    {
      q: "What is Generative AI, and how is it different from traditional machine learning?",
      a: "Generative AI creates new content (text, images, code) by learning patterns from huge datasets. Traditional ML predicts: a number (regression), a category (classification) or an ordering (ranking). GenAI is built on deep learning, specifically transformers, and on foundation models that are general-purpose instead of trained for one task.",
    },
    {
      q: "What is a foundation model?",
      a: "A very large model trained on internet-scale data with massive compute, general enough to handle many tasks without being trained for each: summarising, translating, answering questions, writing code. LLMs like GPT, Claude, Gemini and Llama are foundation models for text; multimodal models add images, audio or video.",
    },
    {
      q: "How would you explain the difference between building and using foundation models?",
      a: "Building means creating the model: architecture, pre-training on huge data, optimisation, fine-tuning, evaluation and serving, done by research labs. Using means building products on a ready-made model through an API or open weights: prompting, RAG, agents, LLMOps. Most GenAI developer roles are on the using side, but understanding the building side helps you choose models, debug failures and explain trade-offs.",
    },
  ],
  practice: [
    "Pick 10 GenAI terms from a job description you like (for example RAG, LoRA, LangGraph, vLLM, guardrails) and sort each into Builder, User or Both, with one line on what it does.",
    "Write a 3-sentence answer to \"Why do you want to move into GenAI?\" using one impact area from this lesson and one fact from the five-question test.",
  ],
};
