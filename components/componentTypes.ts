export interface SearchHit {
  [key: string]: unknown;
  objectID?: string;
  _id?: string;
  slug?: string;
  title?: string;
  name?: string;
  image?: string;
  images?: string[];
  primaryImage?: string;
  imageUrl?: string;
  thumbnail?: string;
  description?: string;
  excerpt?: string;
  location?: string;
  destination?: string | { name?: string };
  category?: string | { name?: string };
  duration?: string;
  rating?: number;
  reviews?: number;
  reviewCount?: number;
  price?: number;
  discountPrice?: number;
  originalPrice?: number;
  isFeatured?: boolean;
  featured?: boolean;
  isPublished?: boolean;
  tourCount?: number;
  country?: string;
  tags?: string[];
  highlights?: string[];
  url?: string;
  pageType?: string;
  urlType?: string;
  parentPage?: { slug?: string } | null;
  archivedAt?: string | Date | null;
  type?: string;
  content?: string;
  readTime?: number;
}

export interface ChatPart {
  type: string;
  text?: string;
  output?: unknown;
  input?: unknown;
  state?: string;
  toolName?: string;
}

export interface ChatTextPart extends ChatPart {
  text: string;
}

export interface IntercomMessenger {
  boot?: (options?: Record<string, unknown>) => void;
  show?: () => void;
  hide?: () => void;
  shutdown?: () => void;
  update?: (options?: Record<string, unknown>) => void;
  [method: string]: unknown;
}

export interface EeoWindow extends Window {
  __pendingAIOpenAgent?: boolean;
  __pendingAIOpenAgentQuery?: string;
  __intercomMessenger?: IntercomMessenger;
  openIntercom?: () => void;
  FoxesCalendarEmbed?: {
    init: (options: Record<string, unknown>) => void;
  };
  /** FoxesConnect support widget (embed.js) — the plain support entry. */
  FoxesConnect?: {
    open?: () => void;
    close?: () => void;
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isSearchHit(value: unknown): value is SearchHit {
  return isRecord(value);
}

export function isPresent<T>(value: T | null | undefined): value is T {
  return value != null;
}

export function isTextPart(value: unknown): value is ChatTextPart {
  return isRecord(value) && typeof value.type === 'string' && typeof value.text === 'string';
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
