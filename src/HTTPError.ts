export class HTTPError extends Error {
  constructor(readonly response: Response, readonly request: Request) {
    super(`HTTP Error: ${response.status} ${request.method} ${request.url}`);
    this.name = 'HTTPError';
  }
}
