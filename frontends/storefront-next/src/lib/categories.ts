import type { StoreCategory } from "@/types/storefront";

export type CategoryNode = StoreCategory & { children: CategoryNode[] };

const bySortOrder = (a: StoreCategory, b: StoreCategory) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es");

export const getCategoryTree = (categories: StoreCategory[]): CategoryNode[] => {
  const nodes = new Map<string, CategoryNode>(
    categories.map((category) => [category.id, { ...category, children: [] }]),
  );
  const roots: CategoryNode[] = [];

  nodes.forEach((node) => {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortNodes = (items: CategoryNode[]) => {
    items.sort(bySortOrder);
    items.forEach((item) => sortNodes(item.children));
  };

  sortNodes(roots);
  return roots;
};

export const getCategoryTrail = (
  category: StoreCategory,
  categories: StoreCategory[],
): StoreCategory[] => {
  const byId = new Map(categories.map((candidate) => [candidate.id, candidate]));
  const trail: StoreCategory[] = [category];
  let parentId = category.parentId;

  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) break;
    trail.unshift(parent);
    parentId = parent.parentId;
  }

  return trail;
};

const getOwnRouteSegment = (category: StoreCategory, parent?: StoreCategory) => {
  const parentPrefix = parent ? `${parent.slug}-` : "";
  return parentPrefix && category.slug.startsWith(parentPrefix)
    ? category.slug.slice(parentPrefix.length)
    : category.slug;
};

export const getCategoryRouteSegments = (
  category: StoreCategory,
  categories: StoreCategory[],
) => {
  const trail = getCategoryTrail(category, categories);
  return trail.map((item, index) => getOwnRouteSegment(item, trail[index - 1]));
};

export const getCategoryHref = (
  category: StoreCategory,
  categories: StoreCategory[],
  basePath = "",
) => `${basePath}/${getCategoryRouteSegments(category, categories).join("/")}/`;

export const findCategoryByRoute = (
  routeSegments: string[],
  categories: StoreCategory[],
) => {
  const route = routeSegments.join("/");
  return categories.find(
    (category) => getCategoryRouteSegments(category, categories).join("/") === route,
  );
};

export const getCategoryAndDescendantIds = (
  category: StoreCategory,
  categories: StoreCategory[],
) => {
  const ids = new Set<string>([category.id]);
  let changed = true;

  while (changed) {
    changed = false;
    categories.forEach((candidate) => {
      if (candidate.parentId && ids.has(candidate.parentId) && !ids.has(candidate.id)) {
        ids.add(candidate.id);
        changed = true;
      }
    });
  }

  return ids;
};
