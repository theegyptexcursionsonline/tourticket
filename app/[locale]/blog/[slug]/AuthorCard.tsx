'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Facebook, Twitter, User } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getAuthorRouteSlug } from '@/lib/blogAuthors';

export interface AuthorProfile {
  name: string;
  slug?: string;
  role?: string;
  bio?: string;
  avatar?: string;
  twitter?: string;
  facebook?: string;
  website?: string;
  email?: string;
  postsCount?: number;
}

/**
 * Letters for the avatar fallback. An acronym byline such as "EEO Editorial Team" keeps
 * its acronym; a personal name gives its first two initials. Array.from keeps letters
 * outside the Basic Multilingual Plane whole, so Arabic or accented names stay intact.
 */
export function authorInitials(name?: string): string {
  const words = (name || '').trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return '';
  if (/^\p{Lu}{2,4}$/u.test(words[0])) return words[0];
  return words
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toLocaleUpperCase();
}

// Only an absolute https address or a path on this site is loaded as a portrait. Anything
// else, and any portrait that fails to load, shows the local initials instead of an empty
// circle; no third-party avatar service is asked for a stand-in.
function usableAvatar(avatar?: string): string | null {
  const value = avatar?.trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return /^https:\/\/[^\s]+$/i.test(value) ? value : null;
}

function AuthorAvatar({ name, avatar }: { name: string; avatar?: string }) {
  const [failed, setFailed] = useState(false);
  const src = usableAvatar(avatar);
  const initials = authorInitials(name);
  // The name is printed right beside the avatar, so the image itself stays silent for
  // screen readers instead of announcing the author twice.
  if (src && !failed) {
    return (
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-amber-50 md:h-20 md:w-20">
        <Image
          src={src}
          alt=""
          width={80}
          height={80}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
    );
  }
  return (
    <div
      aria-hidden="true"
      data-testid="author-avatar-fallback"
      className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-lg font-bold tracking-wide text-white md:h-20 md:w-20 md:text-xl"
    >
      {initials ? <span>{initials}</span> : <User className="h-7 w-7" />}
    </div>
  );
}

export function AuthorCard({ author }: { author: AuthorProfile }) {
  if (!author) return null;
  const authorSlug = getAuthorRouteSlug(author);
  const authorPath = authorSlug ? `/author/${authorSlug}` : null;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <AuthorAvatar name={author.name} avatar={author.avatar} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <h4 className="text-lg font-semibold text-slate-900">
              {authorPath ? (
                <Link href={authorPath} className="hover:text-amber-700 hover:underline">
                  {author.name}
                </Link>
              ) : (
                author.name
              )}
            </h4>
            {author.role && <div className="mt-1 text-xs text-slate-500">{author.role}</div>}
          </div>
          {author.postsCount ? <div className="text-xs text-slate-500">{author.postsCount} posts</div> : null}
        </div>

        {author.bio && <p className="mt-3 text-sm leading-relaxed text-slate-600">{author.bio}</p>}

        {(author.twitter || author.facebook || author.website) && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {author.twitter && (
              <a href={author.twitter} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-sky-600 hover:underline">
                <Twitter className="h-4 w-4" /> Twitter
              </a>
            )}
            {author.facebook && (
              <a href={author.facebook} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-blue-600 hover:underline">
                <Facebook className="h-4 w-4" /> Facebook
              </a>
            )}
            {author.website && (
              <a href={author.website} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-amber-600 hover:underline">
                Visit site <ArrowRight className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {/* Article pages offer no per-author mailbox: the stored article carries no author
            address, and an empty mailto opened a blank email. The author page lists the
            rest of their work; site contact stays in the footer. */}
        {authorPath ? (
          <div className="mt-4">
            <Link href={authorPath} className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
              More articles <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
