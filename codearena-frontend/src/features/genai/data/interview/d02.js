// Day 2 interview bank: Python backend (async, HTTP/REST, Pydantic, FastAPI, SQL, ORM, auth, scaling, deployment). Shape: see ./index.js
import { asyncDeep, httpRest, pydanticAdv, fastapiAdv } from "./d02-a.js";
import { sql, orm, migrations, mongo } from "./d02-b.js";
import { security, scaling, devops, scenarios, liveCoding } from "./d02-c.js";

export default {
  title: "Python backend interview questions",
  intro:
    "The backend round for Python / GenAI developer roles: asyncio in depth, HTTP and REST API design, advanced Pydantic and FastAPI, SQL and PostgreSQL, SQLAlchemy, migrations, MongoDB, authentication and security, caching and scaling, Docker and deployment, real production scenarios, and live-coding tasks. Day 1's bank covers the Python language and FastAPI basics; this one goes deeper. Questions tagged **Often asked** come up in most interviews: start with those.",
  groups: [asyncDeep, httpRest, pydanticAdv, fastapiAdv, sql, orm, migrations, mongo, security, scaling, devops, scenarios, liveCoding],
};
