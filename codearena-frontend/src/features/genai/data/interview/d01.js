// Day 1 interview bank: Python + Python backend questions. Shape: see ./index.js
import { basics, dataTypes, functions } from "./d01-core.js";
import { oop, iteration, errors, modules, concurrency, stdlib } from "./d01-oop.js";
import { fastapi, testing, outputs, coding } from "./d01-backend.js";

export default {
  title: "Python interview questions",
  intro:
    "The Python questions interviewers ask most, for backend and GenAI developer roles in India: language basics, data structures, functions, OOP, generators, errors, modules, concurrency, FastAPI and Pydantic, testing, \"what does this print?\" puzzles, and live-coding tasks. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [basics, dataTypes, functions, oop, iteration, errors, modules, concurrency, stdlib, fastapi, testing, outputs, coding],
};
