// Throw from anywhere in a request: the error handler turns it into { message } with this status.
export class HttpError extends Error {
  /** `code` is an optional machine-readable reason the frontend can branch on. */
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }

  static badRequest = (message, code) => new HttpError(400, message, code);
  static unauthorized = (message = "Please sign in again.", code) => new HttpError(401, message, code);
  static forbidden = (message = "You don't have access to this.") => new HttpError(403, message);
  static notFound = (message = "Not found.") => new HttpError(404, message);
}
