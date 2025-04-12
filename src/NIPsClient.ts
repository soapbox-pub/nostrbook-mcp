import { HTTPError } from './HTTPError.ts';

export interface NIPsClientOpts {
  urlTemplate: string;
  fetch?: typeof fetch;
}

export class NIPsClient {
  readonly urlTemplate: string;

  private fetch: typeof fetch;

  constructor(opts: NIPsClientOpts) {
    this.urlTemplate = opts.urlTemplate;
    this.fetch = opts.fetch ?? globalThis.fetch;
  }

  async readDoc(slug: string): Promise<string> {
    const url = this.urlTemplate.replace('{nip}', slug);

    const request = new Request(url);
    const response = await this.fetch(request);

    if (!response.ok) {
      throw new HTTPError(response, request);
    }

    return response.text();
  }

  readNip(nip: string): Promise<string> {
    return this.readDoc(nip);
  }

  readIndex(): Promise<string> {
    return this.readDoc('README');
  }

  readBreaking(): Promise<string> {
    return this.readDoc('BREAKING');
  }
}
