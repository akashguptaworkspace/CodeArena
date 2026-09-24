import { HttpError } from "../utils/HttpError.js";

/**
 * Validates and replaces req.params / req.body with parsed values.
 * usage: validate({ params: schema, body: schema })
 */
export const validate = (schemas) => (req, _res, next) => {
  for (const part of ["params", "body", "query"]) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (!result.success) {
      const issue = result.error.issues[0];
      const where = issue.path.length ? `${issue.path.join(".")}: ` : "";
      throw HttpError.badRequest(`${where}${issue.message}`);
    }
    if (part === "query") Object.defineProperty(req, "query", { value: result.data });
    else req[part] = result.data;
  }
  next();
};
