// Day 1: setup lesson (Mac + Windows). Merged into d01.js. Shape: see ./index.js
export default {
  minutes: 60,
  level: "Beginner",
  intro:
    "Before writing Python you need three things on your laptop: the **Python interpreter** (like Node), a **package and project manager** (like npm), and an **editor** set up for Python. This lesson installs all three on **macOS and Windows**, runs your first program, and explains how Python runs code compared with Node. Follow only the section for your operating system.",
  sections: [
    {
      h: "What you're installing, mapped from Node",
      blocks: [
        {
          table: {
            head: ["You know (Node)", "Python equivalent", "What it does"],
            rows: [
              ["`node`", "`python` (on Mac: `python3`; on Windows also `py`)", "The interpreter that runs your code"],
              ["`node app.js`", "`python app.py`", "Run a file"],
              ["`node` (REPL)", "`python` (REPL)", "Type code line by line and see results"],
              ["`nvm`", "`uv python install` / `pyenv`", "Install and switch Python versions"],
              ["`npm` / `pnpm`", "**`uv`** (modern) or `pip` (classic)", "Install packages, manage the project"],
              ["`node_modules/`", "`.venv/` (virtual environment)", "Where this project's packages live"],
              ["`package.json`", "`pyproject.toml`", "Project name, dependencies, settings"],
              ["`package-lock.json`", "`uv.lock`", "Exact versions, for reproducible installs"],
              ["npmjs.com", "pypi.org", "The public package registry"],
            ],
          },
        },
        "We'll use **Python 3.12** (any 3.12 or newer is fine) and **uv**, a fast tool that installs Python versions, creates the virtual environment and manages packages. It feels closest to npm. You'll also see classic `pip` in tutorials, so we cover both.",
        {
          note: "Python 2 is dead (end of life in 2020). Anything you install today is Python 3. If a tutorial uses `print \"hi\"` without brackets, it's Python 2: skip it.",
        },
      ],
    },
    {
      h: "macOS: install step by step",
      blocks: [
        "Open **Terminal** (Cmd + Space → type Terminal). macOS uses the `zsh` shell by default.",
        "**Step 1: check what's already there.**",
        {
          lang: "bash",
          code: `python3 --version
# "Python 3.9.6"  → Apple's old copy (comes with Xcode Command Line Tools). Don't use it for projects.
# "command not found" or a popup asking to install developer tools → nothing installed yet. Fine.`,
        },
        "**Step 2 (recommended): install uv, then let uv install Python.**",
        {
          lang: "bash",
          code: `curl -LsSf https://astral.sh/uv/install.sh | sh
# close and reopen Terminal (so your PATH updates), then:
uv --version
uv python install 3.12
uv python list            # shows installed and available versions`,
        },
        "**Alternative: Homebrew.** If you already use Homebrew (the Mac package manager):",
        {
          lang: "bash",
          code: `brew install python@3.12 uv
python3.12 --version`,
        },
        "**Alternative: python.org installer.** Download the macOS installer from python.org → run it → it also installs \"IDLE\" and a certificates script. Run `Install Certificates.command` from the Python folder in Applications (it fixes SSL errors when downloading packages).",
        {
          warn: "On Mac, `python` (without the 3) often doesn't exist, and `pip` may point to the wrong Python. Use `python3`, or better, run everything through `uv run ...` inside a project so the right interpreter is always used.",
        },
      ],
    },
    {
      h: "Windows: install step by step",
      blocks: [
        "Open **PowerShell** (Start → type PowerShell). Windows Terminal is nicer if you have it.",
        "**Option A (recommended): the official installer from python.org.**",
        {
          list: [
            "Go to python.org → Downloads → Windows → download the latest **Python 3.12+ 64-bit installer**.",
            "In the first installer screen, **tick \"Add python.exe to PATH\"**. This is the most commonly missed step.",
            "Click **Install Now**. It also installs the `py` launcher.",
            "Close and reopen PowerShell, then verify:",
          ],
          ordered: true,
        },
        {
          lang: "powershell",
          code: `python --version        # Python 3.12.x
py --version            # the Windows launcher; py -3.12 picks a specific version
py -0                   # lists all installed Pythons`,
        },
        "**Option B: winget** (Windows' built-in package manager):",
        {
          lang: "powershell",
          code: `winget install Python.Python.3.12`,
        },
        "**Then install uv** (from the official install script):",
        {
          lang: "powershell",
          code: `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
# close and reopen PowerShell
uv --version`,
        },
        {
          warn: "If typing `python` opens the **Microsoft Store**, Windows is using a fake shortcut. Fix: Settings → Apps → Advanced app settings → **App execution aliases** → turn off \"python.exe\" and \"python3.exe\". Then reopen PowerShell.",
        },
        {
          warn: "If activating a virtual environment says \"running scripts is disabled on this system\", run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` and answer Y. (With `uv run` you usually don't need to activate at all.)",
        },
        {
          table: {
            head: ["Task", "macOS / Linux", "Windows (PowerShell)"],
            rows: [
              ["Run Python", "`python3`", "`python` or `py`"],
              ["Create a venv", "`python3 -m venv .venv`", "`python -m venv .venv`"],
              ["Activate it", "`source .venv/bin/activate`", "`.venv\\Scripts\\Activate.ps1`"],
              ["Deactivate", "`deactivate`", "`deactivate`"],
              ["Path separator", "`/`", "`\\` (Python's `pathlib` handles both)"],
            ],
          },
        },
      ],
    },
    {
      h: "Set up VS Code for Python",
      blocks: [
        {
          list: [
            "Install these extensions: **Python** (by Microsoft), **Pylance** (autocomplete and type checking; usually installed with Python), and **Ruff** (formatting and linting, like Prettier + ESLint).",
            "Open your project folder (File → Open Folder), not a single file.",
            "Command Palette (Cmd/Ctrl + Shift + P) → **Python: Select Interpreter** → choose the one inside your project's `.venv`. If imports show red squiggles but the code runs, the wrong interpreter is selected.",
            "Add format-on-save to your settings (Command Palette → Preferences: Open User Settings (JSON)):",
          ],
          ordered: true,
        },
        {
          lang: "json",
          code: `{
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": { "source.organizeImports": "explicit" }
  },
  "python.analysis.typeCheckingMode": "basic"
}`,
        },
        {
          tip: "`typeCheckingMode: basic` makes VS Code underline type mistakes, similar to TypeScript errors. It's one of the fastest ways to learn Python's types.",
        },
      ],
    },
    {
      h: "Your first program, and how Python runs it",
      blocks: [
        "**The REPL** (interactive mode) is great for trying things out:",
        {
          lang: "bash",
          code: `python3            # Windows: python
>>> 2 + 3
5
>>> name = "Asha"
>>> f"Hello, {name}!"
'Hello, Asha!'
>>> exit()         # or Ctrl + D (Mac) / Ctrl + Z then Enter (Windows)`,
        },
        "**A script file.** Create `hello.py`:",
        {
          lang: "python",
          code: `name = input("What's your name? ")
print(f"Hello, {name}! Python is working.")`,
        },
        {
          lang: "bash",
          code: `python3 hello.py        # Windows: python hello.py`,
        },
        "**How Python runs code.** Like Node, Python is interpreted: there's no separate build step. When you run a file, CPython (the standard interpreter) compiles it to **bytecode** in memory and executes it line by line. For imported modules it caches that bytecode in `__pycache__/*.pyc` files so the next start is faster. You never edit those; add `__pycache__/` to `.gitignore`.",
        {
          table: {
            head: ["", "Node.js", "Python"],
            rows: [
              ["Blocks", "`{ }` braces", "Indentation (4 spaces) after a `:`"],
              ["Statement end", "`;` (optional)", "New line (no semicolons)"],
              ["Comments", "`//` and `/* */`", "`#` (and docstrings `\"\"\"...\"\"\"`)"],
              ["Entry point", "Whatever file you run", "Same, plus the `if __name__ == \"__main__\":` convention"],
              ["Concurrency", "Event loop by default", "Synchronous by default; `asyncio` when you ask for it (Day 2)"],
            ],
          },
        },
      ],
    },
    {
      h: "Your first uv project (same on Mac and Windows)",
      blocks: [
        "Just like `npm init`, `uv init` creates a project. From now on, every exercise and project in this plan starts this way.",
        {
          lang: "bash",
          code: `mkdir hello-python && cd hello-python
uv init --python 3.12        # creates pyproject.toml, .python-version, main.py, .gitignore
uv add httpx                 # like "npm install axios": creates .venv/ and uv.lock
uv run main.py               # runs with the project's Python and packages
uv run python                # a REPL inside the project environment`,
        },
        {
          code: `hello-python/
├── .python-version     # which Python this project uses (like .nvmrc)
├── .venv/              # installed packages (like node_modules) — never commit
├── main.py             # your code
├── pyproject.toml      # like package.json
└── uv.lock             # like package-lock.json — commit it`,
          lang: "text",
        },
        "Change `main.py` to call a real API, to check packages work:",
        {
          lang: "python",
          code: `import httpx

r = httpx.get("https://api.github.com/repos/python/cpython", timeout=10)
print("CPython has", r.json()["stargazers_count"], "stars on GitHub")`,
        },
        {
          table: {
            head: ["npm", "uv"],
            rows: [
              ["`npm init`", "`uv init`"],
              ["`npm install axios`", "`uv add httpx`"],
              ["`npm install -D jest`", "`uv add --dev pytest`"],
              ["`npm uninstall x`", "`uv remove x`"],
              ["`npm install` (fresh clone)", "`uv sync`"],
              ["`npm run start`", "`uv run python -m app` (or a command you define)"],
              ["`npx create-x`", "`uvx tool-name`"],
            ],
          },
        },
      ],
    },
    {
      h: "Troubleshooting the usual setup problems",
      blocks: [
        {
          table: {
            head: ["Error", "Cause", "Fix"],
            rows: [
              ["`command not found: python`", "Mac uses `python3`; or PATH not updated", "Use `python3`; reopen the terminal after installing"],
              ["`python` opens the Microsoft Store", "Windows app execution alias", "Turn off the aliases (see the Windows section)"],
              ["`uv: command not found`", "Terminal opened before install", "Close and reopen the terminal"],
              ["`ModuleNotFoundError: No module named 'httpx'`", "Package installed into a different Python", "Run with `uv run`, or select the `.venv` interpreter in VS Code"],
              ["`pip: command not found`", "pip not on PATH", "Use `python3 -m pip ...` (or `uv add`)"],
              ["SSL certificate errors (Mac, python.org installer)", "Certificates not installed", "Run `Install Certificates.command`"],
              ["Red squiggles in VS Code but code runs", "Editor uses the wrong interpreter", "Python: Select Interpreter → `.venv`"],
            ],
          },
        },
      ],
    },
  ],
  revise: [
    "Python = interpreter (like `node`); uv = project + package manager (like npm); `.venv` = `node_modules`; `pyproject.toml` = `package.json`; `uv.lock` = lock file.",
    "Mac: `curl -LsSf https://astral.sh/uv/install.sh | sh`, then `uv python install 3.12`. Use `python3`, not Apple's old 3.9.",
    "Windows: python.org installer with **Add to PATH** ticked (or winget), `py` launcher, disable Store aliases, uv via the PowerShell script.",
    "VS Code: Python + Pylance + Ruff extensions, select the `.venv` interpreter, format on save.",
    "`uv init` → `uv add pkg` → `uv run file.py`; `uv sync` on a fresh clone.",
    "No braces or semicolons: indentation defines blocks. Python is synchronous unless you use `asyncio`.",
  ],
  mistakes: [
    "Using macOS's built-in Python 3.9 for projects.",
    "Forgetting \"Add python.exe to PATH\" on Windows.",
    "Installing packages with a global `pip` and then running code with a different Python.",
    "Mixing tabs and spaces for indentation. Let Ruff format your files.",
  ],
  interview: [
    {
      q: "How do you set up a new Python backend project?",
      a: "I use uv: `uv init` to create the project with a pinned Python version, `uv add` for dependencies (which creates the virtual environment and a lockfile), `uv add --dev pytest ruff` for tooling, and `uv run` to execute commands. I commit `pyproject.toml` and `uv.lock`, never `.venv` or `.env`, and set VS Code to the project's interpreter with Ruff formatting on save.",
    },
    {
      q: "Is Python compiled or interpreted?",
      a: "CPython compiles source code to bytecode and then interprets that bytecode on its virtual machine. There's no separate build step for the developer; bytecode for imported modules is cached in `__pycache__` to speed up later starts. So in practice it behaves like an interpreted language, similar to Node.",
    },
  ],
  practice: [
    "Install Python 3.12 and uv on your laptop and show `uv --version` and `uv run python --version` in one screenshot for your notes.",
    "Create `hello-python` with `uv init`, add `httpx`, and print the stars of any GitHub repo you like.",
    "Break it on purpose: run `python3 main.py` outside `uv run` and read the `ModuleNotFoundError`. Explain why it happened in your notes.",
  ],
};
