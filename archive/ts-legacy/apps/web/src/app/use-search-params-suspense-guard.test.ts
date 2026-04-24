import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const APP_DIR = path.resolve(__dirname);
const GUARD_TEST_FILE = normalize(__filename);
const TSX_TEST_REGEX = /\.(ts|tsx)$/;
const SUSPENSE_IMPORT_REGEX = /import\s+[^;]*\bSuspense\b[^;]*from\s+["']react["']/;
const REACT_NAMESPACE_IMPORT_REGEX = /import\s+\*\s+as\s+React\s+from\s+["']react["']/;
const SUSPENSE_USAGE_REGEX = /<(?:React\.)?Suspense\b/;

function walk(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".next") {
            continue;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...walk(fullPath));
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

function normalize(filePath: string): string {
    return filePath.replace(/\\/g, "/");
}

function createTsxSourceFile(fileName: string, source: string): ts.SourceFile {
    return ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function hasSuspenseImport(source: string): boolean {
    return SUSPENSE_IMPORT_REGEX.test(source) || REACT_NAMESPACE_IMPORT_REGEX.test(source);
}

function hasSuspenseOnDefaultExportPath(source: string): boolean {
    const defaultExportSnippet = getDefaultExportSnippet(source);
    return defaultExportSnippet ? SUSPENSE_USAGE_REGEX.test(defaultExportSnippet) : false;
}

function findNearestPageFile(filePath: string): string | null {
    let currentDir = path.dirname(filePath);

    while (normalize(currentDir).startsWith(normalize(APP_DIR))) {
        const candidate = normalize(path.join(currentDir, "page.tsx"));
        if (fs.existsSync(candidate)) {
            return candidate;
        }

        const parent = path.dirname(currentDir);
        if (parent === currentDir) {
            break;
        }

        currentDir = parent;
    }

    return null;
}

function getDefaultExportSnippet(source: string): string | null {
    const sourceFile = createTsxSourceFile("page.tsx", source);

    function resolveIdentifierDeclaration(name: string): ts.Node | null {
        for (const statement of sourceFile.statements) {
            if (ts.isFunctionDeclaration(statement) && statement.name?.text === name) {
                return statement;
            }
            if (ts.isVariableStatement(statement)) {
                for (const declaration of statement.declarationList.declarations) {
                    if (ts.isIdentifier(declaration.name) && declaration.name.text === name) {
                        return declaration;
                    }
                }
            }
        }
        return null;
    }

    for (const statement of sourceFile.statements) {
        if (
            ts.isFunctionDeclaration(statement)
            && statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
        ) {
            return source.slice(statement.getStart(sourceFile), statement.end);
        }

        if (ts.isExportAssignment(statement)) {
            if (ts.isIdentifier(statement.expression)) {
                const declaration = resolveIdentifierDeclaration(statement.expression.text);
                if (declaration) {
                    return source.slice(declaration.getStart(sourceFile), declaration.end);
                }
            }

            return source.slice(statement.getStart(sourceFile), statement.end);
        }
    }

    return null;
}

function usesSearchParamsHook(source: string): boolean {
    const sourceFile = createTsxSourceFile("route.tsx", source);
    const directHookIdentifiers = new Set<string>();
    const navigationNamespaces = new Set<string>();

    for (const statement of sourceFile.statements) {
        if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.getText(sourceFile) !== '"next/navigation"') {
            continue;
        }

        const clause = statement.importClause;
        if (!clause) {
            continue;
        }

        if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
            for (const element of clause.namedBindings.elements) {
                const importedName = (element.propertyName ?? element.name).text;
                if (importedName === "useSearchParams") {
                    directHookIdentifiers.add(element.name.text);
                }
            }
        }

        if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
            navigationNamespaces.add(clause.namedBindings.name.text);
        }
    }

    if (directHookIdentifiers.size === 0 && navigationNamespaces.size === 0) {
        return false;
    }

    let found = false;

    function visit(node: ts.Node): void {
        if (found) {
            return;
        }

        if (ts.isCallExpression(node)) {
            if (ts.isIdentifier(node.expression) && directHookIdentifiers.has(node.expression.text)) {
                found = true;
                return;
            }

            if (
                ts.isPropertyAccessExpression(node.expression)
                && ts.isIdentifier(node.expression.expression)
                && navigationNamespaces.has(node.expression.expression.text)
                && node.expression.name.text === "useSearchParams"
            ) {
                found = true;
                return;
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return found;
}

describe("App Router useSearchParams safety", () => {
    it("wraps route page default exports in Suspense when route files use useSearchParams", () => {
        const appSourceFiles = walk(APP_DIR)
            .map(normalize)
            .filter((file) => TSX_TEST_REGEX.test(file));

        const pageFilesToValidate = new Set<string>();

        for (const file of appSourceFiles) {
            if (file === GUARD_TEST_FILE) {
                continue;
            }

            const source = fs.readFileSync(file, "utf8");
            if (!usesSearchParamsHook(source)) {
                continue;
            }

            const nearestPage = findNearestPageFile(file);
            if (nearestPage) {
                pageFilesToValidate.add(nearestPage);
            }
        }

        const offenders: string[] = [];

        for (const file of pageFilesToValidate) {
            const source = fs.readFileSync(file, "utf8");

            if (!hasSuspenseImport(source) || !hasSuspenseOnDefaultExportPath(source)) {
                offenders.push(file);
            }
        }

        expect(
            offenders,
            `Route pages without Suspense on default export path while route files use useSearchParams: ${JSON.stringify(offenders, null, 2)}`,
        ).toEqual([]);
    });
});
