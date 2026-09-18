export interface BaseTreeItem {
  id: string;
  name: string;
  code?: string | null;
  parentId?: string | null;
}

export interface HierarchyOption<T extends BaseTreeItem> {
  item: T;
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  depth: number;
  path: string;
  formattedOptionLabel: string;
}

/**
 * Builds a hierarchical DFS-sorted list with depth and full breadcrumb path.
 * Ensures root nodes come first, followed immediately by their children in tree order,
 * sorted alphabetically by name at each level (Vietnamese locale-aware).
 */
export function buildHierarchyOptions<T extends BaseTreeItem>(
  items: T[],
  excludeIds?: Set<string> | string[]
): HierarchyOption<T>[] {
  if (!items || items.length === 0) return [];

  const excludeSet = new Set(excludeIds || []);
  const validItems = items.filter((item) => !excludeSet.has(item.id));
  const itemMap = new Map<string, T>(validItems.map((item) => [item.id, item]));

  // Build parent to children map
  const childrenMap = new Map<string | 'root', T[]>();

  validItems.forEach((item) => {
    const pId = item.parentId && itemMap.has(item.parentId) ? item.parentId : 'root';
    if (!childrenMap.has(pId)) {
      childrenMap.set(pId, []);
    }
    childrenMap.get(pId)!.push(item);
  });

  // Sort children alphabetically at each level using Vietnamese locale
  childrenMap.forEach((children) => {
    children.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base' }));
  });

  const result: HierarchyOption<T>[] = [];

  function traverse(node: T, depth: number, parentPath: string[]) {
    const currentPath = [...parentPath, node.name];
    const pathStr = currentPath.join(' → ');

    // Indentation with non-breaking spaces for standard HTML select elements
    const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(depth);
    const branchIcon = depth === 0 ? '📁 ' : '└─ 📦 ';
    const codeStr = node.code ? `[${node.code}] ` : '';

    // If depth > 0, include full path hint so user knows exactly which parent branch it belongs to
    const pathHint = depth > 0 ? `  (${pathStr})` : '';
    const formattedOptionLabel = `${indent}${branchIcon}${codeStr}${node.name}${pathHint}`;

    result.push({
      item: node,
      id: node.id,
      name: node.name,
      code: node.code || null,
      parentId: node.parentId || null,
      depth,
      path: pathStr,
      formattedOptionLabel,
    });

    const children = childrenMap.get(node.id) || [];
    for (const child of children) {
      traverse(child, depth + 1, currentPath);
    }
  }

  const rootItems = childrenMap.get('root') || [];
  for (const root of rootItems) {
    traverse(root, 0, []);
  }

  return result;
}

/**
 * Gets the full breadcrumb path string for an item ID from a list of items
 */
export function getLocationPathFromList<T extends BaseTreeItem>(
  locationId: string | null | undefined,
  items: T[]
): string {
  if (!locationId || !items || items.length === 0) return '';
  const itemMap = new Map<string, T>(items.map((i) => [i.id, i]));
  const pathSegments: string[] = [];
  let currentId: string | null | undefined = locationId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const loc = itemMap.get(currentId);
    if (!loc) break;
    pathSegments.unshift(loc.name);
    currentId = loc.parentId;
  }

  return pathSegments.join(' → ');
}
