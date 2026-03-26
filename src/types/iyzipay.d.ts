// ─── iyzipay Type Declarations ──────────────────────────────

declare module "iyzipay" {
  interface IyzipayConfig {
    uri: string;
    apiKey: string;
    secretKey: string;
  }

  interface CallbackFn<T> {
    (err: Error | null, result: T): void;
  }

  interface BaseResult {
    status: string;
    errorCode?: string;
    errorMessage?: string;
    locale?: string;
    systemTime?: number;
    conversationId?: string;
  }

  interface CheckoutFormInitResult extends BaseResult {
    token?: string;
    checkoutFormContent?: string;
    tokenExpireTime?: number;
    paymentPageUrl?: string;
  }

  interface CheckoutFormResult extends BaseResult {
    paymentId?: string;
    price?: number;
    paidPrice?: number;
    installment?: number;
    currency?: string;
    basketId?: string;
    lastFourDigits?: string;
    cardAssociation?: string;
    cardType?: string;
    paymentStatus?: string;
    token?: string;
  }

  interface SubscriptionInitResult extends BaseResult {
    data?: {
      referenceCode: string;
      checkoutFormContent: string;
      token: string;
      tokenExpireTime: number;
    };
  }

  interface SubscriptionResult extends BaseResult {
    data?: {
      referenceCode: string;
      subscriptionStatus: string;
      startDate: number;
      endDate: number;
    };
  }

  interface InstallmentDetail {
    installmentNumber: number;
    totalPrice: string;
    installmentPrice: string;
    installmentRate: number;
  }

  interface InstallmentInfoResult extends BaseResult {
    installmentDetails?: {
      binNumber: string;
      price: string;
      cardType: string;
      cardAssociation: string;
      cardFamilyName: string;
      force3ds: number;
      bankCode: number;
      bankName: string;
      forceCvc: number;
      installmentPrices: InstallmentDetail[];
    }[];
  }

  class Iyzipay {
    constructor(config: IyzipayConfig);

    checkoutFormInitialize: {
      create(request: Record<string, unknown>, callback: CallbackFn<CheckoutFormInitResult>): void;
    };
    checkoutForm: {
      retrieve(request: Record<string, unknown>, callback: CallbackFn<CheckoutFormResult>): void;
    };
    subscriptionCheckoutForm: {
      initialize(request: Record<string, unknown>, callback: CallbackFn<SubscriptionInitResult>): void;
      retrieve(request: Record<string, unknown>, callback: CallbackFn<SubscriptionResult>): void;
    };
    subscription: {
      retrieve(request: Record<string, unknown>, callback: CallbackFn<SubscriptionResult>): void;
      cancel(request: Record<string, unknown>, callback: CallbackFn<BaseResult>): void;
    };
    installmentInfo: {
      retrieve(request: Record<string, unknown>, callback: CallbackFn<InstallmentInfoResult>): void;
    };
    apiTest: {
      retrieve(request: Record<string, unknown>, callback: CallbackFn<BaseResult>): void;
    };

    static LOCALE: { TR: string; EN: string };
    static CURRENCY: { TRY: string; EUR: string; USD: string };
    static PAYMENT_GROUP: { PRODUCT: string; LISTING: string; SUBSCRIPTION: string };
    static BASKET_ITEM_TYPE: { PHYSICAL: string; VIRTUAL: string };
    static SUBSCRIPTION_INITIAL_STATUS: { ACTIVE: string; PENDING: string };
  }

  export = Iyzipay;
}
