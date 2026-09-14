export interface StorefrontTokenPayload {
  type: 'CUSTOMER';
  userId: string;
  customerId: string;
  tenantId: string;
}
