import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ExternalLink,
  AtSign,
  Globe2,
  LoaderCircle,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Palette,
  Save,
  Smartphone,
  Store,
  UsersRound,
} from "lucide-react";
import { Controller, useForm, useWatch, type Control } from "react-hook-form";
import { z } from "zod";

import { PageHeader, QueryState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RUBI_BRAND_CONTENT } from "@/content/rubi";
import {
  errorMessage,
  useSessionQuery,
  useStoreMutations,
  useStoreQueries,
} from "@/hooks/use-services";
import type { StoreContactChannelInput } from "@/services/contracts";

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Ingresá un email válido.",
  });

const optionalHttpUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || /^https?:\/\/\S+$/i.test(value), {
    message: "Ingresá una URL completa que comience con http:// o https://.",
  });

const hexColor = z
  .string()
  .trim()
  .regex(/^#[0-9a-f]{6}$/i, "Usá un color hexadecimal de seis dígitos.");

const storeSettingsSchema = z
  .object({
    brandName: z.string().trim().min(2, "Ingresá el nombre comercial."),
    contactEmail: optionalEmail,
    phone: z.string().trim().max(40, "El teléfono es demasiado largo."),
    addressLine: z.string().trim().max(120, "La dirección es demasiado larga."),
    addressNumber: z.string().trim().max(20, "El número es demasiado largo."),
    city: z.string().trim().max(80, "La ciudad es demasiado larga."),
    province: z.string().trim().max(80, "La provincia es demasiado larga."),
    postalCode: z.string().trim().max(16, "El código postal es demasiado largo."),
    primaryColor: hexColor,
    secondaryColor: hexColor,
    backgroundColor: hexColor,
    textColor: hexColor,
    headingFont: z.string().min(1),
    bodyFont: z.string().min(1),
    borderRadius: z.string().min(1),
    announcementEnabled: z.boolean(),
    announcementText: z.string().trim().max(120, "El mensaje admite hasta 120 caracteres."),
    announcementUrl: optionalHttpUrl,
    isPublished: z.boolean(),
    showPrices: z.boolean(),
    defaultCatalogSort: z.enum([
      "FEATURED",
      "NEWEST",
      "PRICE_ASC",
      "PRICE_DESC",
      "NAME_ASC",
    ]),
    catalogColumnsDesktop: z.number().int().min(2).max(4),
  })
  .superRefine((values, context) => {
    if (values.announcementEnabled && !values.announcementText) {
      context.addIssue({
        code: "custom",
        path: ["announcementText"],
        message: "Escribí el mensaje que se mostrará en la tienda.",
      });
    }
  });

type StoreSettingsValues = z.infer<typeof storeSettingsSchema>;

const DEFAULT_STORE_VALUES: StoreSettingsValues = {
  brandName: "",
  contactEmail: "",
  phone: "",
  addressLine: "",
  addressNumber: "",
  city: "",
  province: "",
  postalCode: "",
  primaryColor: "#74263A",
  secondaryColor: "#312A2B",
  backgroundColor: "#F8F6F1",
  textColor: "#292526",
  headingFont: "Merriweather",
  bodyFont: "Lora",
  borderRadius: "0rem",
  announcementEnabled: true,
  announcementText: "",
  announcementUrl: "",
  isPublished: true,
  showPrices: true,
  defaultCatalogSort: "FEATURED",
  catalogColumnsDesktop: 4,
};

const contactSettingsSchema = z
  .object({
    whatsapp: z.string().trim(),
    whatsappEnabled: z.boolean(),
    instagram: z.string().trim(),
    instagramEnabled: z.boolean(),
    facebook: z.string().trim(),
    facebookEnabled: z.boolean(),
    contactFormEnabled: z.boolean(),
  })
  .superRefine((values, context) => {
    const whatsappDigits = argentinaLocalDigits(values.whatsapp);
    if (values.whatsapp && whatsappDigits.length !== 10) {
      context.addIssue({
        code: "custom",
        path: ["whatsapp"],
        message: "Ingresá un celular argentino con código de área y diez dígitos.",
      });
    }
    if (values.whatsappEnabled && !values.whatsapp) {
      context.addIssue({
        code: "custom",
        path: ["whatsapp"],
        message: "Ingresá un número antes de activar WhatsApp.",
      });
    }

    (["instagram", "facebook"] as const).forEach((network) => {
      const value = values[network];
      const enabled = values[`${network}Enabled`];
      const handle = normalizeSocialHandle(value, network);
      if (value && !/^[a-z0-9._-]{2,80}$/i.test(handle)) {
        context.addIssue({
          code: "custom",
          path: [network],
          message: "Ingresá un usuario o una URL válida.",
        });
      }
      if (enabled && !value) {
        context.addIssue({
          code: "custom",
          path: [network],
          message: `Ingresá un usuario antes de activar ${network === "instagram" ? "Instagram" : "Facebook"}.`,
        });
      }
    });
  });

type ContactSettingsValues = z.infer<typeof contactSettingsSchema>;

const DEFAULT_CONTACT_VALUES: ContactSettingsValues = {
  whatsapp: "",
  whatsappEnabled: false,
  instagram: "",
  instagramEnabled: false,
  facebook: "",
  facebookEnabled: false,
  contactFormEnabled: true,
};

function nullable(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function argentinaLocalDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("9") && digits.length === 11) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

function normalizeWhatsapp(value: string): { display: string; url: string | null } {
  const local = argentinaLocalDigits(value);
  if (!local) return { display: "", url: null };

  const areaCode = local.slice(0, 3);
  const first = local.slice(3, 6);
  const last = local.slice(6);
  return {
    display: `+54 9 ${areaCode} ${first}-${last}`,
    url: `https://wa.me/549${local}`,
  };
}

function normalizeSocialHandle(value: string, network: "instagram" | "facebook"): string {
  const domain = network === "instagram" ? "instagram.com" : "facebook.com";
  return value
    .trim()
    .replace(new RegExp(`^(?:https?:\\/\\/)?(?:www\\.)?${domain.replace(".", "\\.")}\\/`, "i"), "")
    .replace(/^@/, "")
    .split(/[/?#]/, 1)[0]
    ?.trim() ?? "";
}

function socialUrl(network: "instagram" | "facebook", handle: string): string | null {
  if (!handle) return null;
  return `https://www.${network}.com/${handle}`;
}

function useUnsavedChangesWarning(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);
}

function FieldMessage({ message }: { message?: string }) {
  return message ? (
    <p className="text-xs font-medium text-destructive" role="alert">
      {message}
    </p>
  ) : null;
}

function SectionHeading({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <div>
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function SwitchRow({
  id,
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-5 rounded-lg border bg-muted/20 p-4">
      <div className="space-y-1">
        <Label htmlFor={id}>{title}</Label>
        <p className="text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={title}
      />
    </div>
  );
}

type ColorFieldName = "primaryColor" | "secondaryColor" | "backgroundColor" | "textColor";

function ColorField({
  control,
  name,
  label,
  fallback,
}: {
  control: Control<StoreSettingsValues>;
  name: ColorFieldName;
  label: string;
  fallback: string;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="space-y-2">
          <Label htmlFor={name}>{label}</Label>
          <div className="flex gap-2">
            <Input
              type="color"
              value={isHexColor(field.value) ? field.value : fallback}
              onChange={(event) => field.onChange(event.target.value.toUpperCase())}
              className="w-12 shrink-0 cursor-pointer p-1"
              aria-label={`Selector para ${label.toLowerCase()}`}
            />
            <Input
              id={name}
              ref={field.ref}
              name={field.name}
              value={field.value}
              onBlur={field.onBlur}
              onChange={(event) => field.onChange(event.target.value.toUpperCase())}
              spellCheck={false}
              aria-invalid={Boolean(fieldState.error)}
            />
          </div>
          <FieldMessage message={fieldState.error?.message} />
        </div>
      )}
    />
  );
}

function MutationErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
      No pudimos guardar todos los cambios. Tus datos siguen en el formulario. {errorMessage(error)}
    </div>
  ) : null;
}

function IdentityPreview({ values }: { values: StoreSettingsValues }) {
  const primaryColor = isHexColor(values.primaryColor) ? values.primaryColor : "#74263A";
  const secondaryColor = isHexColor(values.secondaryColor) ? values.secondaryColor : "#312A2B";
  const backgroundColor = isHexColor(values.backgroundColor) ? values.backgroundColor : "#F8F6F1";
  const textColor = isHexColor(values.textColor) ? values.textColor : "#292526";
  const columnCount = Math.min(4, Math.max(2, values.catalogColumnsDesktop));

  return (
    <Card className="overflow-hidden xl:sticky xl:top-6">
      <CardHeader className="border-b bg-muted/20">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>Vista previa de identidad</CardTitle>
            <CardDescription className="mt-1">Se actualiza mientras editás.</CardDescription>
          </div>
          <span
            className="rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
          >
            {values.isPublished ? "Publicada" : "Oculta"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <div
          className="overflow-hidden border shadow-sm"
          style={
            {
              backgroundColor,
              borderColor: `${secondaryColor}24`,
              borderRadius: values.borderRadius,
              color: textColor,
              fontFamily: values.bodyFont,
            } as CSSProperties
          }
        >
          {values.announcementEnabled ? (
            <div className="px-4 py-2 text-center text-[11px] font-semibold text-white" style={{ backgroundColor: primaryColor }}>
              {values.announcementText || "Tu mensaje destacado"}
            </div>
          ) : null}
          <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: `${secondaryColor}20` }}>
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: primaryColor }}>
                {(values.brandName || "R").slice(0, 1).toUpperCase()}
              </span>
              <span className="text-sm font-semibold" style={{ fontFamily: values.headingFont }}>
                {values.brandName || "Tu comercio"}
              </span>
            </div>
            <span className="text-[10px] font-medium opacity-65">Inicio · Productos · Contacto</span>
          </div>
          <div className="grid gap-4 p-4 sm:grid-cols-[1.2fr_.8fr]">
            <div className="flex flex-col justify-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: primaryColor }}>
                Selección Rubí
              </p>
              <p className="mt-2 text-xl font-semibold leading-tight" style={{ fontFamily: values.headingFont }}>
                Joyas que acompañan tu historia
              </p>
              <p className="mt-2 text-xs leading-5 opacity-70">
                Una identidad cálida, elegante y cercana para tu catálogo.
              </p>
              <span className="mt-3 w-fit rounded-md px-3 py-1.5 text-[11px] font-semibold text-white" style={{ backgroundColor: primaryColor }}>
                Ver colección
              </span>
            </div>
            <img
              src="/images/tenants/rubi/hero/coleccion-rubi.webp"
              alt=""
              className="h-32 w-full rounded-md object-cover"
            />
          </div>
          <div className="border-t px-4 py-3" style={{ borderColor: `${secondaryColor}20` }}>
            <div className="mb-2 flex items-center justify-between text-[10px] font-semibold">
              <span>Catálogo</span>
              <span className="font-normal opacity-60">{columnCount} columnas</span>
            </div>
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
              {Array.from({ length: columnCount }, (_, index) => (
                <div key={index} className="space-y-1">
                  <div className="aspect-square rounded-sm" style={{ backgroundColor: `${primaryColor}${index % 2 === 0 ? "20" : "10"}` }} />
                  {values.showPrices ? <div className="h-1.5 w-2/3 rounded bg-current opacity-25" /> : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StoreSettingsPage() {
  const session = useSessionQuery();
  const store = useStoreQueries();
  const mutations = useStoreMutations();
  const initializedTenant = useRef<string | null>(null);
  const form = useForm<StoreSettingsValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: DEFAULT_STORE_VALUES,
  });

  const tenantId = session.data?.tenant.id ?? "";
  const ready = Boolean(store.profile.data && store.settings.data && store.theme.data);

  useEffect(() => {
    if (!ready || !store.profile.data || !store.settings.data || !store.theme.data) return;
    if (initializedTenant.current === tenantId) return;

    const profile = store.profile.data;
    const settings = store.settings.data;
    const theme = store.theme.data;
    form.reset({
      brandName: profile.brandName,
      contactEmail: profile.contactEmail ?? "",
      phone: profile.phone ?? "",
      addressLine: profile.addressLine ?? "",
      addressNumber: profile.addressNumber ?? "",
      city: profile.city ?? "",
      province: profile.province ?? "",
      postalCode: profile.postalCode ?? "",
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      backgroundColor: theme.backgroundColor,
      textColor: theme.textColor,
      headingFont: theme.headingFont,
      bodyFont: theme.bodyFont,
      borderRadius: theme.borderRadius,
      announcementEnabled: theme.announcementEnabled,
      announcementText: theme.announcementText ?? "",
      announcementUrl: theme.announcementUrl ?? "",
      isPublished: settings.isPublished,
      showPrices: settings.showPrices,
      defaultCatalogSort: settings.defaultCatalogSort,
      catalogColumnsDesktop: settings.catalogColumnsDesktop,
    });
    initializedTenant.current = tenantId;
  }, [form, ready, store.profile.data, store.settings.data, store.theme.data, tenantId]);

  useUnsavedChangesWarning(form.formState.isDirty);

  const previewValues = useWatch({ control: form.control }) as StoreSettingsValues;
  const saving = mutations.profile.isPending || mutations.settings.isPending || mutations.theme.isPending;
  const saveError = mutations.profile.error ?? mutations.settings.error ?? mutations.theme.error;
  const publicUrl = RUBI_BRAND_CONTENT.storefrontSettings.publicUrl;

  const submit = form.handleSubmit(async (values) => {
    if (!store.profile.data || !store.settings.data || !store.theme.data) return;

    const normalizedValues: StoreSettingsValues = {
      ...values,
      brandName: values.brandName.trim(),
      contactEmail: values.contactEmail.trim(),
      phone: values.phone.trim(),
      addressLine: values.addressLine.trim(),
      addressNumber: values.addressNumber.trim(),
      city: values.city.trim(),
      province: values.province.trim(),
      postalCode: values.postalCode.trim(),
      announcementText: values.announcementText.trim(),
      announcementUrl: values.announcementUrl.trim(),
    };

    try {
      await Promise.all([
        mutations.profile.mutateAsync({
          brandName: normalizedValues.brandName,
          contactEmail: nullable(normalizedValues.contactEmail),
          phone: nullable(normalizedValues.phone),
          addressLine: nullable(normalizedValues.addressLine),
          addressNumber: nullable(normalizedValues.addressNumber),
          city: nullable(normalizedValues.city),
          province: nullable(normalizedValues.province),
          postalCode: nullable(normalizedValues.postalCode),
          countryCode: store.profile.data.countryCode,
        }),
        mutations.theme.mutateAsync({
          logoAssetId: store.theme.data.logoAssetId,
          faviconAssetId: store.theme.data.faviconAssetId,
          primaryColor: normalizedValues.primaryColor,
          secondaryColor: normalizedValues.secondaryColor,
          backgroundColor: normalizedValues.backgroundColor,
          textColor: normalizedValues.textColor,
          headingFont: normalizedValues.headingFont,
          bodyFont: normalizedValues.bodyFont,
          borderRadius: normalizedValues.borderRadius,
          announcementEnabled: normalizedValues.announcementEnabled,
          announcementText: nullable(normalizedValues.announcementText),
          announcementUrl: nullable(normalizedValues.announcementUrl),
        }),
        mutations.settings.mutateAsync({
          isPublished: normalizedValues.isPublished,
          contactFormEnabled: store.settings.data.contactFormEnabled,
          showPrices: normalizedValues.showPrices,
          allowNegativeStock: store.settings.data.allowNegativeStock,
          defaultCatalogSort: normalizedValues.defaultCatalogSort,
          catalogColumnsDesktop: normalizedValues.catalogColumnsDesktop,
        }),
      ]);
      form.reset(normalizedValues);
    } catch {
      // Mutation hooks surface the error; keeping the form untouched preserves the draft.
    }
  });

  const isLoading = session.isPending || store.profile.isPending || store.settings.isPending || store.theme.isPending;
  const isError = session.isError || store.profile.isError || store.settings.isError || store.theme.isError;
  const queryError = session.error ?? store.profile.error ?? store.settings.error ?? store.theme.error;

  return (
    <div className="page-shell">
      <PageHeader
        title="Información y apariencia"
        description="Actualizá la identidad pública de Rubí y cómo se presenta el catálogo."
        actions={
          <Button asChild variant="outline">
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <ExternalLink aria-hidden="true" />
              Ver tienda
            </a>
          </Button>
        }
      />

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={queryError}
        onRetry={() => {
          void Promise.all([
            session.refetch(),
            store.profile.refetch(),
            store.settings.refetch(),
            store.theme.refetch(),
          ]);
        }}
      >
        <form className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)]" onSubmit={submit} noValidate>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <SectionHeading
                  icon={<Store className="size-4.5" aria-hidden="true" />}
                  title="Información comercial"
                  description="Datos públicos que ayudan a tus clientes a reconocer y encontrar el comercio."
                />
              </CardHeader>
              <CardContent className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="brandName">Nombre comercial</Label>
                  <Input
                    id="brandName"
                    autoComplete="organization"
                    aria-invalid={Boolean(form.formState.errors.brandName)}
                    {...form.register("brandName")}
                  />
                  <FieldMessage message={form.formState.errors.brandName?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenantSlug">Slug de la tienda</Label>
                  <Input id="tenantSlug" value={session.data?.tenant.slug ?? ""} readOnly className="bg-muted/50" />
                  <p className="text-xs text-muted-foreground">La identidad técnica del comercio no se edita desde esta pantalla.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email de contacto</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    autoComplete="email"
                    aria-invalid={Boolean(form.formState.errors.contactEmail)}
                    {...form.register("contactEmail")}
                  />
                  <FieldMessage message={form.formState.errors.contactEmail?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono público</Label>
                  <Input id="phone" type="tel" autoComplete="tel" {...form.register("phone")} />
                  <FieldMessage message={form.formState.errors.phone?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressLine">Calle</Label>
                  <Input id="addressLine" autoComplete="address-line1" {...form.register("addressLine")} />
                  <FieldMessage message={form.formState.errors.addressLine?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addressNumber">Número</Label>
                  <Input id="addressNumber" inputMode="numeric" {...form.register("addressNumber")} />
                  <FieldMessage message={form.formState.errors.addressNumber?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input id="city" autoComplete="address-level2" {...form.register("city")} />
                  <FieldMessage message={form.formState.errors.city?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Provincia</Label>
                  <Input id="province" autoComplete="address-level1" {...form.register("province")} />
                  <FieldMessage message={form.formState.errors.province?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Código postal</Label>
                  <Input id="postalCode" autoComplete="postal-code" {...form.register("postalCode")} />
                  <FieldMessage message={form.formState.errors.postalCode?.message} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeading
                  icon={<Palette className="size-4.5" aria-hidden="true" />}
                  title="Apariencia"
                  description="Definí una combinación consistente de color, tipografía y bordes."
                />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <ColorField control={form.control} name="primaryColor" label="Color principal" fallback="#74263A" />
                  <ColorField control={form.control} name="secondaryColor" label="Color secundario" fallback="#312A2B" />
                  <ColorField control={form.control} name="backgroundColor" label="Fondo" fallback="#F8F6F1" />
                  <ColorField control={form.control} name="textColor" label="Texto" fallback="#292526" />
                </div>
                <Separator />
                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="headingFont">Tipografía de títulos</Label>
                    <Select id="headingFont" {...form.register("headingFont")}>
                      <option value="Merriweather">Merriweather</option>
                      <option value="Playfair Display">Playfair Display</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Inter">Inter</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bodyFont">Tipografía de texto</Label>
                    <Select id="bodyFont" {...form.register("bodyFont")}>
                      <option value="Lora">Lora</option>
                      <option value="Inter">Inter</option>
                      <option value="Arial">Arial</option>
                      <option value="Georgia">Georgia</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="borderRadius">Estilo de bordes</Label>
                    <Select id="borderRadius" {...form.register("borderRadius")}>
                      <option value="0rem">Rectos</option>
                      <option value="0.375rem">Suaves</option>
                      <option value="0.75rem">Redondeados</option>
                      <option value="1rem">Muy redondeados</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeading
                  icon={<Megaphone className="size-4.5" aria-hidden="true" />}
                  title="Mensaje superior"
                  description="Comunicá información importante en la parte superior de la tienda."
                />
              </CardHeader>
              <CardContent className="space-y-5">
                <Controller
                  control={form.control}
                  name="announcementEnabled"
                  render={({ field }) => (
                    <SwitchRow
                      id="announcementEnabled"
                      title="Mostrar anuncio"
                      description="El mensaje aparecerá en todas las páginas públicas."
                      checked={field.value}
                      disabled={saving}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="announcementText">Mensaje</Label>
                    <Input
                      id="announcementText"
                      maxLength={120}
                      readOnly={!previewValues.announcementEnabled}
                      aria-disabled={!previewValues.announcementEnabled}
                      className={!previewValues.announcementEnabled ? "bg-muted/50 opacity-70" : undefined}
                      aria-invalid={Boolean(form.formState.errors.announcementText)}
                      {...form.register("announcementText")}
                    />
                    <FieldMessage message={form.formState.errors.announcementText?.message} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="announcementUrl">Enlace opcional</Label>
                    <Input
                      id="announcementUrl"
                      type="url"
                      placeholder="https://"
                      readOnly={!previewValues.announcementEnabled}
                      aria-disabled={!previewValues.announcementEnabled}
                      className={!previewValues.announcementEnabled ? "bg-muted/50 opacity-70" : undefined}
                      aria-invalid={Boolean(form.formState.errors.announcementUrl)}
                      {...form.register("announcementUrl")}
                    />
                    <FieldMessage message={form.formState.errors.announcementUrl?.message} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <SectionHeading
                  icon={<Globe2 className="size-4.5" aria-hidden="true" />}
                  title="Publicación y catálogo"
                  description="Controlá la visibilidad de la tienda y el orden inicial de los productos."
                />
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="isPublished"
                    render={({ field }) => (
                      <SwitchRow
                        id="isPublished"
                        title="Tienda pública"
                        description="Si la ocultás, el administrador seguirá disponible."
                        checked={field.value}
                        disabled={saving}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="showPrices"
                    render={({ field }) => (
                      <SwitchRow
                        id="showPrices"
                        title="Mostrar precios"
                        description="Ocultalos si preferís recibir consultas."
                        checked={field.value}
                        disabled={saving}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="defaultCatalogSort">Orden predeterminado</Label>
                    <Select id="defaultCatalogSort" {...form.register("defaultCatalogSort")}>
                      <option value="FEATURED">Destacados</option>
                      <option value="NEWEST">Más nuevos</option>
                      <option value="PRICE_ASC">Menor precio</option>
                      <option value="PRICE_DESC">Mayor precio</option>
                      <option value="NAME_ASC">Nombre de A a Z</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="catalogColumnsDesktop">Columnas en escritorio</Label>
                    <Select
                      id="catalogColumnsDesktop"
                      {...form.register("catalogColumnsDesktop", { valueAsNumber: true })}
                    >
                      <option value={2}>2 columnas</option>
                      <option value={3}>3 columnas</option>
                      <option value={4}>4 columnas</option>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <MutationErrorNotice error={saveError} />
            <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {form.formState.isDirty ? "Tenés cambios sin guardar." : "La configuración está al día."}
              </p>
              <Button type="submit" disabled={saving || !form.formState.isDirty}>
                {saving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </div>

          <IdentityPreview values={previewValues} />
        </form>
      </QueryState>
    </div>
  );
}

function contactValue(
  contacts: NonNullable<ReturnType<typeof useStoreQueries>["contacts"]["data"]>,
  channelType: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK",
): string {
  return contacts.find((channel) => channel.channelType === channelType)?.value ?? "";
}

export function ContactSettingsPage() {
  const store = useStoreQueries();
  const mutations = useStoreMutations();
  const initialized = useRef(false);
  const form = useForm<ContactSettingsValues>({
    resolver: zodResolver(contactSettingsSchema),
    defaultValues: DEFAULT_CONTACT_VALUES,
  });

  const ready = Boolean(store.settings.data && store.contacts.data);
  useEffect(() => {
    if (!ready || !store.settings.data || !store.contacts.data || initialized.current) return;
    const contacts = store.contacts.data;
    const whatsapp = contacts.find((channel) => channel.channelType === "WHATSAPP");
    const instagram = contacts.find((channel) => channel.channelType === "INSTAGRAM");
    const facebook = contacts.find((channel) => channel.channelType === "FACEBOOK");
    form.reset({
      whatsapp: normalizeWhatsapp(contactValue(contacts, "WHATSAPP")).display,
      whatsappEnabled: whatsapp?.enabled ?? false,
      instagram: normalizeSocialHandle(contactValue(contacts, "INSTAGRAM"), "instagram"),
      instagramEnabled: instagram?.enabled ?? false,
      facebook: normalizeSocialHandle(contactValue(contacts, "FACEBOOK"), "facebook"),
      facebookEnabled: facebook?.enabled ?? false,
      contactFormEnabled: store.settings.data.contactFormEnabled,
    });
    initialized.current = true;
  }, [form, ready, store.contacts.data, store.settings.data]);

  useUnsavedChangesWarning(form.formState.isDirty);

  const watched = useWatch({ control: form.control }) as ContactSettingsValues;
  const normalizedWhatsapp = normalizeWhatsapp(watched.whatsapp);
  const saving = mutations.contacts.isPending || mutations.settings.isPending;
  const saveError = mutations.contacts.error ?? mutations.settings.error;

  const submit = form.handleSubmit(async (values) => {
    if (!store.contacts.data || !store.settings.data) return;

    const whatsapp = normalizeWhatsapp(values.whatsapp);
    const instagram = normalizeSocialHandle(values.instagram, "instagram");
    const facebook = normalizeSocialHandle(values.facebook, "facebook");
    const editedTypes = new Set(["WHATSAPP", "INSTAGRAM", "FACEBOOK"]);
    const existingByType = new Map(store.contacts.data.map((channel) => [channel.channelType, channel]));
    const untouched: StoreContactChannelInput[] = store.contacts.data
      .filter((channel) => !editedTypes.has(channel.channelType))
      .map((channel) => ({
        id: channel.id,
        channelType: channel.channelType,
        value: channel.value,
        url: channel.url,
        enabled: channel.enabled,
        sortOrder: channel.sortOrder,
      }));

    const channelInput = (
      channelType: "WHATSAPP" | "INSTAGRAM" | "FACEBOOK",
      value: string,
      url: string | null,
      enabled: boolean,
      fallbackSortOrder: number,
    ): StoreContactChannelInput => {
      const existing = existingByType.get(channelType);
      return {
        id: existing?.id,
        channelType,
        value: nullable(value),
        url,
        enabled: enabled && Boolean(value),
        sortOrder: existing?.sortOrder ?? fallbackSortOrder,
      };
    };

    const normalizedValues: ContactSettingsValues = {
      ...values,
      whatsapp: whatsapp.display,
      instagram,
      facebook,
    };

    try {
      await Promise.all([
        mutations.contacts.mutateAsync([
          channelInput("WHATSAPP", whatsapp.display, whatsapp.url, values.whatsappEnabled, 0),
          channelInput("INSTAGRAM", instagram, socialUrl("instagram", instagram), values.instagramEnabled, 1),
          channelInput("FACEBOOK", facebook, socialUrl("facebook", facebook), values.facebookEnabled, 2),
          ...untouched,
        ]),
        mutations.settings.mutateAsync({
          isPublished: store.settings.data.isPublished,
          contactFormEnabled: values.contactFormEnabled,
          showPrices: store.settings.data.showPrices,
          allowNegativeStock: store.settings.data.allowNegativeStock,
          defaultCatalogSort: store.settings.data.defaultCatalogSort,
          catalogColumnsDesktop: store.settings.data.catalogColumnsDesktop,
        }),
      ]);
      form.reset(normalizedValues);
    } catch {
      // Mutation hooks surface the error; keeping the form untouched preserves the draft.
    }
  });

  const isLoading = store.settings.isPending || store.contacts.isPending;
  const isError = store.settings.isError || store.contacts.isError;
  const queryError = store.settings.error ?? store.contacts.error;

  return (
    <div className="page-shell">
      <PageHeader
        title="Contacto y redes"
        description="Centralizá los canales públicos que tus clientes usan para hablar con Rubí."
      />

      <QueryState
        isLoading={isLoading}
        isError={isError}
        error={queryError}
        onRetry={() => {
          void Promise.all([store.settings.refetch(), store.contacts.refetch()]);
        }}
      >
        <form className="space-y-6" onSubmit={submit} noValidate>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <SectionHeading
                  icon={<MessageCircle className="size-4.5" aria-hidden="true" />}
                  title="Canales directos"
                  description="Aceptamos un usuario o una URL; al guardar normalizamos cada vínculo."
                />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-5 rounded-lg border p-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="size-4 text-emerald-600" aria-hidden="true" />
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                    </div>
                    <Controller
                      control={form.control}
                      name="whatsapp"
                      render={({ field, fieldState }) => (
                        <>
                          <Input
                            id="whatsapp"
                            ref={field.ref}
                            name={field.name}
                            value={field.value}
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            placeholder="381 677-6136"
                            aria-invalid={Boolean(fieldState.error)}
                            onChange={field.onChange}
                            onBlur={() => {
                              field.onBlur();
                              if (argentinaLocalDigits(field.value).length === 10) {
                                form.setValue("whatsapp", normalizeWhatsapp(field.value).display, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }
                            }}
                          />
                          <FieldMessage message={fieldState.error?.message} />
                        </>
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      {normalizedWhatsapp.url
                        ? `Se vinculará como ${normalizedWhatsapp.display}.`
                        : "Incluí código de área; agregaremos +54 9 automáticamente."}
                    </p>
                  </div>
                  <Controller
                    control={form.control}
                    name="whatsappEnabled"
                    render={({ field }) => (
                      <div className="flex items-center gap-2 sm:pt-7">
                        <Switch
                          id="whatsappEnabled"
                          checked={field.value}
                          disabled={saving}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="whatsappEnabled">Activo</Label>
                      </div>
                    )}
                  />
                </div>

                <div className="grid gap-5 rounded-lg border p-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AtSign className="size-4 text-fuchsia-600" aria-hidden="true" />
                      <Label htmlFor="instagram">Instagram</Label>
                    </div>
                    <Controller
                      control={form.control}
                      name="instagram"
                      render={({ field, fieldState }) => (
                        <>
                          <Input
                            id="instagram"
                            ref={field.ref}
                            name={field.name}
                            value={field.value}
                            placeholder="@rubijoyerias"
                            aria-invalid={Boolean(fieldState.error)}
                            onChange={field.onChange}
                            onBlur={() => {
                              field.onBlur();
                              form.setValue("instagram", normalizeSocialHandle(field.value, "instagram"), {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                          />
                          <FieldMessage message={fieldState.error?.message} />
                        </>
                      )}
                    />
                    <p className="text-xs text-muted-foreground">Usuario o enlace completo de Instagram.</p>
                  </div>
                  <Controller
                    control={form.control}
                    name="instagramEnabled"
                    render={({ field }) => (
                      <div className="flex items-center gap-2 sm:pt-7">
                        <Switch
                          id="instagramEnabled"
                          checked={field.value}
                          disabled={saving}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="instagramEnabled">Activo</Label>
                      </div>
                    )}
                  />
                </div>

                <div className="grid gap-5 rounded-lg border p-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <UsersRound className="size-4 text-blue-600" aria-hidden="true" />
                      <Label htmlFor="facebook">Facebook</Label>
                    </div>
                    <Controller
                      control={form.control}
                      name="facebook"
                      render={({ field, fieldState }) => (
                        <>
                          <Input
                            id="facebook"
                            ref={field.ref}
                            name={field.name}
                            value={field.value}
                            placeholder="rubijoyerias"
                            aria-invalid={Boolean(fieldState.error)}
                            onChange={field.onChange}
                            onBlur={() => {
                              field.onBlur();
                              form.setValue("facebook", normalizeSocialHandle(field.value, "facebook"), {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                            }}
                          />
                          <FieldMessage message={fieldState.error?.message} />
                        </>
                      )}
                    />
                    <p className="text-xs text-muted-foreground">Nombre de página o enlace completo de Facebook.</p>
                  </div>
                  <Controller
                    control={form.control}
                    name="facebookEnabled"
                    render={({ field }) => (
                      <div className="flex items-center gap-2 sm:pt-7">
                        <Switch
                          id="facebookEnabled"
                          checked={field.value}
                          disabled={saving}
                          onCheckedChange={field.onChange}
                        />
                        <Label htmlFor="facebookEnabled">Activo</Label>
                      </div>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <SectionHeading
                    icon={<Mail className="size-4.5" aria-hidden="true" />}
                    title="Formulario de contacto"
                    description="Recibí consultas desde la tienda pública."
                  />
                </CardHeader>
                <CardContent>
                  <Controller
                    control={form.control}
                    name="contactFormEnabled"
                    render={({ field }) => (
                      <SwitchRow
                        id="contactFormEnabled"
                        title="Formulario activo"
                        description="Las consultas se enviarán al email configurado en Información del comercio."
                        checked={field.value}
                        disabled={saving}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="border-b bg-muted/20">
                  <CardTitle className="text-sm">Así se verán los enlaces</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <MessageCircle className="size-4 text-emerald-600" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">WhatsApp</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {normalizedWhatsapp.display || "Sin configurar"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <AtSign className="size-4 text-fuchsia-600" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Instagram</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {normalizeSocialHandle(watched.instagram, "instagram") || "Sin configurar"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <UsersRound className="size-4 text-blue-600" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Facebook</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {normalizeSocialHandle(watched.facebook, "facebook") || "Sin configurar"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 rounded-lg bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    Los canales se muestran solo cuando están activos y tienen un valor válido.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <MutationErrorNotice error={saveError} />
          <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {form.formState.isDirty ? "Tenés cambios sin guardar." : "Los canales están al día."}
            </p>
            <Button type="submit" disabled={saving || !form.formState.isDirty}>
              {saving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
              {saving ? "Guardando…" : "Guardar contacto"}
            </Button>
          </div>
        </form>
      </QueryState>
    </div>
  );
}
