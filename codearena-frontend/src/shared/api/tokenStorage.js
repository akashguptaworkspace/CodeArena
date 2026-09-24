// The access token lives in memory only (never localStorage), so injected scripts can't read it
// from storage. After a reload it's fetched again using the httpOnly refresh cookie.
let accessToken = null;

export const tokenStorage = {
  get: () => accessToken,
  set: (token) => {
    accessToken = token;
  },
  clear: () => {
    accessToken = null;
  },
};
