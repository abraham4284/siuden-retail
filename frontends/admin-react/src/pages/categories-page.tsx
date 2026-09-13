import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  FolderOpen,
  FolderPlus,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { EmptyState, PageHeader, QueryState } from "@/components/shared";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Category } from "@/domain/types";
import { useCategoriesQuery, useCategoryMutations, usePermission } from "@/hooks/use-services";
import { formatNumber } from "@/lib/format";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Ingresá un nombre de al menos 2 caracteres."),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usá minúsculas, números y guiones."),
  description: z.string(),
  parentId: z.string(),
  isVisible: z.boolean(),
});

type CategoryValues = z.infer<typeof categorySchema>;
type EditorState = { category: Category | null; parentId: string | null } | null;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-AR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function descendantIds(categories: Category[], categoryId: string): Set<string> {
  const result = new Set<string>();
  const visit = (id: string) => {
    categories.filter((category) => category.parentId === id).forEach((child) => {
      result.add(child.id);
      visit(child.id);
    });
  };
  visit(categoryId);
  return result;
}

function CategoryEditor({
  state,
  categories,
  onClose,
}: {
  state: EditorState;
  categories: Category[];
  onClose: () => void;
}) {
  const mutations = useCategoryMutations();
  const form = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", slug: "", description: "", parentId: "", isVisible: true },
  });
  const category = state?.category ?? null;
  const isVisible = useWatch({ control: form.control, name: "isVisible" });
  const blockedParents = useMemo(
    () => category ? new Set([category.id, ...descendantIds(categories, category.id)]) : new Set<string>(),
    [categories, category],
  );

  useEffect(() => {
    if (!state) return;
    form.reset({
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
      parentId: category?.parentId ?? state.parentId ?? "",
      isVisible: category?.isVisible ?? true,
    });
  }, [category, form, state]);

  const saving = mutations.create.isPending || mutations.update.isPending;
  const submit = form.handleSubmit(async (values) => {
    const input = {
      name: values.name,
      slug: values.slug,
      description: values.description,
      parentId: values.parentId || null,
      isVisible: values.isVisible,
    };
    if (category) await mutations.update.mutateAsync({ id: category.id, input });
    else await mutations.create.mutateAsync(input);
    onClose();
  });

  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoría" : state?.parentId ? "Nueva subcategoría" : "Nueva categoría"}</DialogTitle>
          <DialogDescription>Organizá el catálogo en una jerarquía clara para el equipo y la tienda.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="category-name">Nombre</Label>
            <Input
              id="category-name"
              autoFocus
              aria-invalid={Boolean(form.formState.errors.name)}
              {...form.register("name", {
                onChange: (event) => {
                  if (!category && !form.formState.dirtyFields.slug) {
                    form.setValue("slug", slugify((event.target as HTMLInputElement).value), { shouldValidate: true });
                  }
                },
              })}
            />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-slug">Slug</Label>
            <Input id="category-slug" aria-invalid={Boolean(form.formState.errors.slug)} {...form.register("slug")} />
            {form.formState.errors.slug && <p className="text-xs text-destructive">{form.formState.errors.slug.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-parent">Categoría superior</Label>
            <Select id="category-parent" {...form.register("parentId")}>
              <option value="">Sin categoría superior</option>
              {categories.map((candidate) => (
                <option key={candidate.id} value={candidate.id} disabled={blockedParents.has(candidate.id)}>
                  {candidate.name}{blockedParents.has(candidate.id) ? " · no disponible" : ""}
                </option>
              ))}
            </Select>
            <p className="text-xs text-muted-foreground">Una categoría nunca puede depender de sí misma ni de sus descendientes.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-description">Descripción opcional</Label>
            <Textarea id="category-description" rows={3} {...form.register("description")} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><p className="text-sm font-medium">Visible en el catálogo</p><p className="text-xs text-muted-foreground">Podés ocultarla sin eliminarla.</p></div>
            <Switch checked={isVisible} onCheckedChange={(checked) => form.setValue("isVisible", checked, { shouldDirty: true })} aria-label="Visible en el catálogo" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Guardando…" : category ? "Guardar cambios" : "Crear categoría"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryRow({
  category,
  depth,
  siblings,
  categories,
  canWrite,
  onEdit,
  onAddChild,
  onDelete,
}: {
  category: Category;
  depth: number;
  siblings: Category[];
  categories: Category[];
  canWrite: boolean;
  onEdit: (category: Category) => void;
  onAddChild: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  const mutations = useCategoryMutations();
  const children = categories
    .filter((item) => item.parentId === category.id)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  const sortedSiblings = [...siblings].sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  const index = sortedSiblings.findIndex((item) => item.id === category.id);
  const move = async (direction: -1 | 1) => {
    const other = sortedSiblings[index + direction];
    if (!other) return;
    await mutations.reorder.mutateAsync([
      { id: category.id, parentId: category.parentId, sortOrder: other.sortOrder },
      { id: other.id, parentId: other.parentId, sortOrder: category.sortOrder },
    ]);
  };

  return (
    <>
      <div className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-3 py-3 last:border-b-0 sm:px-4" style={{ paddingLeft: `${12 + depth * 24}px` }}>
        <div className="flex min-w-0 items-center gap-3">
          {depth > 0 && <ChevronRight className="size-3.5 shrink-0 text-slate-300" />}
          <span className={category.isVisible ? "grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" : "grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"}>
            {children.length ? <FolderOpen className="size-4" /> : <Tags className="size-4" />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{category.name}</p>{!category.isVisible && <Badge variant="neutral">Oculta</Badge>}</div>
            <p className="truncate text-xs text-muted-foreground">/{category.slug} · {formatNumber(category.productCount)} productos</p>
          </div>
        </div>
        {canWrite && (
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon-sm" onClick={() => void move(-1)} disabled={index <= 0 || mutations.reorder.isPending} aria-label={`Subir ${category.name}`}><ArrowUp /></Button>
            <Button variant="ghost" size="icon-sm" onClick={() => void move(1)} disabled={index >= sortedSiblings.length - 1 || mutations.reorder.isPending} aria-label={`Bajar ${category.name}`}><ArrowDown /></Button>
            <Switch checked={category.isVisible} onCheckedChange={(checked) => mutations.update.mutate({ id: category.id, input: { isVisible: checked } })} aria-label={`${category.isVisible ? "Ocultar" : "Mostrar"} ${category.name}`} className="mx-1 scale-90" />
            <Button variant="ghost" size="icon-sm" onClick={() => onAddChild(category)} aria-label={`Agregar subcategoría a ${category.name}`}><FolderPlus /></Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(category)} aria-label={`Editar ${category.name}`}><Pencil /></Button>
            <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => onDelete(category)} aria-label={`Eliminar ${category.name}`}><Trash2 /></Button>
          </div>
        )}
      </div>
      {children.map((child) => (
        <CategoryRow
          key={child.id}
          category={child}
          depth={depth + 1}
          siblings={children}
          categories={categories}
          canWrite={canWrite}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onDelete={onDelete}
        />
      ))}
    </>
  );
}

export function CategoriesPage() {
  const query = useCategoriesQuery();
  const mutations = useCategoryMutations();
  const canWrite = usePermission("categories.write");
  const [editor, setEditor] = useState<EditorState>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const categories = query.data ?? [];
  const roots = categories
    .filter((category) => category.parentId === null)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));

  return (
    <div className="page-shell">
      <PageHeader
        title="Categorías"
        description="Ordená el catálogo en niveles. Los productos siempre conservan una categoría principal."
        actions={canWrite && <Button onClick={() => setEditor({ category: null, parentId: null })}><Plus />Nueva categoría</Button>}
      />
      <QueryState
        isLoading={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => query.refetch()}
        isEmpty={categories.length === 0}
        emptyFallback={<EmptyState icon={Tags} title="Todavía no hay categorías" description="Creá una categoría raíz para organizar los productos." action={<Button onClick={() => setEditor({ category: null, parentId: null })}><Plus />Crear categoría</Button>} />}
      >
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground">
            <span>{categories.length} categorías en la jerarquía</span>
            <span>Las flechas reordenan dentro del mismo nivel</span>
          </div>
          <CardContent className="p-0">
            {roots.map((root) => (
              <CategoryRow
                key={root.id}
                category={root}
                depth={0}
                siblings={roots}
                categories={categories}
                canWrite={canWrite}
                onEdit={(category) => setEditor({ category, parentId: category.parentId })}
                onAddChild={(category) => setEditor({ category: null, parentId: category.id })}
                onDelete={setDeleteTarget}
              />
            ))}
          </CardContent>
        </Card>
      </QueryState>

      <CategoryEditor state={editor} categories={categories} onClose={() => setEditor(null)} />
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Sólo se puede eliminar una categoría sin productos ni subcategorías. La baja es lógica y no borra historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutations.remove.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutations.remove.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                void mutations.remove.mutateAsync(deleteTarget.id).then(() => setDeleteTarget(null));
              }}
            >
              {mutations.remove.isPending ? "Eliminando…" : "Eliminar categoría"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
