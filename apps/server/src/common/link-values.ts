import { BadRequestException } from '@nestjs/common';
import { OrganizationStatus } from '../generated/prisma/client';

export enum OrganizationStatusValue {
  Pending = 'pending',
  Organized = 'organized',
}

export enum LinkViewValue {
  All = 'all',
  Recent = 'recent',
  Pending = 'pending',
}

export enum WebLinkViewValue {
  All = 'all',
  Recent = 'recent',
}

export enum LinkSortValue {
  Newest = 'newest',
  Oldest = 'oldest',
  Title = 'title',
}

export function toOrganizationStatus(value: OrganizationStatusValue) {
  return value === OrganizationStatusValue.Organized
    ? OrganizationStatus.ORGANIZED
    : OrganizationStatus.PENDING;
}

export function fromOrganizationStatus(value: OrganizationStatus) {
  return value.toLowerCase() as OrganizationStatusValue;
}

export interface NormalizedUrl {
  domain: string;
  normalizedUrl: string;
  url: string;
}

const firstHanCharacter = /\p{Script=Han}/u;
const trailingUrlPunctuation = /[),.;!?，。；！？）】》]+$/u;

export function normalizeHttpUrl(value: string): NormalizedUrl | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }

    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }

    return {
      domain: url.hostname,
      normalizedUrl: url.toString(),
      url: url.toString(),
    };
  } catch {
    return null;
  }
}

export function requireHttpUrl(value: string): NormalizedUrl {
  const normalized = normalizeHttpUrl(value);
  if (!normalized) {
    throw new BadRequestException({
      code: 'INVALID_URL',
      message: 'URL 必须是有效的 HTTP(S) 地址。',
    });
  }
  return normalized;
}

export function sanitizeTelegramHttpUrlCandidate(
  value: string,
): string | null {
  const trimmed = value.trim();
  const firstHanMatch = firstHanCharacter.exec(trimmed);
  const beforeHan =
    firstHanMatch?.index === undefined
      ? trimmed
      : trimmed.slice(0, firstHanMatch.index);
  const sanitized = beforeHan.replace(trailingUrlPunctuation, '');
  const normalized = normalizeHttpUrl(sanitized);

  if (
    firstHanMatch &&
    normalized &&
    !normalized.domain.includes('.') &&
    !normalized.domain.includes(':')
  ) {
    return null;
  }

  return normalized ? sanitized : null;
}

export function extractPlainHttpUrls(text: string): string[] {
  const matches: readonly string[] =
    text.match(/https?:\/\/[^\s<>"'，。；！？）】》]+/giu) ?? [];
  return matches
    .map(sanitizeTelegramHttpUrlCandidate)
    .filter((value): value is string => value !== null);
}
