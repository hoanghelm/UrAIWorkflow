import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface Usage {
  at: number;
  tokens: number;
}

export interface HeadroomSnapshot {
  windowMs: number;
  requests: number;
  maxRequests: number;
  requestHeadroom: number;
  tokens: number;
  maxTokens: number;
  tokenHeadroom: number;
  waiting: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

@Injectable()
export class HeadroomService {
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly maxTokens: number;
  private events: Usage[] = [];
  private waiting = 0;

  constructor(config: ConfigService) {
    this.windowMs = Number(config.get("HEADROOM_WINDOW_MS")) || 60_000;
    this.maxRequests = Number(config.get("HEADROOM_RPM")) || 45;
    this.maxTokens = Number(config.get("HEADROOM_TPM")) || 180_000;
  }

  private prune(now: number): void {
    this.events = this.events.filter((e) => now - e.at < this.windowMs);
  }

  private totals(now: number): { requests: number; tokens: number } {
    this.prune(now);
    return {
      requests: this.events.length,
      tokens: this.events.reduce((sum, e) => sum + e.tokens, 0),
    };
  }

  async acquire(): Promise<(tokens: number) => void> {
    this.waiting += 1;
    try {
      for (;;) {
        const now = Date.now();
        const { requests, tokens } = this.totals(now);
        if (requests < this.maxRequests && tokens < this.maxTokens) {
          break;
        }
        const oldest = this.events[0];
        const wait = oldest ? Math.max(50, this.windowMs - (now - oldest.at)) : 50;
        await sleep(Math.min(wait, this.windowMs));
      }
    } finally {
      this.waiting -= 1;
    }
    const event: Usage = { at: Date.now(), tokens: 0 };
    this.events.push(event);
    return (tokens: number) => {
      event.tokens = Math.max(0, tokens);
    };
  }

  snapshot(): HeadroomSnapshot {
    const { requests, tokens } = this.totals(Date.now());
    return {
      windowMs: this.windowMs,
      requests,
      maxRequests: this.maxRequests,
      requestHeadroom: Math.max(0, this.maxRequests - requests),
      tokens,
      maxTokens: this.maxTokens,
      tokenHeadroom: Math.max(0, this.maxTokens - tokens),
      waiting: this.waiting,
    };
  }
}
