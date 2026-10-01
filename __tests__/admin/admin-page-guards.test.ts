/**
 * Layout-only authorization regression guard (PLATFORM #132/#133 class).
 *
 * Next renders a layout and its page in parallel. The admin layout is a client
 * shell that shows the sign-in form to a signed-out browser, but a server
 * `page.tsx` that reads the database has already streamed that data into the
 * response by then — `curl` received the full blog list and unpublished
 * destinations from the dashboard host with no cookie at all.
 *
 * Rule enforced here, for every route file under app/admin:
 *   - a server page that can reach the database (directly or through any
 *     server module it imports) must make `authorizeAdminPage(...)` its first
 *     statement and return before anything else when access is not granted;
 *   - layouts and other route files must not reach the database at all;
 *   - client components ('use client') are leaves: they reach data only
 *     through the guarded admin APIs.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const ADMIN_DIR = path.join(ROOT, 'app/admin');
const ROUTE_FILE = /^(page|layout|template|loading|error|not-found|default)\.(t|j)sx?$/;

// Anything that reads the database on the server.
const DATA_SPECIFIERS = [
  /^mongoose$/,
  /^mongodb$/,
  /^@\/lib\/dbConnect$/,
  /^@\/lib\/models(\/|$)/,
];

function readSource(file: string): string {
  return fs.readFileSync(file, 'utf8');
}

function isClientModule(source: string): boolean {
  return /^(?:\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/)*\s*['"]use client['"]/.test(source);
}

function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const staticImport = /(?:^|\n)\s*(import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(staticImport)) {
    if (match[2]) continue; // type-only imports never run
    specifiers.push(match[3]);
  }
  for (const match of source.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function resolveLocal(fromFile: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith('@/')) base = path.join(ROOT, specifier.slice(2));
  else if (specifier.startsWith('.')) base = path.resolve(path.dirname(fromFile), specifier);
  else return null;
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

const reachCache = new Map<string, boolean>();

/** True when rendering this server module can read the database. */
function reachesData(file: string, stack = new Set<string>()): boolean {
  if (reachCache.has(file)) return reachCache.get(file)!;
  if (stack.has(file)) return false;
  stack.add(file);
  const source = readSource(file);
  let result = false;
  if (!isClientModule(source)) {
    for (const specifier of importSpecifiers(source)) {
      if (DATA_SPECIFIERS.some((pattern) => pattern.test(specifier))) {
        result = true;
        break;
      }
      const local = resolveLocal(file, specifier);
      if (local && /\.(t|j)sx?$/.test(local) && reachesData(local, stack)) {
        result = true;
        break;
      }
    }
  }
  stack.delete(file);
  reachCache.set(file, result);
  return result;
}

function adminRouteFiles(dir = ADMIN_DIR): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return adminRouteFiles(full);
    return ROUTE_FILE.test(entry.name) ? [full] : [];
  });
}

function defaultExportBody(source: string): string | null {
  const start = source.search(/export\s+default\s+(async\s+)?function\b/);
  if (start < 0) return null;
  const open = source.indexOf('{', source.indexOf(')', start));
  return open < 0 ? null : source.slice(open + 1);
}

const relative = (file: string) => path.relative(ADMIN_DIR, file);
const routeFiles = adminRouteFiles();
const serverRouteFiles = routeFiles.filter((file) => !isClientModule(readSource(file)));
const dataPages = serverRouteFiles.filter(
  (file) => /^page\./.test(path.basename(file)) && reachesData(file),
);

describe('admin server pages authorize before reading data', () => {
  it('finds the server-rendered admin pages that read data (fails loudly if detection breaks)', () => {
    expect(routeFiles.length).toBeGreaterThan(20);
    expect(dataPages.map(relative).sort()).toEqual(['blog/page.tsx', 'destinations/page.tsx']);
  });

  it.each(dataPages.map((file) => [relative(file), file]))(
    '%s makes authorizeAdminPage() its first statement',
    (_label, file) => {
      const source = readSource(file);
      expect(source).toContain("from '@/lib/auth/adminPageAccess'");
      expect(source).not.toMatch(/export\s+(async\s+)?function\s+generateMetadata/);
      expect(source).toMatch(/export\s+const\s+dynamic\s*=\s*'force-dynamic'/);

      const body = defaultExportBody(source);
      expect(body).not.toBeNull();
      const statements = body!.replace(/^\s*(\/\/[^\n]*\n\s*)*/, '');
      expect(statements).toMatch(/^const\s+(\w+)\s*=\s*await\s+authorizeAdminPage\(/);

      const accessName = statements.match(/^const\s+(\w+)/)![1];
      const firstAwait = statements.indexOf('await');
      const secondAwait = statements.indexOf('await', firstAwait + 1);
      const beforeNextAwait = secondAwait < 0 ? statements : statements.slice(0, secondAwait);
      expect(beforeNextAwait).toMatch(
        new RegExp(`if\\s*\\(\\s*!${accessName}\\.granted\\s*\\)\\s*\\{?\\s*return\\b`),
      );
    },
  );

  it.each(
    serverRouteFiles
      .filter((file) => !/^page\./.test(path.basename(file)))
      .map((file) => [relative(file), file]),
  )('%s (layout or special file) never reads data', (_label, file) => {
    expect(reachesData(file)).toBe(false);
  });

  it('the detector sees a direct model import as a data read', () => {
    const probe = path.join(ROOT, 'app/admin/blog/page.tsx');
    expect(importSpecifiers(readSource(probe))).toEqual(
      expect.arrayContaining(['@/lib/dbConnect', '@/lib/models/Blog']),
    );
    expect(reachesData(probe)).toBe(true);
  });

  it('the detector treats client components as leaves', () => {
    const probe = path.join(ROOT, 'app/admin/AdminClientLayout.tsx');
    expect(isClientModule(readSource(probe))).toBe(true);
    expect(reachesData(probe)).toBe(false);
  });

  it('the category id route reads nothing and forwards to the editor', () => {
    const source = readSource(path.join(ADMIN_DIR, 'categories/[id]/page.tsx'));
    expect(source).not.toMatch(/dbConnect|@\/lib\/models|findById/);
    expect(source).toContain('/edit');
  });
});
