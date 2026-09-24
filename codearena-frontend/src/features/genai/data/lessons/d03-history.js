// Day 3: the history of AI → LLMs, and machine learning basics. Merged into d03.js. Shape: see ./index.js

export const history = {
  minutes: 90,
  level: "Beginner",
  intro:
    "ChatGPT didn't appear from nowhere. It's the result of 70 years of ideas, dead ends and breakthroughs: rules, then statistics, then neural networks, then the transformer, then scale, then human feedback. Knowing this story gives you the vocabulary interviewers use (n-grams, word2vec, RNNs, attention, BERT, GPT-3, RLHF), explains *why* today's models behave the way they do, and helps you tell a confident narrative when someone asks \"How did we get here?\".",
  sections: [
    {
      h: "The one-paragraph version",
      blocks: [
        "People first tried to make computers understand language by **writing rules** by hand. That didn't scale, so they switched to **statistics**: count which words follow which in large amounts of text. Then **neural networks** learned their own features from data, and words became **vectors** (embeddings). **Recurrent networks** read sentences word by word but forgot long-range context and couldn't be parallelised. In 2017 the **transformer** replaced recurrence with **attention**, which let models train on huge datasets in parallel. Labs discovered that **scaling** transformers (more data, more parameters, more compute) kept making them better, producing GPT-3. **Instruction tuning and RLHF** turned those text predictors into helpful assistants: ChatGPT. Since then, the frontier has moved to **multimodal** models, **open-weight** models, **reasoning** models trained with reinforcement learning, and **agents** that use tools.",
        {
          lang: "text",
          code: `Rules (1950s–80s) → Statistics (1990s–2000s) → Neural nets + embeddings (2010s)
→ RNN/LSTM + attention (2014–16) → Transformer (2017) → BERT/GPT pretraining (2018)
→ Scaling: GPT-3 (2020) → RLHF: InstructGPT, ChatGPT (2022) → GPT-4, Claude, Llama, Gemini (2023)
→ Long context, multimodal, open weights, MoE (2024) → Reasoning models + agents + MCP (2024–26)`,
          caption: "Keep this chain in your head. Every interview question about \"history\" is a zoom into one arrow.",
        },
      ],
    },
    {
      h: "Era 1: the birth of AI and the age of rules (1950–1990)",
      blocks: [
        {
          table: {
            head: ["Year", "Event", "Why it matters"],
            rows: [
              ["1950", "Alan Turing publishes *Computing Machinery and Intelligence* and proposes the **imitation game** (the Turing test)", "Frames the question \"can machines think?\" as a test of conversation"],
              ["1956", "The **Dartmouth workshop**; John McCarthy's proposal coins the term *artificial intelligence*", "AI becomes a research field"],
              ["1958", "Frank Rosenblatt's **perceptron**, a single artificial neuron that learns weights from examples", "The ancestor of every neural network, including LLMs"],
              ["1966", "**ELIZA** (Joseph Weizenbaum, MIT): a chatbot that imitates a therapist with pattern-matching rules", "People attributed understanding to a few hundred rules: the *ELIZA effect*, still relevant with LLMs"],
              ["1969", "Minsky and Papert's book *Perceptrons* shows the limits of single-layer networks", "Funding for neural networks dries up for years"],
              ["1970s–80s", "**Expert systems**: thousands of hand-written if-then rules (medical diagnosis, configuring computers)", "Worked in narrow domains, but were brittle and expensive to maintain"],
              ["1974–80, 1987–93", "The **AI winters**: hype outran results, funding collapsed", "A lesson the GenAI industry keeps in mind"],
              ["1986", "Rumelhart, Hinton and Williams popularise **backpropagation** for training multi-layer networks", "The algorithm that still trains every LLM today"],
            ],
          },
        },
        "Rule-based language systems had a fatal flaw: language is too varied for rules. For every rule (\"a sentence has a subject and a verb\") there are thousands of exceptions, idioms, typos and new words. Hand-written grammars broke on real text.",
        {
          note: "The ELIZA effect is worth mentioning in interviews: humans readily believe a fluent system *understands* them. LLMs are vastly more capable than ELIZA, but the same bias makes users over-trust confident, wrong answers. That's why grounding, citations and evals matter.",
        },
      ],
    },
    {
      h: "Era 2: statistics beats rules (1990–2012)",
      blocks: [
        "Instead of writing rules, researchers let the data speak: **count** patterns in large text collections and use probabilities. IBM's speech and translation groups led this shift; a famous (possibly apocryphal) quip from speech researcher Fred Jelinek: *\"Every time I fire a linguist, the performance of the speech recogniser goes up.\"*",
        {
          list: [
            "**n-gram language models** estimate the probability of the next word from the previous *n−1* words, by counting. A trigram model predicts \"India\" after \"the capital of\" if that sequence was frequent in its training text. This is the same *task* as an LLM (predict the next token), just with counting instead of a neural network.",
            "**Statistical machine translation** learned word and phrase alignments from parallel texts (for example, parliamentary proceedings in two languages). Google Translate launched in 2006 on this approach.",
            "**Classic machine learning for text**: spam filters with Naive Bayes, sentiment classifiers with logistic regression or SVMs on **bag-of-words** and **TF-IDF** features.",
            "**Search engines** ranked pages with TF-IDF, BM25 and link analysis. BM25 is still used today in hybrid RAG search (Day 8).",
          ],
        },
        {
          lang: "text",
          code: `Trigram model, trained by counting:
  count("capital of India") = 9,120     count("capital of")   = 21,400
  P("India" | "capital of") = 9,120 / 21,400 ≈ 0.43

Problems:
  • "capital of Bharat" never seen → probability 0 (sparsity)
  • only sees 2 words back → no long-range meaning
  • "car" and "automobile" are unrelated symbols → no notion of similarity`,
          caption: "These three problems are exactly what embeddings, attention and scale later solved.",
        },
      ],
    },
    {
      h: "Era 3: deep learning and word vectors (2012–2016)",
      blocks: [
        {
          table: {
            head: ["Year", "Event", "Why it matters"],
            rows: [
              ["2003", "Yoshua Bengio's **neural probabilistic language model**: predict the next word with a neural network and learned word vectors", "The first neural language model; the idea behind embeddings"],
              ["1997 / 2000s", "**LSTM** (Hochreiter & Schmidhuber, 1997) improves recurrent networks' memory", "Becomes the workhorse for language and speech in the 2010s"],
              ["2012", "**AlexNet** (Krizhevsky, Sutskever, Hinton) wins the ImageNet competition by a huge margin, trained on **GPUs**", "Starts the deep-learning boom; GPUs become AI hardware"],
              ["2013", "**word2vec** (Mikolov et al., Google): fast training of word embeddings", "Words become vectors with meaningful geometry: king − man + woman ≈ queen"],
              ["2014", "**GloVe** (Stanford) embeddings; **seq2seq** (Sutskever, Vinyals, Le): an encoder RNN reads a sentence, a decoder RNN writes the translation", "Neural machine translation becomes practical"],
              ["2014", "**Attention** for translation (Bahdanau, Cho, Bengio): the decoder looks back at all encoder states instead of one summary vector", "The key idea the transformer later builds on"],
              ["2014", "**GANs** (Goodfellow): two networks compete to generate realistic images", "Early *generative* AI for images"],
              ["2015–16", "OpenAI founded (Dec 2015); DeepMind's **AlphaGo** beats Lee Sedol (2016); Google switches Translate to neural MT (2016)", "Deep learning moves from labs to headlines and products"],
            ],
          },
        },
        "The big conceptual shift of this era: **learn representations from data** instead of hand-designing features. A word is no longer an ID in a dictionary; it's a vector of a few hundred numbers learned so that words used in similar contexts end up close together. That's the *distributional hypothesis*, summed up by linguist J.R. Firth: *\"You shall know a word by the company it keeps.\"*",
        "**Recurrent neural networks (RNNs)** read text one word at a time, updating a hidden state (a memory vector). They were the state of the art for language until 2017, but they had two problems:",
        {
          list: [
            "**Forgetting:** information from early words fades as the hidden state is overwritten. LSTMs and GRUs help, but long documents still suffer.",
            "**No parallelism:** word 100 can't be processed until word 99 is done. Training on internet-scale data was too slow.",
          ],
        },
        {
          lang: "text",
          code: `RNN:   the → [h1] → cat → [h2] → sat → [h3] → on → [h4] → ... → [h100]
        each step waits for the previous one; h100 holds a blurry summary of everything

Attention (2014) added: when writing each output word, look back at ALL of h1…h100
        and take a weighted mix of the relevant ones.`,
        },
      ],
    },
    {
      h: "Era 4: the transformer (2017)",
      blocks: [
        "In June 2017, eight Google researchers (Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin) published **\"Attention Is All You Need\"**. Their idea: drop recurrence entirely and build the whole model from **self-attention** layers, where every word looks at every other word directly, all at once.",
        {
          list: [
            "**Parallel training:** all positions are processed simultaneously, so GPUs are used fully. Training on billions of words became feasible.",
            "**Long-range connections:** word 1 and word 500 are one attention step apart, not 499 recurrent steps.",
            "**Simple, repeatable blocks:** stack the same block many times. This made it easy to scale up.",
          ],
        },
        "The original transformer was an **encoder–decoder** for translation (English→German, English→French). Within a year, researchers split it in two: the **encoder** half became BERT, the **decoder** half became GPT. Almost every modern LLM (GPT, Claude, Gemini, Llama, Qwen, DeepSeek, Mistral) is a transformer, mostly decoder-only.",
        {
          tip: "Interview line: \"The transformer's key contribution was replacing recurrence with self-attention, which made training parallelisable and captured long-range dependencies. That's what made scaling to today's model sizes possible.\"",
        },
      ],
    },
    {
      h: "Era 5: pretraining and the BERT vs GPT split (2018–2019)",
      blocks: [
        "The next idea: **pretrain** one big model on a huge amount of unlabelled text, then **fine-tune** it cheaply for each task. Before this, every task (sentiment, NER, Q&A) needed its own model trained from scratch on labelled data. This is **transfer learning** for language.",
        {
          table: {
            head: ["Year", "Model", "Lab", "Size", "Idea"],
            rows: [
              ["Feb 2018", "**ELMo**", "Allen AI", "~94M", "Contextual word vectors from a bidirectional LSTM: \"bank\" gets different vectors in \"river bank\" and \"bank loan\""],
              ["Jun 2018", "**GPT-1**", "OpenAI", "117M", "Decoder-only transformer, generative pretraining (next-word prediction) then fine-tuning"],
              ["Oct 2018", "**BERT**", "Google", "110M / 340M", "Encoder-only; pretrained by filling in masked words using context from both sides. Dominated NLP benchmarks; powered Google Search improvements (2019)"],
              ["Feb 2019", "**GPT-2**", "OpenAI", "1.5B", "Just a bigger GPT trained on more web text; wrote surprisingly coherent paragraphs. Released in stages over misuse concerns"],
              ["Oct 2019", "**T5**", "Google", "up to 11B", "Encoder–decoder; every task framed as text-to-text (\"translate English to German: ...\")"],
            ],
          },
        },
        {
          table: {
            head: ["", "BERT (encoder)", "GPT (decoder)"],
            rows: [
              ["Training task", "Fill in masked words (sees both sides)", "Predict the next word (sees only the left)"],
              ["Good at", "Understanding: classification, search, extraction", "Generating text"],
              ["Descendants today", "Embedding models, rerankers, classifiers", "ChatGPT, Claude, Gemini, Llama"],
            ],
          },
        },
        "For a few years BERT-style models looked like the future for business NLP. GPT-2 showed that a decoder trained only to predict the next word could also do tasks without fine-tuning, if you phrased them as text to continue. That bet on **generation + scale** won.",
      ],
    },
    {
      h: "Era 6: scale is all you need? GPT-3 and scaling laws (2020–2021)",
      blocks: [
        "In January 2020, OpenAI (Kaplan et al.) published **scaling laws**: a language model's loss falls predictably, as a smooth power law, as you increase parameters, data and compute. This turned model building into something closer to engineering: spend 10× compute, get a predictable improvement.",
        "In May 2020 came **GPT-3**: 175 billion parameters, trained on roughly 300 billion tokens. Its paper, *\"Language Models are Few-Shot Learners\"*, showed **in-context learning**: put a few examples in the prompt and the model performs a new task without any fine-tuning. Prompting was born as a way to program a model.",
        {
          lang: "text",
          code: `Few-shot prompt (GPT-3 style, no fine-tuning):
  Translate English to Hindi.
  sea otter => समुद्री ऊदबिलाव
  cheese => पनीर
  thank you =>              ← the model continues: धन्यवाद`,
        },
        {
          list: [
            "**2020:** the **RAG** paper (Lewis et al., Facebook AI) combines a retriever with a generator, grounding answers in documents. That's the pattern you'll build on Days 5–9.",
            "**2021:** OpenAI's **Codex** powers **GitHub Copilot**: LLMs become daily developer tools. **CLIP** and **DALL·E** connect text and images. **LoRA** (Microsoft) makes fine-tuning cheap by training small adapter matrices. Anthropic is founded by former OpenAI researchers.",
            "**2022 (March):** DeepMind's **Chinchilla** paper corrects the scaling recipe: for a fixed compute budget, models had been too big and under-trained. The compute-optimal ratio is roughly **20 training tokens per parameter** (Chinchilla: 70B parameters, 1.4T tokens, beating the larger Gopher). Later models trained far past that ratio (Llama 3 used 15T+ tokens) because smaller, over-trained models are cheaper to *serve*.",
          ],
        },
        {
          note: "GPT-3 was powerful but awkward: it *continued* text rather than *answering*. Ask it a question and it might write more questions. Turning it into an assistant needed another idea.",
        },
      ],
    },
    {
      h: "Era 7: alignment and the ChatGPT moment (2022)",
      blocks: [
        "In March 2022 OpenAI published **InstructGPT**: fine-tune GPT-3 on human-written demonstrations (**SFT**), then on human preference rankings using **RLHF** (reinforcement learning from human feedback). Raters preferred answers from the 1.3B InstructGPT model over the 175B GPT-3, a sign that *alignment* mattered as much as size.",
        {
          list: [
            "**Chain-of-thought prompting** (Wei et al., Google, 2022): asking models to reason step by step improves maths and logic.",
            "**ReAct** (Yao et al., 2022): interleave reasoning with tool actions, the blueprint for agents (Day 10).",
            "**Stable Diffusion** (Aug 2022) releases a high-quality open image generator; **Whisper** (Sept 2022) brings robust open speech recognition.",
            "**Constitutional AI** (Anthropic, Dec 2022): align models using written principles and AI feedback, reducing reliance on human labels.",
          ],
        },
        "On **30 November 2022**, OpenAI released **ChatGPT**, a chat interface on a GPT-3.5 model tuned with RLHF, as a free \"research preview\". It reportedly reached around 100 million users within about two months, one of the fastest adoptions of any consumer product. The technology wasn't brand new; the **chat interface + instruction following + free access** made it usable by everyone. Every company started asking \"what's our GenAI strategy?\", which is why GenAI developer jobs exist.",
      ],
    },
    {
      h: "Era 8: the model race, open weights and long context (2023–2024)",
      blocks: [
        {
          table: {
            head: ["When", "Event"],
            rows: [
              ["Feb 2023", "Meta releases **LLaMA** (7B–65B) to researchers; the weights leak and spark a wave of open fine-tunes (Alpaca, Vicuna)"],
              ["Mar 2023", "**GPT-4** (multimodal input, much stronger reasoning); Anthropic launches **Claude**; Google launches **Bard**"],
              ["May 2023", "Claude offers a 100K-token context window; the **DPO** paper simplifies preference tuning"],
              ["Jun 2023", "OpenAI adds **function calling** to its API; tool use becomes a standard feature"],
              ["Jul 2023", "**Llama 2** with a licence allowing commercial use: open models become a real business option"],
              ["Sep–Dec 2023", "**Mistral 7B**, then **Mixtral 8x7B**, a popular open **mixture-of-experts (MoE)** model; Google's **Gemini**"],
              ["Feb 2024", "**Gemini 1.5** with a 1M-token context window"],
              ["Mar 2024", "**Claude 3** family (Haiku, Sonnet, Opus tiers); India approves the **IndiaAI Mission** to fund compute and domestic models"],
              ["Apr–Jul 2024", "**Llama 3** and **Llama 3.1 405B** (open frontier-class); **GPT-4o** (fast, natively multimodal: text, audio, image); **Claude 3.5 Sonnet** sets a new bar for coding"],
              ["Sep 2024", "OpenAI **o1**: the first widely used **reasoning model**, trained with reinforcement learning to think before answering"],
              ["Nov 2024", "Anthropic releases the **Model Context Protocol (MCP)**, an open standard for connecting models to tools and data (Day 13)"],
              ["Dec 2024", "**DeepSeek-V3**, an open MoE model trained at reportedly low cost; **Qwen** (Alibaba) models are among the strongest open options"],
            ],
          },
        },
        "Themes of this era: **tiers** of models (small/fast/cheap vs large/smart), **context windows** growing from 4K to 1M+ tokens, **multimodality** (images, audio, PDFs), open-weight models closing the gap with closed ones, and **tool calling** becoming standard, which enabled RAG products and early agents.",
      ],
    },
    {
      h: "Era 9: reasoning models, agents and MCP (2025–today)",
      blocks: [
        {
          list: [
            "**Jan 2025: DeepSeek-R1**, an open-weight reasoning model showing that reinforcement learning on verifiable problems (maths, code) produces long chains of thought. Its low reported cost shook markets and pushed labs to make reasoning cheaper.",
            "**2025:** every major lab ships reasoning or *extended thinking* modes (Claude with extended thinking, Gemini 2.5 thinking models, OpenAI's o-series and GPT-5). APIs add controls such as reasoning *effort* instead of temperature.",
            "**Agents go mainstream:** coding agents (Claude Code, Cursor, Copilot agents, Codex) that edit repositories and run tests; computer-use and browser agents; deep-research agents that search and write reports.",
            "**MCP becomes the common way to plug tools into models**, adopted across major AI providers and developer tools.",
            "**Open weights keep improving:** Llama 4, Qwen 3, DeepSeek updates, Mistral, Google's Gemma and OpenAI's gpt-oss open-weight models (Aug 2025).",
            "**India:** under the IndiaAI Mission, startups such as **Sarvam AI** were selected to build sovereign foundation models, alongside Indian-language work like AI4Bharat's datasets and models. Indic-language support is a real differentiator for Indian products.",
          ],
        },
        "As of 2026, the frontier is set by model families from Anthropic (Claude), OpenAI (GPT), Google (Gemini), plus strong open-weight families (Qwen, DeepSeek, Llama, Mistral, Gemma). Version numbers change every few months, so interviewers care less about the latest name and more about whether you understand **tiers, reasoning vs non-reasoning, open vs closed, context, cost and evaluation**.",
        {
          warn: "Specific model names and dates in this lesson will age. The *trends* won't: scale → alignment → tools → reasoning → agents. When you cite a current model in an interview, check the provider's docs that week.",
        },
      ],
    },
    {
      h: "Five lessons from history that explain today's LLMs",
      blocks: [
        {
          table: {
            head: ["Historical lesson", "What you see in LLMs today"],
            rows: [
              ["Statistics beat rules", "LLMs learn patterns from data; they aren't programmed with facts or logic, so they can be fluent and wrong"],
              ["The task never changed: predict the next word", "From n-grams to GPT-5, the core objective is next-token prediction. Everything else (chat, tools, reasoning) is built on top"],
              ["Representations are learned vectors", "Embeddings power semantic search and RAG; the same idea lives inside every LLM layer"],
              ["Scale brought new abilities", "Bigger models trained on more data do things smaller ones can't (in-context learning, coding, reasoning), but cost more to run"],
              ["Alignment made it usable", "SFT + RLHF turned text predictors into assistants, and also introduced sycophancy and over-refusal"],
            ],
          },
        },
      ],
    },
    {
      h: "Master timeline (for revision)",
      blocks: [
        {
          table: {
            head: ["Year", "Milestone"],
            rows: [
              ["1950", "Turing test"],
              ["1956", "Dartmouth workshop: \"artificial intelligence\""],
              ["1958", "Perceptron"],
              ["1966", "ELIZA"],
              ["1986", "Backpropagation popularised"],
              ["1997", "LSTM; Deep Blue beats Kasparov"],
              ["2003", "Neural probabilistic language model (Bengio)"],
              ["2012", "AlexNet: deep learning + GPUs"],
              ["2013", "word2vec"],
              ["2014", "seq2seq; Bahdanau attention; GANs"],
              ["2017", "Transformer: \"Attention Is All You Need\""],
              ["2018", "GPT-1, BERT"],
              ["2019", "GPT-2, T5"],
              ["2020", "Scaling laws, GPT-3 (in-context learning), RAG paper"],
              ["2021", "Codex / Copilot, CLIP, LoRA"],
              ["2022", "InstructGPT (RLHF), chain-of-thought, Chinchilla, Stable Diffusion, ChatGPT (30 Nov)"],
              ["2023", "LLaMA, GPT-4, Claude, Llama 2, function calling, DPO, Mixtral (MoE), Gemini"],
              ["2024", "1M-token context, Claude 3 / 3.5, Llama 3, GPT-4o, o1 reasoning, MCP, DeepSeek-V3"],
              ["2025", "DeepSeek-R1, reasoning everywhere, coding and computer-use agents, MCP adoption, open-weight gpt-oss"],
            ],
          },
        },
      ],
    },
  ],
  revise: [
    "Rules (ELIZA, expert systems) were brittle → statistics (n-grams, TF-IDF, statistical MT) → neural networks learning representations.",
    "word2vec (2013) made words vectors; RNN/LSTM read sequentially, forgot long context and couldn't parallelise.",
    "Attention (2014) let the decoder look back at all inputs; the Transformer (2017) used only attention → parallel training, long-range links.",
    "2018 split: BERT (encoder, understanding) vs GPT (decoder, generation). Pretrain once, adapt to many tasks.",
    "Scaling laws (2020) + GPT-3 (175B): bigger = predictably better; in-context (few-shot) learning. Chinchilla (2022): ~20 tokens per parameter is compute-optimal.",
    "InstructGPT (SFT + RLHF) → ChatGPT (Nov 2022): alignment and a chat UI made LLMs usable by everyone.",
    "2023–24: GPT-4, Claude, Gemini, open Llama/Mistral/Qwen/DeepSeek, function calling, long context, MoE, multimodal.",
    "2024–26: reasoning models (o1, DeepSeek-R1, extended thinking), agents, MCP. The core objective is still next-token prediction.",
  ],
  mistakes: [
    "Saying \"ChatGPT invented LLMs\". GPT-3 existed two years earlier; ChatGPT's leap was instruction tuning + RLHF + a free chat interface.",
    "Confusing BERT and GPT: BERT is an encoder (understanding, embeddings), GPT is a decoder (generation).",
    "Memorising model version numbers instead of the trends and trade-offs behind them.",
  ],
  interview: [
    {
      q: "How did we get from early NLP to ChatGPT?",
      a: "Rule-based systems were brittle, so NLP moved to statistical models like n-grams. Neural networks then learned word embeddings (word2vec) and sequence models (RNNs, LSTMs), and attention let models focus on relevant input. The 2017 transformer replaced recurrence with self-attention, enabling parallel training at scale. Pretrained models like BERT and GPT followed, scaling laws and GPT-3 showed bigger models learn tasks from prompts, and InstructGPT's SFT + RLHF made them follow instructions, which ChatGPT packaged into a chat product in 2022.",
    },
    {
      q: "Why was the transformer such a big deal?",
      a: "RNNs processed tokens one after another, which was slow to train and lost long-range information. The transformer uses self-attention so every token can look at every other token directly, and all positions are computed in parallel on GPUs. That made it practical to train on internet-scale data and to scale models up, which is the foundation of every modern LLM.",
    },
    {
      q: "What was special about GPT-3?",
      a: "Scale (175B parameters) and the discovery of in-context learning: it could perform new tasks from a few examples in the prompt without fine-tuning. Together with scaling laws, it showed that simply growing model size, data and compute produced broad new capabilities.",
    },
  ],
  practice: [
    "Draw the master timeline from memory on paper, then check it. Repeat tomorrow.",
    "Record a 2-minute answer to \"How did we get from rule-based NLP to ChatGPT?\" and listen back.",
  ],
};

export const mlBasics = {
  minutes: 75,
  level: "Beginner",
  intro:
    "You don't need to become an ML engineer, but you do need the words: model, parameters, training, loss, gradient descent, overfitting, inference, GPU. Interviewers use them freely, and they make everything else today click. This lesson explains machine learning from zero for a web developer, with tiny runnable Python and no calculus.",
  sections: [
    {
      h: "AI vs ML vs deep learning vs generative AI",
      blocks: [
        {
          lang: "text",
          code: `┌─ Artificial Intelligence: machines doing tasks that seem to need intelligence ───────┐
│   ┌─ Machine Learning: systems that learn patterns from data instead of rules ──────┐ │
│   │   ┌─ Deep Learning: ML with many-layered neural networks ───────────────────┐   │ │
│   │   │   ┌─ Generative AI: models that create new text, images, audio, code ─┐ │   │ │
│   │   │   │   LLMs (GPT, Claude, Gemini, Llama): generative models for text   │ │   │ │
│   │   │   └───────────────────────────────────────────────────────────────────┘ │   │ │
│   │   └─────────────────────────────────────────────────────────────────────────┘   │ │
│   └─────────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────────┘`,
        },
        {
          table: {
            head: ["Term", "Plain meaning", "Example"],
            rows: [
              ["AI", "Any technique that makes computers act smart, including rules", "A chess engine, a rule-based chatbot"],
              ["Machine learning", "Learn a function from examples", "Spam filter trained on labelled emails"],
              ["Deep learning", "ML using neural networks with many layers", "Image recognition, speech-to-text"],
              ["Generative AI", "Models that produce new content", "ChatGPT, Midjourney, Suno"],
              ["Discriminative / predictive AI", "Models that classify or score existing data", "Fraud score, churn prediction"],
              ["LLM", "A large neural network trained on text to predict the next token", "Claude, GPT, Llama"],
              ["Foundation model", "A large pretrained model adapted to many tasks", "An LLM or a multimodal model"],
            ],
          },
        },
      ],
    },
    {
      h: "Traditional programming vs machine learning",
      blocks: [
        {
          lang: "text",
          code: `Traditional programming:   rules + data      →  answers
Machine learning:          data + answers    →  rules (a trained model)`,
        },
        "In your MERN work you write the rules: `if (cart.total > 1000) discount = 0.1`. In ML, you collect examples (inputs with correct outputs) and an algorithm finds a function that maps one to the other. That function is the **model**. For problems like \"is this email spam?\" or \"what word comes next?\", nobody can write the rules, but examples are plentiful.",
      ],
    },
    {
      h: "The kinds of learning",
      blocks: [
        {
          table: {
            head: ["Type", "Data", "Example", "Where LLMs use it"],
            rows: [
              ["**Supervised**", "Inputs with correct labels", "Email → spam / not spam", "SFT: prompt → ideal answer"],
              ["**Unsupervised**", "Inputs only; find structure", "Cluster customers into groups", "Clustering embeddings (topic discovery)"],
              ["**Self-supervised**", "Labels created from the data itself", "Hide the next word, predict it", "**Pretraining**: the next token is the label, free for any text"],
              ["**Reinforcement learning**", "Actions + rewards", "A game agent learns from wins and losses", "RLHF and reasoning training"],
            ],
          },
        },
        {
          tip: "Self-supervised learning is the secret of LLMs: every sentence on the internet is a free training example (\"given these words, predict the next one\"), so there's no need for human labelling at pretraining scale.",
        },
      ],
    },
    {
      h: "A model is a function with knobs (parameters)",
      blocks: [
        "The simplest model: predict a flat's rent from its area with a straight line, `rent = w × area + b`. `w` (weight) and `b` (bias) are the **parameters**: the knobs learning adjusts. An LLM is the same idea with billions of knobs.",
        {
          lang: "python",
          code: `# Toy data: area (sq ft) → rent (₹ thousands) in one neighbourhood
data = [(500, 16), (750, 23), (1000, 31), (1200, 36), (1500, 46)]

w, b = 0.0, 0.0          # parameters, start random-ish
lr = 1e-7                # learning rate: how big each adjustment is

for step in range(20_001):
    # 1. forward pass: predictions with current parameters
    # 2. loss: how wrong are we? (mean squared error)
    loss = sum((w * x + b - y) ** 2 for x, y in data) / len(data)
    # 3. gradients: which direction reduces the loss?
    dw = sum(2 * (w * x + b - y) * x for x, y in data) / len(data)
    db = sum(2 * (w * x + b - y) for x, y in data) / len(data)
    # 4. update: move each knob a small step downhill
    w -= lr * dw
    b -= lr * db * 1000          # bias gets a bigger step here, just to converge faster in this toy
    if step % 5000 == 0:
        print(f"step {step:>6}  loss {loss:8.3f}  w={w:.4f} b={b:.3f}")

print("Predicted rent for 900 sq ft:", round(w * 900 + b, 1), "thousand")`,
          caption: "Run it: the loss drops step by step. This loop (predict → measure error → compute gradients → update) is exactly how LLMs are trained, just at a vastly larger scale.",
        },
        {
          table: {
            head: ["Term", "Meaning in the toy", "Meaning in an LLM"],
            rows: [
              ["Parameters (weights)", "`w`, `b`: 2 numbers", "7 billion to trillions of numbers"],
              ["Forward pass", "Compute `w × area + b`", "Run the tokens through all transformer layers"],
              ["Loss", "Mean squared error of rent", "Cross-entropy: how surprised the model was by the real next token"],
              ["Gradient", "Direction to change `w`, `b`", "Direction to change every parameter"],
              ["Backpropagation", "(trivial here)", "Efficiently computes gradients through all layers"],
              ["Learning rate", "`lr`", "Step size, carefully scheduled"],
              ["Step / epoch", "One update / one pass over data", "LLMs see most data about once"],
            ],
          },
        },
      ],
    },
    {
      h: "Gradient descent, intuitively",
      blocks: [
        "Picture the loss as a hilly landscape and your parameters as your position. You're blindfolded, so you feel the slope under your feet (the **gradient**) and take a small step downhill. Repeat millions of times and you reach a low valley: parameters that make few mistakes.",
        {
          list: [
            "**Learning rate too big:** you overshoot and bounce around, or diverge (loss becomes NaN).",
            "**Too small:** training takes forever.",
            "**Stochastic gradient descent (SGD):** estimate the slope from a small random **batch** of examples instead of all data: noisy but fast. LLMs train with a variant called **AdamW**.",
            "**Backpropagation:** the chain rule from calculus applied layer by layer, backwards, to get every parameter's gradient in one sweep. Frameworks like PyTorch do it automatically (`loss.backward()`).",
          ],
        },
      ],
    },
    {
      h: "Neural networks: stacking simple units",
      blocks: [
        "A **neuron** takes inputs, multiplies each by a weight, adds them up with a bias, and passes the result through a non-linear **activation function** (like ReLU: `max(0, x)`). A **layer** is many neurons side by side; a **deep** network stacks many layers. The non-linearity is what lets the network model complex patterns rather than just straight lines.",
        {
          lang: "python",
          code: `import numpy as np

def relu(x):
    return np.maximum(0, x)

x = np.array([0.5, -1.2, 3.0])            # input features (e.g. part of a token embedding)
W1 = np.random.randn(3, 4) * 0.5          # layer 1: 3 inputs → 4 neurons (12 weights)
b1 = np.zeros(4)
W2 = np.random.randn(4, 2) * 0.5          # layer 2: 4 → 2 outputs (8 weights)
b2 = np.zeros(2)

hidden = relu(x @ W1 + b1)                # matrix multiply + bias + activation
out = hidden @ W2 + b2
print(out)                                # 2 numbers; training would tune W1, b1, W2, b2`,
          caption: "A neural network is mostly matrix multiplications. That's why GPUs, which do thousands of multiplications in parallel, are the hardware of AI.",
        },
        "Inside an LLM, the same pattern appears in every transformer block's **feed-forward (MLP)** layer, alongside attention. \"A 70B model\" means 70 billion such weights in total.",
      ],
    },
    {
      h: "Training vs inference",
      blocks: [
        {
          table: {
            head: ["", "Training", "Inference"],
            rows: [
              ["What happens", "Parameters are adjusted using data and gradients", "Parameters are frozen; the model just computes outputs"],
              ["Who does it", "Model labs (pretraining); you, sometimes, for fine-tuning", "You, every API call"],
              ["Cost", "Enormous one-time compute (thousands of GPUs, weeks)", "Per request; adds up with traffic"],
              ["Does the model learn from my prompt?", "Only if the data is used for training later", "**No.** An API call never changes the weights"],
            ],
          },
        },
        {
          note: "\"The model learned from our conversation\" is a misconception. Within a conversation it uses the context you send (in-context learning); the weights don't change. Whether providers train on your API data is a policy question: most business APIs don't by default. Check the terms.",
        },
      ],
    },
    {
      h: "Generalisation, overfitting and data splits",
      blocks: [
        "The goal isn't to memorise training data; it's to do well on **new** data. That's **generalisation**.",
        {
          list: [
            "**Overfitting:** the model memorises training examples (including noise) and fails on new ones. Like a student who memorised last year's paper word for word.",
            "**Underfitting:** too simple to capture the pattern.",
            "**Train / validation / test split:** train on one part, tune decisions on validation, report final quality on a test set the model never saw.",
            "**Data leakage:** test examples sneak into training, making scores look better than reality. LLM benchmarks suffer from this (**contamination**) when test questions appear on the web used for pretraining.",
          ],
        },
        {
          tip: "You'll use the same discipline on Day 9 when you build **evals** for your RAG system: a fixed test set you never tune prompts against directly.",
        },
      ],
    },
    {
      h: "Parameters, precision and memory: the numbers to know",
      blocks: [
        "Each parameter is a number stored in some precision. Memory needed just to hold the weights:",
        {
          table: {
            head: ["Precision", "Bytes per parameter", "7B model", "70B model"],
            rows: [
              ["FP32 (full)", "4", "28 GB", "280 GB"],
              ["FP16 / BF16 (typical serving)", "2", "14 GB", "140 GB"],
              ["INT8 (quantised)", "1", "7 GB", "70 GB"],
              ["INT4 (quantised, e.g. GGUF Q4)", "0.5", "~3.5 GB", "~35 GB"],
            ],
          },
        },
        {
          lang: "python",
          code: `def weights_gb(params_billion: float, bytes_per_param: float) -> float:
    return params_billion * 1e9 * bytes_per_param / 1e9

print(weights_gb(8, 2))      # Llama-3-8B in BF16  → 16 GB (+ KV cache and overhead to run)
print(weights_gb(8, 0.5))    # the same, 4-bit     → 4 GB: fits on a laptop with Ollama`,
        },
        "This is why a 7–8B model runs on a laptop (quantised) and a 70B model needs one or more data-centre GPUs. You'll use these numbers on Day 15 (self-hosting) and in system design interviews.",
      ],
    },
    {
      h: "Why GPUs (and why NVIDIA is worth so much)",
      blocks: [
        {
          list: [
            "Neural networks are dominated by **matrix multiplication**; GPUs have thousands of cores that do these in parallel, where a CPU has a few dozen.",
            "**Memory bandwidth** matters as much as raw compute: generating each token means reading all the weights from GPU memory (HBM).",
            "Data-centre GPUs (NVIDIA A100, H100, H200, B200) have 40–192 GB of fast memory; alternatives include Google TPUs, AWS Trainium/Inferentia and AMD MI300.",
            "NVIDIA's **CUDA** software ecosystem is why most AI code runs on its hardware.",
          ],
        },
      ],
    },
    {
      h: "The Python ML toolbox (names you'll hear)",
      blocks: [
        {
          table: {
            head: ["Library", "What it's for", "Do you need it for GenAI dev?"],
            rows: [
              ["NumPy", "Fast arrays and maths", "Yes, basics (embeddings, similarity)"],
              ["pandas", "Tables of data (like a programmable spreadsheet)", "Useful for evals and analysis"],
              ["scikit-learn", "Classic ML: classifiers, clustering, metrics", "Occasionally (metrics, clustering)"],
              ["PyTorch", "Build and train neural networks; most LLM research", "Only for fine-tuning / self-hosting"],
              ["Hugging Face Transformers", "Download and run thousands of pretrained models", "Yes, for open models and embeddings"],
              ["Jupyter notebooks", "Interactive experiments", "Yes, for exploring and evals"],
            ],
          },
        },
        {
          note: "A GenAI developer mostly *uses* models through APIs and frameworks. You'll build RAG, agents and products, not train networks from scratch. But knowing this vocabulary is what separates you from someone who only knows `client.chat.completions.create`.",
        },
      ],
    },
  ],
  revise: [
    "AI ⊃ ML ⊃ deep learning ⊃ generative AI ⊃ LLMs.",
    "ML: data + answers → learned function (model). Parameters are the knobs.",
    "Supervised (labels), unsupervised (structure), self-supervised (labels from data: next token), reinforcement (rewards).",
    "Training loop: forward pass → loss → gradients (backprop) → update (gradient descent). Learning rate = step size.",
    "Neural network = layers of weighted sums + non-linear activations; mostly matrix multiplications → GPUs.",
    "Training changes weights; inference doesn't. API calls never teach the model.",
    "Overfitting = memorising; generalisation = doing well on unseen data; keep a held-out test set; beware contamination.",
    "Memory ≈ parameters × bytes per parameter: 7B ≈ 14 GB in BF16, ≈ 3.5–4 GB in 4-bit.",
  ],
  mistakes: [
    "Saying the model \"learns\" from your chat. It uses the context; weights stay frozen.",
    "Mixing up parameters (learned weights) with hyperparameters (settings you choose: learning rate, layers, temperature).",
    "Forgetting that model size in memory depends on precision (quantisation).",
  ],
  interview: [
    {
      q: "What's the difference between AI, ML, deep learning and generative AI?",
      a: "AI is the broad goal of machines doing intelligent tasks, including rule-based systems. Machine learning is the subset that learns patterns from data. Deep learning is ML with multi-layer neural networks. Generative AI uses (mostly deep) models to create new content like text, images or code, and LLMs are generative models for text built on transformers.",
    },
    {
      q: "Explain gradient descent in simple terms.",
      a: "Training defines a loss that measures how wrong the model is. Gradient descent computes the gradient, the direction in which each parameter should change to reduce the loss, and takes a small step that way, repeated over many batches of data. Backpropagation computes those gradients efficiently through all layers, and the learning rate sets the step size.",
    },
    {
      q: "What type of learning is LLM pretraining?",
      a: "Self-supervised learning: the labels come from the data itself, because the next token in any text is the target. That's why LLMs can train on trillions of tokens without human labelling. Later stages use supervised fine-tuning on curated examples and reinforcement learning from preferences or verifiable rewards.",
    },
  ],
  practice: [
    "Run the rent example. Change the learning rate to 1e-5 and watch it diverge; explain why in your notes.",
    "Compute how much GPU memory a 13B and a 70B model need in BF16 and in 4-bit.",
  ],
};
