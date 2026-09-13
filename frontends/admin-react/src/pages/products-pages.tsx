import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Archive,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Copy,
  DollarSign,
  EllipsisVertical,
  Eye,
  EyeOff,
  ImagePlus,
  Images,
  Layers3,
  LoaderCircle,
  Package,
  PackagePlus,
  Pencil,
  Plus,
  Save,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useFieldArray, useForm, useWatch, type Control, type UseFormRegister } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

import { EmptyState, PageHeader, QueryState, SearchInput, StatusBadge } from "@/components/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Category, Product, ProductDimensions, ProductStatus } from "@/domain/types";
import {
  errorMessage,
  useCategoriesQuery,
  useCreateProductMutation,
  useInventoryQuery,
  usePermission,
  usePriceAdjustmentMutations,
  useProductActionMutations,
  useProductQuery,
  useProductsQuery,
  useUpdateProductMutation,
} from "@/hooks/use-services";
import { formatCurrency, formatNumber } from "@/lib/format";
import type {
  BulkPriceAdjustmentInput,
  CreateProductInput,
  ProductFilters,
  ProductImageInput,
  ProductOptionInput,
  ProductVariantInput,
} from "@/services/contracts";

const PAGE_SIZE = 10;
const MAX_IMAGES = 20;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function draftId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-AR");
}

function slugify(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function nullable(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function numberOrNull(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function productPrice(product: Product): { current: number | null; compare: number | null } {
  const variant =
    product.variants.find((candidate) => candidate.isDefault && candidate.enabled) ??
    product.variants.find((candidate) => candidate.enabled) ??
    product.variants[0];
  return { current: variant?.price ?? null, compare: variant?.compareAtPrice ?? null };
}

function primaryCategory(product: Product, categories: Category[]): string {
  const primaryId = product.categoryAssignments.find((assignment) => assignment.isPrimary)?.categoryId;
  return categories.find((category) => category.id === primaryId)?.name ?? "Sin categoría";
}

function publicProductUrl(slug: string): string {
  return new URL(`/productos/${slug}`, "https://rubi.siuden.com").toString();
}

export function ProductsPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<ProductStatus | "ALL">("ALL");
  const [stock, setStock] = useState<NonNullable<ProductFilters["stock"]>>("ALL");
  const [sort, setSort] = useState<NonNullable<ProductFilters["sort"]>>("NEWEST");
  const [page, setPage] = useState(1);
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);
  const categories = useCategoriesQuery();
  const inventory = useInventoryQuery({ pageSize: 100 });
  const canWrite = usePermission("products.write");
  const actions = useProductActionMutations();
  const products = useProductsQuery({
    search: search || undefined,
    categoryId: categoryId || undefined,
    status,
    stock,
    sort,
    page,
    pageSize: PAGE_SIZE,
  });

  const inventoryByProduct = useMemo(() => {
    const map = new Map<string, number>();
    inventory.data?.items.forEach((item) => {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.available);
    });
    return map;
  }, [inventory.data]);

  const copyLink = async (product: Product) => {
    try {
      await navigator.clipboard.writeText(publicProductUrl(product.slug));
      toast.success("Enlace público copiado");
    } catch {
      toast.error("No pudimos copiar el enlace. Intentá nuevamente.");
    }
  };

  return (
    <div className="page-shell">
      <PageHeader
        title="Productos"
        description="Administrá el catálogo, sus variantes, precios y publicación. El stock se consulta por separado."
        actions={
          canWrite ? (
            <>
              <Button variant="outline" asChild>
                <Link to="/products/price-adjustment">
                  <DollarSign /> Actualizar precios
                </Link>
              </Button>
              <Button asChild>
                <Link to="/products/new">
                  <PackagePlus /> Nuevo producto
                </Link>
              </Button>
            </>
          ) : null
        }
      />

      <Card>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(240px,1fr)_170px_150px_150px_170px]">
          <SearchInput
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            onClear={() => { setSearch(""); setPage(1); }}
            placeholder="Buscar por nombre o SKU…"
          />
          <Select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }} aria-label="Categoría">
            <option value="">Todas las categorías</option>
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(event) => { setStatus(event.target.value as ProductStatus | "ALL"); setPage(1); }} aria-label="Publicación">
            <option value="ALL">Todos los estados</option>
            <option value="PUBLISHED">Publicados</option>
            <option value="DRAFT">Borradores</option>
            <option value="ARCHIVED">Archivados</option>
          </Select>
          <Select value={stock} onChange={(event) => { setStock(event.target.value as NonNullable<ProductFilters["stock"]>); setPage(1); }} aria-label="Stock">
            <option value="ALL">Cualquier stock</option>
            <option value="IN_STOCK">Con stock</option>
            <option value="LOW_STOCK">Stock bajo</option>
            <option value="OUT_OF_STOCK">Sin stock</option>
            <option value="NOT_TRACKED">Sin seguimiento</option>
          </Select>
          <Select value={sort} onChange={(event) => { setSort(event.target.value as NonNullable<ProductFilters["sort"]>); setPage(1); }} aria-label="Orden">
            <option value="NEWEST">Más recientes</option>
            <option value="OLDEST">Más antiguos</option>
            <option value="NAME_ASC">Nombre A–Z</option>
            <option value="NAME_DESC">Nombre Z–A</option>
            <option value="PRICE_ASC">Menor precio</option>
            <option value="PRICE_DESC">Mayor precio</option>
          </Select>
        </CardContent>
      </Card>

      <QueryState
        isLoading={products.isPending || categories.isPending || inventory.isPending}
        isError={products.isError || categories.isError || inventory.isError}
        error={products.error ?? categories.error ?? inventory.error}
        onRetry={() => void Promise.all([products.refetch(), categories.refetch(), inventory.refetch()])}
        isEmpty={products.data?.items.length === 0}
        emptyFallback={
          <EmptyState
            icon={Package}
            title="No encontramos productos"
            description="Probá cambiando los filtros o creá el primer producto del catálogo."
            action={canWrite ? <Button asChild><Link to="/products/new"><Plus />Crear producto</Link></Button> : null}
          />
        }
      >
        <Card className="overflow-hidden">
          <Table className="min-w-[1050px]" scrollLabel="Listado de productos">
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Categoría principal</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead className="text-center">Variantes</TableHead>
                <TableHead className="text-right">Disponible</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.data?.items.map((product) => {
                const image = product.images.find((candidate) => candidate.isPrimary) ?? product.images[0];
                const defaultVariant = product.variants.find((variant) => variant.isDefault) ?? product.variants[0];
                const price = productPrice(product);
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
                          {image ? <img src={image.url} alt="" className="size-full object-cover" /> : <Package className="size-5 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <Link to={`/products/${product.id}/edit`} className="block max-w-64 truncate font-semibold hover:text-primary hover:underline">
                            {product.name}
                          </Link>
                          <p className="mt-0.5 max-w-64 truncate text-xs text-muted-foreground">/{product.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{primaryCategory(product, categories.data ?? [])}</TableCell>
                    <TableCell className="font-mono text-xs">{defaultVariant?.sku ?? "—"}</TableCell>
                    <TableCell>
                      <p className="font-semibold tabular-nums">{formatCurrency(price.current)}</p>
                      {price.compare !== null ? <p className="text-xs text-muted-foreground line-through">{formatCurrency(price.compare)}</p> : null}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{product.variants.length}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatNumber(inventoryByProduct.get(product.id) ?? 0)}</TableCell>
                    <TableCell><StatusBadge status={product.status} /></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`Acciones de ${product.name}`}>
                            <EllipsisVertical />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link to={`/products/${product.id}/edit`}><Pencil />Editar</Link></DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={!canWrite || actions.setStatus.isPending}
                            onSelect={() => actions.setStatus.mutate({ productId: product.id, status: product.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" })}
                          >
                            {product.status === "PUBLISHED" ? <EyeOff /> : <Eye />}
                            {product.status === "PUBLISHED" ? "Despublicar" : "Publicar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => void copyLink(product)}><Copy />Copiar enlace</DropdownMenuItem>
                          <DropdownMenuItem disabled={!canWrite || actions.duplicate.isPending} onSelect={() => actions.duplicate.mutate(product.id)}><Layers3 />Duplicar</DropdownMenuItem>
                          <DropdownMenuItem asChild><Link to={`/inventory?product=${product.id}`}><SlidersHorizontal />Ajustar stock</Link></DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem destructive disabled={!canWrite} onSelect={() => setArchiveTarget(product)}><Archive />Archivar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {products.data ? (
            <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <p className="text-muted-foreground">
                {products.data.total} {products.data.total === 1 ? "producto" : "productos"}
              </p>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="text-xs text-muted-foreground">Página {products.data.page} de {products.data.totalPages}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon-sm" aria-label="Página anterior" disabled={products.data.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft /></Button>
                  <Button variant="outline" size="icon-sm" aria-label="Página siguiente" disabled={products.data.page >= products.data.totalPages} onClick={() => setPage((current) => current + 1)}><ChevronRight /></Button>
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      </QueryState>

      <AlertDialog open={Boolean(archiveTarget)} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Archivar {archiveTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Dejará de aparecer en el catálogo y no podrá venderse. El historial de stock y ventas se conserva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actions.archive.isPending}>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actions.archive.isPending}
              onClick={() => {
                if (!archiveTarget) return;
                actions.archive.mutate(archiveTarget.id, { onSuccess: () => setArchiveTarget(null) });
              }}
            >
              {actions.archive.isPending ? "Archivando…" : "Archivar producto"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const nullableNonNegative = z.number().finite().min(0, "No puede ser negativo.").nullable();

const optionValueSchema = z.object({ id: z.string().min(1), value: z.string().trim().min(1, "Ingresá un valor."), sortOrder: z.number().int().min(0) });
const optionSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Ingresá el nombre de la opción."),
  sortOrder: z.number().int().min(0),
  values: z.array(optionValueSchema).min(1, "Agregá al menos un valor."),
});
const variantSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Ingresá un nombre."),
  sku: z.string(),
  barcode: z.string(),
  price: nullableNonNegative,
  compareAtPrice: nullableNonNegative,
  cost: nullableNonNegative,
  selectedOptionValueIds: z.array(z.string()),
  trackInventory: z.boolean(),
  allowBackorder: z.boolean(),
  isDefault: z.boolean(),
  enabled: z.boolean(),
  sortOrder: z.number().int().min(0),
  initialStock: nullableNonNegative,
  lowStockThreshold: nullableNonNegative,
  weightKg: nullableNonNegative,
  heightCm: nullableNonNegative,
  widthCm: nullableNonNegative,
  depthCm: nullableNonNegative,
});

const productFormSchema = z
  .object({
    name: z.string().trim().min(2, "Ingresá un nombre de al menos 2 caracteres."),
    slug: z.string().trim().min(1, "Ingresá un slug."),
    description: z.string(),
    seoTitle: z.string().max(255, "Usá hasta 255 caracteres."),
    seoDescription: z.string().max(500, "Usá hasta 500 caracteres."),
    sellingMode: z.enum(["DIRECT", "INQUIRY_ONLY"]),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    simpleProduct: z.boolean(),
    categoryIds: z.array(z.string()).min(1, "Elegí al menos una categoría."),
    primaryCategoryId: z.string().min(1, "Elegí la categoría principal."),
    options: z.array(optionSchema),
    variants: z.array(variantSchema).min(1, "Agregá al menos una variante."),
  })
  .superRefine((values, context) => {
    if (!values.categoryIds.includes(values.primaryCategoryId)) {
      context.addIssue({ code: "custom", path: ["primaryCategoryId"], message: "La categoría principal debe estar seleccionada." });
    }
    const skus = new Set<string>();
    values.variants.forEach((variant, index) => {
      const sku = normalizeText(variant.sku);
      if (sku && skus.has(sku)) context.addIssue({ code: "custom", path: ["variants", index, "sku"], message: "El SKU está repetido en este producto." });
      if (sku) skus.add(sku);
      if (values.sellingMode === "DIRECT" && variant.enabled && variant.price === null) {
        context.addIssue({ code: "custom", path: ["variants", index, "price"], message: "Ingresá un precio para venta directa." });
      }
      if (variant.price !== null && variant.compareAtPrice !== null && variant.compareAtPrice < variant.price) {
        context.addIssue({ code: "custom", path: ["variants", index, "compareAtPrice"], message: "Debe ser mayor o igual al precio actual." });
      }
    });
    if (values.simpleProduct) {
      if (values.variants.length !== 1 || values.options.length !== 0) {
        context.addIssue({ code: "custom", path: ["simpleProduct"], message: "Un producto simple debe tener una única variante." });
      }
      return;
    }
    if (values.options.length === 0) {
      context.addIssue({ code: "custom", path: ["options"], message: "Agregá al menos una opción." });
      return;
    }
    const optionByValue = new Map(values.options.flatMap((option) => option.values.map((value) => [value.id, option.id] as const)));
    const combinations = new Set<string>();
    values.variants.forEach((variant, index) => {
      const optionIds = variant.selectedOptionValueIds.map((valueId) => optionByValue.get(valueId));
      if (optionIds.length !== values.options.length || optionIds.some((optionId) => !optionId) || new Set(optionIds).size !== values.options.length) {
        context.addIssue({ code: "custom", path: ["variants", index, "selectedOptionValueIds"], message: "Seleccioná un valor para cada opción." });
      }
      const key = [...variant.selectedOptionValueIds].sort().join("|");
      if (combinations.has(key)) context.addIssue({ code: "custom", path: ["variants", index, "selectedOptionValueIds"], message: "Esta combinación ya existe." });
      combinations.add(key);
    });
  });

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ImageDraft {
  id?: string;
  productVariantId: string | null;
  mediaAssetId?: string;
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
}

function defaultVariant(): ProductFormValues["variants"][number] {
  return {
    id: draftId(),
    name: "Default",
    sku: "",
    barcode: "",
    price: null,
    compareAtPrice: null,
    cost: null,
    selectedOptionValueIds: [],
    trackInventory: true,
    allowBackorder: false,
    isDefault: true,
    enabled: true,
    sortOrder: 0,
    initialStock: 0,
    lowStockThreshold: null,
    weightKg: null,
    heightCm: null,
    widthCm: null,
    depthCm: null,
  };
}

const PRODUCT_DEFAULTS: ProductFormValues = {
  name: "",
  slug: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
  sellingMode: "DIRECT",
  status: "DRAFT",
  simpleProduct: true,
  categoryIds: [],
  primaryCategoryId: "",
  options: [],
  variants: [defaultVariant()],
};

function dimensionsFromForm(variant: ProductFormValues["variants"][number]): ProductDimensions {
  return {
    ...(variant.weightKg !== null ? { weightKg: variant.weightKg } : {}),
    ...(variant.heightCm !== null ? { heightCm: variant.heightCm } : {}),
    ...(variant.widthCm !== null ? { widthCm: variant.widthCm } : {}),
    ...(variant.depthCm !== null ? { depthCm: variant.depthCm } : {}),
  };
}

function useUnsavedProductWarning(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const interceptLinks = (event: MouseEvent) => {
      const element = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(element instanceof HTMLAnchorElement) || element.target === "_blank") return;
      const destination = new URL(element.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      if (!window.confirm("Tenés cambios sin guardar. ¿Querés salir igualmente?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", interceptLinks, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", interceptLinks, true);
    };
  }, [enabled]);
}

function SectionTitle({ icon: Icon, title, description }: { icon: typeof Package; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground"><Icon className="size-4.5" /></span>
      <div><CardTitle>{title}</CardTitle><p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p></div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs font-medium text-destructive" role="alert">{message}</p> : null;
}

function NumberField({
  id,
  label,
  name,
  register,
  error,
  step = "0.01",
  placeholder,
}: {
  id: string;
  label: string;
  name: Parameters<UseFormRegister<ProductFormValues>>[0];
  register: UseFormRegister<ProductFormValues>;
  error?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" min="0" step={step} placeholder={placeholder} aria-invalid={Boolean(error)} {...register(name, { setValueAs: numberOrNull })} />
      <FieldError message={error} />
    </div>
  );
}

function VariantDimensions({ control, register, index, name }: { control: Control<ProductFormValues>; register: UseFormRegister<ProductFormValues>; index: number; name: string }) {
  const variant = useWatch({ control, name: `variants.${index}` });
  return (
    <div className="rounded-lg border p-4">
      <p className="mb-4 text-sm font-semibold">{name || variant?.name || `Variante ${index + 1}`}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField id={`weight-${index}`} label="Peso (kg)" name={`variants.${index}.weightKg`} register={register} step="0.001" />
        <NumberField id={`height-${index}`} label="Alto (cm)" name={`variants.${index}.heightCm`} register={register} />
        <NumberField id={`width-${index}`} label="Ancho (cm)" name={`variants.${index}.widthCm`} register={register} />
        <NumberField id={`depth-${index}`} label="Profundidad (cm)" name={`variants.${index}.depthCm`} register={register} />
      </div>
    </div>
  );
}

export function ProductFormPage() {
  const { productId } = useParams<{ productId: string }>();
  const isEditing = Boolean(productId);
  const navigate = useNavigate();
  const canWrite = usePermission("products.write");
  const categories = useCategoriesQuery();
  const productQuery = useProductQuery(productId);
  const createProduct = useCreateProductMutation();
  const updateProduct = useUpdateProductMutation(productId ?? "");
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [imagesDirty, setImagesDirty] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const initializedProduct = useRef<string | null>(null);
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues: PRODUCT_DEFAULTS, mode: "onBlur" });
  const variantsArray = useFieldArray({ control: form.control, name: "variants", keyName: "fieldKey" });
  const simpleProduct = useWatch({ control: form.control, name: "simpleProduct" });
  const options = useWatch({ control: form.control, name: "options" });
  const variants = useWatch({ control: form.control, name: "variants" });
  const categoryIds = useWatch({ control: form.control, name: "categoryIds" });
  const primaryCategoryId = useWatch({ control: form.control, name: "primaryCategoryId" });
  const name = useWatch({ control: form.control, name: "name" });

  useEffect(() => {
    const product = productQuery.data;
    if (!isEditing || !product || initializedProduct.current === product.id) return;
    initializedProduct.current = product.id;
    form.reset({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      seoTitle: product.seoTitle ?? "",
      seoDescription: product.seoDescription ?? "",
      sellingMode: product.sellingMode,
      status: product.status,
      simpleProduct: product.options.length === 0,
      categoryIds: product.categoryAssignments.map((assignment) => assignment.categoryId),
      primaryCategoryId: product.categoryAssignments.find((assignment) => assignment.isPrimary)?.categoryId ?? "",
      options: product.options.map((option) => ({
        id: option.id,
        name: option.name,
        sortOrder: option.sortOrder,
        values: option.values.map((value) => ({ id: value.id, value: value.value, sortOrder: value.sortOrder })),
      })),
      variants: product.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku ?? "",
        barcode: variant.barcode ?? "",
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        cost: variant.cost,
        selectedOptionValueIds: variant.selectedOptionValueIds,
        trackInventory: variant.trackInventory,
        allowBackorder: variant.allowBackorder,
        isDefault: variant.isDefault,
        enabled: variant.enabled,
        sortOrder: variant.sortOrder,
        initialStock: null,
        lowStockThreshold: null,
        weightKg: variant.dimensions.weightKg ?? null,
        heightCm: variant.dimensions.heightCm ?? null,
        widthCm: variant.dimensions.widthCm ?? null,
        depthCm: variant.dimensions.depthCm ?? null,
      })),
    });
    setImages(product.images.map((image) => ({
      id: image.id,
      productVariantId: image.productVariantId,
      mediaAssetId: image.mediaAssetId,
      url: image.url,
      altText: image.altText ?? "",
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
    })));
    setImagesDirty(false);
  }, [form, isEditing, productQuery.data]);

  const hasUnsavedChanges = form.formState.isDirty || imagesDirty;
  useUnsavedProductWarning(hasUnsavedChanges && !createProduct.isPending && !updateProduct.isPending);

  const setOptions = (next: ProductFormValues["options"]) => {
    form.setValue("options", next, { shouldDirty: true, shouldValidate: true });
  };

  const toggleSimple = (checked: boolean) => {
    form.setValue("simpleProduct", checked, { shouldDirty: true, shouldValidate: false });
    if (checked) {
      form.setValue("options", [], { shouldDirty: true, shouldValidate: false });
      const first = form.getValues("variants.0") ?? defaultVariant();
      variantsArray.replace([{ ...first, id: first.id || draftId(), name: first.name || "Default", selectedOptionValueIds: [], isDefault: true, sortOrder: 0 }]);
    } else if (form.getValues("options").length === 0) {
      form.setValue("options", [{ id: draftId(), name: "Material", sortOrder: 0, values: [{ id: draftId(), value: "", sortOrder: 0 }] }], { shouldDirty: true, shouldValidate: false });
    }
  };

  const generateVariants = () => {
    const currentOptions = form.getValues("options");
    if (currentOptions.length === 0 || currentOptions.some((option) => option.values.length === 0 || option.values.some((value) => !value.value.trim()))) {
      toast.error("Completá las opciones y sus valores antes de generar combinaciones.");
      return;
    }
    const combinations = currentOptions.reduce<string[][]>(
      (accumulator, option) => accumulator.flatMap((combination) => option.values.map((value) => [...combination, value.id])),
      [[]],
    );
    const existing = new Map(form.getValues("variants").map((variant) => [[...variant.selectedOptionValueIds].sort().join("|"), variant] as const));
    const valueLabels = new Map(currentOptions.flatMap((option) => option.values.map((value) => [value.id, value.value] as const)));
    variantsArray.replace(combinations.map((combination, index) => {
      const key = [...combination].sort().join("|");
      const previous = existing.get(key);
      return previous ?? {
        ...defaultVariant(),
        id: draftId(),
        name: combination.map((id) => valueLabels.get(id)).filter(Boolean).join(" / "),
        selectedOptionValueIds: combination,
        isDefault: index === 0,
        initialStock: 0,
        sortOrder: index,
      };
    }));
    void form.trigger("variants");
  };

  const selectImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    const remaining = MAX_IMAGES - images.length;
    if (files.length > remaining) {
      setImageError(`Podés cargar hasta ${MAX_IMAGES} imágenes. Quedan ${remaining} lugares.`);
      return;
    }
    const invalid = files.find((file) => !IMAGE_TYPES.has(file.type) || file.size > MAX_IMAGE_BYTES);
    if (invalid) {
      setImageError(`${invalid.name}: usá JPG, PNG o WebP de hasta 10 MB.`);
      return;
    }
    setImageError(null);
    setImages((current) => [
      ...current,
      ...files.map((file, index): ImageDraft => ({
        url: URL.createObjectURL(file),
        altText: "",
        productVariantId: null,
        sortOrder: current.length + index,
        isPrimary: current.length === 0 && index === 0,
        originalName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      })),
    ]);
    setImagesDirty(true);
  };

  const updateImage = (index: number, patch: Partial<ImageDraft>) => {
    setImages((current) => current.map((image, imageIndex) => imageIndex === index ? { ...image, ...patch } : image));
    setImagesDirty(true);
  };

  const makePrimary = (index: number) => {
    setImages((current) => current.map((image, imageIndex) => ({ ...image, isPrimary: imageIndex === index })));
    setImagesDirty(true);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    setImages((current) => {
      const next = [...current];
      const first = next[index];
      const second = next[target];
      if (!first || !second) return current;
      next[index] = second;
      next[target] = first;
      return next.map((image, sortOrder) => ({ ...image, sortOrder }));
    });
    setImagesDirty(true);
  };

  const removeImage = (index: number) => {
    setImages((current) => {
      const removed = current[index];
      if (removed?.url.startsWith("blob:")) URL.revokeObjectURL(removed.url);
      const next = current.filter((_, imageIndex) => imageIndex !== index);
      if (removed?.isPrimary && next[0]) next[0] = { ...next[0], isPrimary: true };
      return next.map((image, sortOrder) => ({ ...image, sortOrder }));
    });
    setImagesDirty(true);
  };

  const submit = form.handleSubmit(async (values) => {
    const categoryAssignments = values.categoryIds.map((categoryId, sortOrder) => ({
      categoryId,
      isPrimary: categoryId === values.primaryCategoryId,
      sortOrder,
    }));
    const optionInput: ProductOptionInput[] = values.simpleProduct ? [] : values.options;
    const variantInput: ProductVariantInput[] = values.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: nullable(variant.sku),
      barcode: nullable(variant.barcode),
      price: variant.price,
      compareAtPrice: variant.compareAtPrice,
      cost: variant.cost,
      selectedOptionValueIds: values.simpleProduct ? [] : variant.selectedOptionValueIds,
      dimensions: dimensionsFromForm(variant),
      trackInventory: variant.trackInventory,
      allowBackorder: variant.allowBackorder,
      isDefault: values.simpleProduct ? true : variant.isDefault,
      enabled: variant.enabled,
      sortOrder: variant.sortOrder,
    }));
    const imageInput: ProductImageInput[] = images.map((image, sortOrder) => ({
      id: image.id,
      productVariantId: image.productVariantId,
      mediaAssetId: image.mediaAssetId,
      url: image.url,
      altText: nullable(image.altText),
      sortOrder,
      isPrimary: image.isPrimary,
      originalName: image.originalName,
      mimeType: image.mimeType,
      sizeBytes: image.sizeBytes,
    }));
    const core = {
      name: values.name,
      slug: values.slug,
      description: nullable(values.description),
      status: values.status,
      sellingMode: values.sellingMode,
      seoTitle: nullable(values.seoTitle),
      seoDescription: nullable(values.seoDescription),
      categoryAssignments,
      options: optionInput,
      images: imageInput,
      variants: variantInput,
    } satisfies Omit<CreateProductInput, "initialInventory">;
    try {
      if (isEditing && productId) {
        await updateProduct.mutateAsync(core);
        form.reset(values);
        setImagesDirty(false);
      } else {
        const created = await createProduct.mutateAsync({
          ...core,
          initialInventory: values.variants.flatMap((variant, variantIndex) =>
            variant.trackInventory && (variant.initialStock !== null || variant.lowStockThreshold !== null)
              ? [{
                  variantId: variant.id,
                  variantIndex,
                  onHand: variant.initialStock ?? 0,
                  lowStockThreshold: variant.lowStockThreshold,
                }]
              : [],
          ),
        });
        form.reset(values);
        setImagesDirty(false);
        navigate(`/products/${created.product.id}/edit`, { replace: true });
      }
    } catch {
      // Hooks report the service error and the form intentionally keeps its draft.
    }
  });

  const saving = createProduct.isPending || updateProduct.isPending;
  const mutationError = createProduct.error ?? updateProduct.error;
  const isLoading = categories.isPending || (isEditing && productQuery.isPending);
  const isError = categories.isError || (isEditing && productQuery.isError);

  return (
    <div className="page-shell pb-28">
      <PageHeader
        title={isEditing ? "Editar producto" : "Nuevo producto"}
        description="Separá catálogo, variantes e inventario para mantener una operación consistente."
        breadcrumbs={[{ label: "Productos", href: "/products" }, { label: isEditing ? "Editar" : "Nuevo" }]}
        actions={<Button variant="outline" asChild><Link to="/products"><ArrowLeft />Volver</Link></Button>}
      />
      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={categories.error ?? productQuery.error}
        onRetry={() => void Promise.all([categories.refetch(), ...(isEditing ? [productQuery.refetch()] : [])])}
      >
        <form className="space-y-6" onSubmit={submit} noValidate>
          <Card>
            <CardHeader><SectionTitle icon={Package} title="Información general" description="Nombre, URL y descripción pública del producto." /></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="product-name">Nombre</Label>
                  <Input
                    id="product-name"
                    autoFocus
                    aria-invalid={Boolean(form.formState.errors.name)}
                    {...form.register("name", {
                      onBlur: () => {
                        if (!form.getValues("slug")) form.setValue("slug", slugify(form.getValues("name")), { shouldDirty: true, shouldValidate: true });
                      },
                    })}
                  />
                  <FieldError message={form.formState.errors.name?.message} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3"><Label htmlFor="product-slug">Slug</Label><button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => form.setValue("slug", slugify(name), { shouldDirty: true, shouldValidate: true })}>Generar desde el nombre</button></div>
                  <Input id="product-slug" aria-invalid={Boolean(form.formState.errors.slug)} {...form.register("slug")} />
                  <FieldError message={form.formState.errors.slug?.message} />
                </div>
              </div>
              <div className="space-y-2"><Label htmlFor="description">Descripción</Label><Textarea id="description" rows={6} placeholder="Material, terminación, cuidados y detalles…" {...form.register("description")} /></div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="seo-title">Título SEO</Label><Input id="seo-title" {...form.register("seoTitle")} /><FieldError message={form.formState.errors.seoTitle?.message} /></div>
                <div className="space-y-2"><Label htmlFor="seo-description">Descripción SEO</Label><Input id="seo-description" {...form.register("seoDescription")} /><FieldError message={form.formState.errors.seoDescription?.message} /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><SectionTitle icon={Layers3} title="Categorías" description="Elegí una categoría principal y las asociaciones secundarias." /></CardHeader>
            <CardContent>
              <div className="grid max-h-80 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-3">
                {categories.data?.map((category) => {
                  const selected = categoryIds.includes(category.id);
                  return (
                    <div key={category.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                      <Checkbox
                        id={`category-${category.id}`}
                        checked={selected}
                        onChange={(event) => {
                          const next = event.target.checked ? [...categoryIds, category.id] : categoryIds.filter((id) => id !== category.id);
                          form.setValue("categoryIds", next, { shouldDirty: true, shouldValidate: true });
                          if (!event.target.checked && primaryCategoryId === category.id) form.setValue("primaryCategoryId", next[0] ?? "", { shouldDirty: true, shouldValidate: true });
                          if (event.target.checked && !primaryCategoryId) form.setValue("primaryCategoryId", category.id, { shouldDirty: true, shouldValidate: true });
                        }}
                      />
                      <Label htmlFor={`category-${category.id}`} className="min-w-0 flex-1 truncate">{category.name}</Label>
                      {selected ? (
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <input type="radio" name="primary-category" checked={primaryCategoryId === category.id} onChange={() => form.setValue("primaryCategoryId", category.id, { shouldDirty: true, shouldValidate: true })} /> Principal
                        </label>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <FieldError message={form.formState.errors.categoryIds?.message ?? form.formState.errors.primaryCategoryId?.message} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
              <SectionTitle icon={Images} title="Imágenes" description={`JPG, PNG o WebP, hasta ${MAX_IMAGES} imágenes de 10 MB.`} />
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm font-semibold shadow-sm hover:bg-accent">
                <Upload className="size-4" /> Cargar
                <input type="file" className="sr-only" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple onChange={selectImages} />
              </label>
            </CardHeader>
            <CardContent className="space-y-4">
              {imageError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{imageError}</p> : null}
              {images.length === 0 ? (
                <div className="grid min-h-40 place-items-center rounded-lg border border-dashed bg-muted/20 text-center"><div><ImagePlus className="mx-auto size-7 text-muted-foreground" /><p className="mt-2 text-sm font-medium">Todavía no cargaste imágenes</p><p className="mt-1 text-xs text-muted-foreground">La primera imagen será la principal.</p></div></div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {images.map((image, index) => (
                    <div key={image.id ?? image.url} className="overflow-hidden rounded-lg border bg-card">
                      <div className="relative aspect-[4/3] bg-muted"><img src={image.url} alt={image.altText} className="size-full object-cover" />{image.isPrimary ? <Badge className="absolute left-2 top-2">Principal</Badge> : null}</div>
                      <div className="space-y-3 p-3">
                        <div className="space-y-1.5"><Label htmlFor={`image-alt-${index}`}>Texto alternativo</Label><Input id={`image-alt-${index}`} value={image.altText} onChange={(event) => updateImage(index, { altText: event.target.value })} placeholder="Describí la imagen" /></div>
                        {!simpleProduct && variants.length > 0 ? (
                          <Select value={image.productVariantId ?? ""} onChange={(event) => updateImage(index, { productVariantId: event.target.value || null })} aria-label="Variante de la imagen"><option value="">Todo el producto</option>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</Select>
                        ) : null}
                        <div className="flex flex-wrap gap-1.5">
                          <Button type="button" size="sm" variant="outline" disabled={image.isPrimary} onClick={() => makePrimary(index)}>Principal</Button>
                          <Button type="button" size="icon-sm" variant="ghost" aria-label="Mover imagen arriba" disabled={index === 0} onClick={() => moveImage(index, -1)}><ArrowUp /></Button>
                          <Button type="button" size="icon-sm" variant="ghost" aria-label="Mover imagen abajo" disabled={index === images.length - 1} onClick={() => moveImage(index, 1)}><ArrowDown /></Button>
                          <Button type="button" size="icon-sm" variant="ghost" className="ml-auto text-destructive" aria-label="Eliminar imagen" onClick={() => removeImage(index)}><Trash2 /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle icon={Sparkles} title="Variantes y precios" description="Usá un producto simple o generá combinaciones a partir de opciones." />
                <div className="flex items-center gap-2"><Switch id="simple-product" checked={simpleProduct} onCheckedChange={toggleSimple} /><Label htmlFor="simple-product">Producto simple</Label></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!simpleProduct ? (
                <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">Opciones</p><p className="text-xs text-muted-foreground">Ej.: material, talle o color.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setOptions([...options, { id: draftId(), name: "", sortOrder: options.length, values: [{ id: draftId(), value: "", sortOrder: 0 }] }])}><Plus />Agregar opción</Button></div>
                  {options.map((option, optionIndex) => (
                    <div key={option.id} className="rounded-lg border bg-card p-4">
                      <div className="flex gap-2"><Input value={option.name} placeholder="Nombre de la opción" aria-label={`Nombre de opción ${optionIndex + 1}`} onChange={(event) => setOptions(options.map((item, index) => index === optionIndex ? { ...item, name: event.target.value } : item))} /><Button type="button" variant="ghost" size="icon" className="text-destructive" aria-label="Eliminar opción" onClick={() => setOptions(options.filter((_, index) => index !== optionIndex).map((item, index) => ({ ...item, sortOrder: index })))}><Trash2 /></Button></div>
                      <div className="mt-3 flex flex-wrap gap-2">{option.values.map((value, valueIndex) => <div key={value.id} className="flex items-center rounded-md border bg-background"><Input className="w-32 border-0 shadow-none" value={value.value} aria-label={`Valor ${valueIndex + 1} de ${option.name || "opción"}`} onChange={(event) => setOptions(options.map((item, index) => index === optionIndex ? { ...item, values: item.values.map((candidate, indexValue) => indexValue === valueIndex ? { ...candidate, value: event.target.value } : candidate) } : item))} /><button type="button" className="p-2 text-muted-foreground hover:text-destructive" aria-label="Eliminar valor" onClick={() => setOptions(options.map((item, index) => index === optionIndex ? { ...item, values: item.values.filter((_, indexValue) => indexValue !== valueIndex).map((candidate, nextIndex) => ({ ...candidate, sortOrder: nextIndex })) } : item))}><X className="size-3.5" /></button></div>)}<Button type="button" variant="ghost" size="sm" onClick={() => setOptions(options.map((item, index) => index === optionIndex ? { ...item, values: [...item.values, { id: draftId(), value: "", sortOrder: item.values.length }] } : item))}><Plus />Valor</Button></div>
                    </div>
                  ))}
                  <FieldError message={form.formState.errors.options?.message} />
                  <Button type="button" onClick={generateVariants}><Sparkles />Generar combinaciones</Button>
                </div>
              ) : null}

              <div className="space-y-4">
                {variantsArray.fields.map((field, index) => {
                  const variant = variants[index];
                  const variantError = form.formState.errors.variants?.[index];
                  return (
                    <div key={field.fieldKey} className="rounded-lg border p-4">
                      <div className="mb-4 flex items-center justify-between gap-3"><div><p className="font-semibold">{variant?.name || `Variante ${index + 1}`}</p>{!simpleProduct ? <p className="text-xs text-muted-foreground">{variant?.selectedOptionValueIds.map((id) => options.flatMap((option) => option.values).find((value) => value.id === id)?.value).filter(Boolean).join(" · ")}</p> : null}</div>{!simpleProduct && variantsArray.fields.length > 1 ? <Button type="button" variant="ghost" size="icon-sm" className="text-destructive" aria-label="Eliminar variante" onClick={() => variantsArray.remove(index)}><Trash2 /></Button> : null}</div>
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div className="space-y-2"><Label htmlFor={`variant-name-${index}`}>Nombre</Label><Input id={`variant-name-${index}`} {...form.register(`variants.${index}.name`)} /><FieldError message={variantError?.name?.message} /></div>
                        <div className="space-y-2"><Label htmlFor={`variant-sku-${index}`}>SKU</Label><Input id={`variant-sku-${index}`} {...form.register(`variants.${index}.sku`)} /><FieldError message={variantError?.sku?.message} /></div>
                        <div className="space-y-2"><Label htmlFor={`variant-barcode-${index}`}>Código de barras</Label><Input id={`variant-barcode-${index}`} {...form.register(`variants.${index}.barcode`)} /></div>
                        <NumberField id={`variant-price-${index}`} label="Precio" name={`variants.${index}.price`} register={form.register} error={variantError?.price?.message} />
                        <NumberField id={`variant-compare-${index}`} label="Precio anterior" name={`variants.${index}.compareAtPrice`} register={form.register} error={variantError?.compareAtPrice?.message} />
                        <NumberField id={`variant-cost-${index}`} label="Costo" name={`variants.${index}.cost`} register={form.register} />
                        <div className="flex flex-wrap items-center gap-4 pt-7 md:col-span-2">
                          <label className="flex items-center gap-2 text-sm"><Checkbox {...form.register(`variants.${index}.enabled`)} />Habilitada</label>
                          <label className="flex items-center gap-2 text-sm"><Checkbox {...form.register(`variants.${index}.trackInventory`)} />Controlar stock</label>
                          <label className="flex items-center gap-2 text-sm"><Checkbox {...form.register(`variants.${index}.allowBackorder`)} />Permitir reserva futura</label>
                        </div>
                      </div>
                      <FieldError message={variantError?.selectedOptionValueIds?.message} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><SectionTitle icon={Boxes} title="Inventario" description={isEditing ? "El saldo se modifica mediante movimientos trazables." : "La carga inicial crea saldos y un único movimiento INITIAL."} /></CardHeader>
            <CardContent className="space-y-4">
              {variantsArray.fields.map((field, index) => (
                <div key={field.fieldKey} className="grid gap-4 rounded-lg border p-4 sm:grid-cols-[minmax(160px,1fr)_180px_180px_auto] sm:items-end">
                  <div><p className="text-sm font-semibold">{variants[index]?.name || `Variante ${index + 1}`}</p><p className="text-xs text-muted-foreground">{variants[index]?.sku || "Sin SKU"}</p></div>
                  {isEditing ? <div className="sm:col-span-2"><p className="text-sm text-muted-foreground">Consultá el saldo físico, reservado y disponible en Inventario.</p></div> : <><NumberField id={`initial-stock-${index}`} label="Stock inicial" name={`variants.${index}.initialStock`} register={form.register} step="0.001" /><NumberField id={`threshold-${index}`} label="Umbral bajo" name={`variants.${index}.lowStockThreshold`} register={form.register} step="0.001" /></>}
                  <Button variant="outline" asChild><Link to={`/inventory?variant=${field.id}`}><SlidersHorizontal />{isEditing ? "Ajustar" : "Ver inventario"}</Link></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><SectionTitle icon={Boxes} title="Dimensiones" description="Peso y medidas pertenecen a cada variante." /></CardHeader>
            <CardContent className="space-y-4">{variantsArray.fields.map((field, index) => <VariantDimensions key={field.fieldKey} control={form.control} register={form.register} index={index} name={variants[index]?.name ?? ""} />)}</CardContent>
          </Card>

          <Card>
            <CardHeader><SectionTitle icon={Eye} title="Publicación" description="Definí cómo se vende y si está visible en la tienda." /></CardHeader>
            <CardContent className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="selling-mode">Modo de venta</Label><Select id="selling-mode" {...form.register("sellingMode")}><option value="DIRECT">Venta directa</option><option value="INQUIRY_ONLY">Consultar precio</option></Select></div>
              <div className="space-y-2"><Label htmlFor="product-status">Estado</Label><Select id="product-status" {...form.register("status")}><option value="DRAFT">Borrador</option><option value="PUBLISHED">Publicado</option><option value="ARCHIVED">Archivado</option></Select></div>
            </CardContent>
          </Card>

          {mutationError ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert"><p className="font-semibold">No pudimos guardar el producto</p><p className="mt-1">{errorMessage(mutationError)}</p><p className="mt-1 text-xs text-red-700">Si el problema es un SKU, recordá que debe ser único en todo el comercio.</p></div> : null}

          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-3 shadow-[0_-8px_28px_rgba(15,23,42,.08)] backdrop-blur md:left-64">
            <div className="mx-auto flex max-w-[1536px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{hasUnsavedChanges ? "Tenés cambios sin guardar." : "Todos los cambios están guardados."}</p>
              <div className="flex gap-2"><Button type="button" variant="outline" asChild><Link to="/products">Cancelar</Link></Button><Button type="submit" disabled={!canWrite || saving || (!hasUnsavedChanges && isEditing)}>{saving ? <LoaderCircle className="animate-spin" /> : <Save />}{saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear producto"}</Button></div>
            </div>
          </div>
        </form>
      </QueryState>
    </div>
  );
}

const priceAdjustmentSchema = z
  .object({
    categoryId: z.string(),
    percentage: z.number().finite().min(-100, "La reducción máxima es 100%.").max(1000, "Ingresá un porcentaje menor."),
    adjustPrice: z.boolean(),
    adjustCompareAtPrice: z.boolean(),
  })
  .refine((values) => values.adjustPrice || values.adjustCompareAtPrice, { message: "Seleccioná al menos un precio.", path: ["adjustPrice"] });

type PriceAdjustmentValues = z.infer<typeof priceAdjustmentSchema>;

export function PriceAdjustmentPage() {
  const categories = useCategoriesQuery();
  const mutations = usePriceAdjustmentMutations();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submittedInput, setSubmittedInput] = useState<BulkPriceAdjustmentInput | null>(null);
  const form = useForm<PriceAdjustmentValues>({
    resolver: zodResolver(priceAdjustmentSchema),
    defaultValues: { categoryId: "", percentage: 10, adjustPrice: true, adjustCompareAtPrice: false },
  });
  const clearPreview = () => {
    setSubmittedInput(null);
    mutations.preview.reset();
  };

  const toInput = (values: PriceAdjustmentValues): BulkPriceAdjustmentInput => ({
    filters: values.categoryId ? { categoryId: values.categoryId } : undefined,
    percentage: values.percentage,
    adjustPrice: values.adjustPrice,
    adjustCompareAtPrice: values.adjustCompareAtPrice,
  });
  const preview = form.handleSubmit(async (values) => {
    const input = toInput(values);
    setSubmittedInput(input);
    await mutations.preview.mutateAsync(input);
  });
  const apply = async () => {
    if (!submittedInput) return;
    await mutations.apply.mutateAsync(submittedInput);
    setConfirmOpen(false);
    mutations.preview.reset();
    setSubmittedInput(null);
  };
  const result = mutations.preview.data;

  return (
    <div className="page-shell">
      <PageHeader title="Actualización de precios" description="Aplicá un porcentaje a las variantes vendibles y revisá el resultado antes de confirmar." breadcrumbs={[{ label: "Productos", href: "/products" }, { label: "Actualización de precios" }]} actions={<Button variant="outline" asChild><Link to="/products"><ArrowLeft />Volver</Link></Button>} />
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader><CardTitle>Definir operación</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={preview}>
              <div className="space-y-2"><Label htmlFor="price-category">Alcance</Label><Select id="price-category" {...form.register("categoryId", { onChange: clearPreview })}><option value="">Todos los productos</option>{categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></div>
              <div className="space-y-2"><Label htmlFor="percentage">Porcentaje</Label><div className="relative"><Input id="percentage" type="number" step="0.1" className="pr-9" {...form.register("percentage", { valueAsNumber: true, onChange: clearPreview })} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span></div><FieldError message={form.formState.errors.percentage?.message} /><p className="text-xs text-muted-foreground">Usá un valor negativo para reducir precios.</p></div>
              <div className="space-y-3 rounded-lg border p-3"><label className="flex items-center gap-2 text-sm"><Checkbox {...form.register("adjustPrice", { onChange: clearPreview })} />Precio actual</label><label className="flex items-center gap-2 text-sm"><Checkbox {...form.register("adjustCompareAtPrice", { onChange: clearPreview })} />Precio anterior o de comparación</label><FieldError message={form.formState.errors.adjustPrice?.message} /></div>
              <Button type="submit" className="w-full" disabled={mutations.preview.isPending || categories.isPending}>{mutations.preview.isPending ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{mutations.preview.isPending ? "Calculando…" : "Generar vista previa"}</Button>
            </form>
          </CardContent>
        </Card>

        <QueryState isLoading={false} isError={mutations.preview.isError} error={mutations.preview.error}>
          {!result ? (
            <EmptyState icon={DollarSign} title="Prepará una vista previa" description="Elegí el alcance y el porcentaje. Nada cambia hasta que confirmes expresamente." />
          ) : result.affectedVariants === 0 ? (
            <EmptyState icon={Package} title="No hay variantes afectadas" description="Cambiá la categoría, los campos o el porcentaje de la operación." />
          ) : (
            <Card className="overflow-hidden">
              <CardHeader className="flex-row items-start justify-between gap-4 space-y-0"><div><CardTitle>Vista previa</CardTitle><p className="mt-1 text-sm text-muted-foreground">{result.affectedProducts} productos · {result.affectedVariants} variantes</p></div><Badge variant={submittedInput && submittedInput.percentage < 0 ? "warning" : "success"}>{submittedInput && submittedInput.percentage < 0 ? "Reducción" : "Aumento"} {Math.abs(submittedInput?.percentage ?? 0)}%</Badge></CardHeader>
              <Table className="min-w-[720px]"><TableHeader><TableRow><TableHead>Producto / variante</TableHead><TableHead className="text-right">Precio anterior</TableHead><TableHead className="text-right">Precio nuevo</TableHead><TableHead className="text-right">Comparación</TableHead></TableRow></TableHeader><TableBody>{result.preview.map((item) => <TableRow key={item.variantId}><TableCell><p className="font-medium">{item.productName}</p><p className="text-xs text-muted-foreground">{item.variantName}</p></TableCell><TableCell className="text-right tabular-nums">{formatCurrency(item.previousPrice)}</TableCell><TableCell className="text-right font-semibold tabular-nums text-primary">{formatCurrency(item.nextPrice)}</TableCell><TableCell className="text-right tabular-nums">{formatCurrency(item.previousCompareAtPrice)} → {formatCurrency(item.nextCompareAtPrice)}</TableCell></TableRow>)}</TableBody></Table>
              <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Se muestran hasta 10 ejemplos. La operación incluye todas las variantes indicadas.</p><Button onClick={() => setConfirmOpen(true)} disabled={mutations.apply.isPending}><DollarSign />Aplicar actualización</Button></div>
            </Card>
          )}
        </QueryState>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Confirmar actualización masiva?</AlertDialogTitle><AlertDialogDescription>Se modificarán {result?.affectedVariants ?? 0} variantes de {result?.affectedProducts ?? 0} productos. Revisá la vista previa antes de continuar.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={mutations.apply.isPending}>Volver a revisar</AlertDialogCancel><AlertDialogAction disabled={mutations.apply.isPending} onClick={(event) => { event.preventDefault(); void apply(); }}>{mutations.apply.isPending ? "Actualizando…" : "Sí, actualizar precios"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
