// Finds reader-facing wording written straight into a component instead of
// coming from the message files. Used by the blog wording contract test.
import ts from 'typescript';

export interface HardCodedCopy {
  line: number;
  text: string;
  reason: string;
}

const HAS_LETTER = /\p{L}/u;
// Two words separated by a space: wording, not an identifier, a path or a class token.
const LOOKS_LIKE_WORDING = /\p{L}{2,}[.,!?:]? +\p{L}{2,}/u;
const WORDING_ATTRIBUTES = new Set(['placeholder', 'aria-label', 'alt', 'title', 'label', 'aria-description']);
// Calls whose text argument is not shown to a visitor.
const SILENT_CALLS = /^(console\.\w+|t|t\.rich|t\.markup|useTranslations|getTranslations|require|fetch|encodeURIComponent|window\.open)$/;
// Database query builders take field lists such as 'title slug excerpt'.
const QUERY_CALLS = /\.(select|populate|sort)$/;
const NOTICE_CALLS = /^(toast|toast\.\w+|alert|setError|Error)$/;

function literalText(node: ts.Node): string | null {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ');
  }
  return null;
}

function callName(node: ts.CallExpression | ts.NewExpression, source: ts.SourceFile): string {
  return node.expression.getText(source).replace(/\s+/g, '');
}

/** Walks up from a literal and says where its text ends up. */
function placement(node: ts.Node, source: ts.SourceFile): { kind: string; name?: string } {
  let current: ts.Node = node;
  while (current.parent) {
    const parent = current.parent;
    if (ts.isCallExpression(parent) || ts.isNewExpression(parent)) {
      if (parent.expression === current) return { kind: 'callee' };
      return { kind: 'call', name: callName(parent, source) };
    }
    if (ts.isJsxAttribute(parent)) return { kind: 'attribute', name: parent.name.getText(source) };
    if (ts.isJsxExpression(parent) && (ts.isJsxElement(parent.parent) || ts.isJsxFragment(parent.parent))) {
      const owner = parent.parent;
      const tag = ts.isJsxElement(owner) ? owner.openingElement.tagName.getText(source) : '';
      return { kind: tag === 'style' ? 'style' : 'child' };
    }
    if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return { kind: 'module' };
    if (ts.isTypeNode(parent) || ts.isLiteralTypeNode(parent)) return { kind: 'type' };
    if (ts.isPropertyAssignment(parent) && parent.name === current) return { kind: 'key' };
    if (ts.isElementAccessExpression(parent) && parent.argumentExpression === current) return { kind: 'key' };
    if (ts.isExpressionStatement(parent) && ts.isSourceFile(parent.parent)) return { kind: 'directive' };
    if (ts.isBinaryExpression(parent) && /^[=!]==?$/.test(parent.operatorToken.getText(source))) return { kind: 'comparison' };
    if (ts.isCaseClause(parent)) return { kind: 'comparison' };
    current = parent;
  }
  return { kind: 'statement' };
}

export function findHardCodedCopy(fileName: string, code: string): HardCodedCopy[] {
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: HardCodedCopy[] = [];
  const report = (node: ts.Node, text: string, reason: string) => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    found.push({ line: line + 1, text: text.trim().replace(/\s+/g, ' ').slice(0, 80), reason });
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const owner = node.parent;
      const tag = ts.isJsxElement(owner) ? owner.openingElement.tagName.getText(source) : '';
      if (tag !== 'style' && HAS_LETTER.test(node.text)) report(node, node.text, 'text between tags');
    } else {
      const text = literalText(node);
      if (text !== null && HAS_LETTER.test(text)) {
        const where = placement(node, source);
        if (where.kind === 'child') {
          report(node, text, 'text in a rendered expression');
        } else if (where.kind === 'attribute' && WORDING_ATTRIBUTES.has(where.name || '')) {
          report(node, text, `${where.name} attribute`);
        } else if (where.kind === 'call' && NOTICE_CALLS.test(where.name || '')) {
          report(node, text, `${where.name}() message`);
        } else if (
          LOOKS_LIKE_WORDING.test(text) &&
          !['module', 'type', 'key', 'directive', 'comparison', 'style', 'callee'].includes(where.kind) &&
          !(where.kind === 'attribute' && !WORDING_ATTRIBUTES.has(where.name || '')) &&
          !(where.kind === 'call' && (SILENT_CALLS.test(where.name || '') || QUERY_CALLS.test(where.name || '')))
        ) {
          report(node, text, 'wording in code');
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

export interface TranslationKeyUse {
  key: string;
  line: number;
}

/**
 * Every message key a file asks for, as a full path. Follows
 * `const t = useTranslations('ns')` / `await getTranslations({ namespace: 'ns' })`
 * inside each function; keys built at run time (a template) are skipped.
 */
export function findTranslationKeys(fileName: string, code: string): TranslationKeyUse[] {
  const source = ts.createSourceFile(fileName, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const uses: TranslationKeyUse[] = [];

  const namespaceOf = (init: ts.Expression | undefined): string | null => {
    let call = init;
    if (call && ts.isAwaitExpression(call)) call = call.expression;
    if (!call || !ts.isCallExpression(call)) return null;
    const name = call.expression.getText(source);
    const [arg] = call.arguments;
    if (name === 'useTranslations') return arg && ts.isStringLiteral(arg) ? arg.text : '';
    if (name === 'getTranslations' && arg && ts.isObjectLiteralExpression(arg)) {
      for (const prop of arg.properties) {
        if (ts.isPropertyAssignment(prop) && prop.name.getText(source) === 'namespace' && ts.isStringLiteral(prop.initializer)) {
          return prop.initializer.text;
        }
      }
      return '';
    }
    return null;
  };

  const keysIn = (node: ts.Expression): string[] => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return [node.text];
    if (ts.isConditionalExpression(node)) return [...keysIn(node.whenTrue), ...keysIn(node.whenFalse)];
    if (ts.isParenthesizedExpression(node)) return keysIn(node.expression);
    return [];
  };

  const walk = (node: ts.Node, scope: Map<string, string>) => {
    let current = scope;
    if (ts.isFunctionLike(node) || ts.isSourceFile(node)) current = new Map(scope);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const namespace = namespaceOf(node.initializer);
      if (namespace !== null) scope.set(node.name.text, namespace);
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const base = ts.isPropertyAccessExpression(callee) ? callee.expression : callee;
      if (ts.isIdentifier(base) && scope.has(base.text) && node.arguments.length > 0) {
        const namespace = scope.get(base.text)!;
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
        for (const key of keysIn(node.arguments[0])) {
          uses.push({ key: namespace ? `${namespace}.${key}` : key, line: line + 1 });
        }
      }
    }
    ts.forEachChild(node, (child) => walk(child, current));
  };
  walk(source, new Map());
  return uses;
}
