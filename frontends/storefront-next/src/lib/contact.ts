import type { StoreContactChannel, TenantConfig } from "@/types/tenant";

export const getContactChannel = (
  tenant: TenantConfig,
  type: StoreContactChannel["type"],
) =>
  tenant.contactChannels
    .filter((channel) => channel.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .find((channel) => channel.type === type);

export const getContactUrl = (
  tenant: TenantConfig,
  type: StoreContactChannel["type"],
) => getContactChannel(tenant, type)?.url;
