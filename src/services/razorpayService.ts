import Razorpay from 'razorpay';
import type { Logger } from '../utils/logger';

export interface CreateOrderParams {
  amount: number;
  currency: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface CreatePaymentParams {
  amount: number;
  currency: string;
  order_id: string;
  description?: string;
  customer?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
}

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

/**
 * Service for interacting with Razorpay API
 */
export class RazorpayService {
  private razorpay: Razorpay | null = null;

  constructor(private logger: Logger) {}

  /**
   * Initialize Razorpay client with credentials
   */
  initialize(config: RazorpayConfig): void {
    try {
      if (!config.keyId || !config.keySecret) {
        throw new Error('Razorpay Key ID and Key Secret are required');
      }

      this.razorpay = new Razorpay({
        key_id: config.keyId,
        key_secret: config.keySecret,
      });

      this.logger.info('Razorpay client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Razorpay client', error as Error);
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.razorpay !== null;
  }

  /**
   * Create a new order
   */
  async createOrder(params: CreateOrderParams): Promise<any> {
    if (!this.razorpay) {
      throw new Error('Razorpay client not initialized. Please configure your credentials in settings.');
    }

    try {
      this.logger.info(`Creating order with amount: ${params.amount}, currency: ${params.currency}`);
      
      const orderParams: any = {
        amount: params.amount * 100, // Convert to paise
        currency: params.currency,
      };

      if (params.receipt) {
        orderParams.receipt = params.receipt;
      }

      if (params.notes) {
        orderParams.notes = params.notes || {};
      }

      const order = await this.razorpay.orders.create(orderParams);
      this.logger.info(`Order created successfully: ${order.id}`);
      
      return order;
    } catch (error) {
      this.logger.error('Failed to create order', error as Error);
      throw error;
    }
  }

  /**
   * Fetch order by ID
   */
  async fetchOrder(orderId: string): Promise<any> {
    if (!this.razorpay) {
      throw new Error('Razorpay client not initialized. Please configure your credentials in settings.');
    }

    try {
      this.logger.info(`Fetching order: ${orderId}`);
      const order = await this.razorpay.orders.fetch(orderId);
      return order;
    } catch (error) {
      this.logger.error(`Failed to fetch order ${orderId}`, error as Error);
      throw error;
    }
  }

  /**
   * Create a payment link for checkout
   */
  async createPayment(params: CreatePaymentParams): Promise<any> {
    if (!this.razorpay) {
      throw new Error('Razorpay client not initialized. Please configure your credentials in settings.');
    }

    try {
      this.logger.info(`Creating payment link with amount: ${params.amount}, currency: ${params.currency}, order_id: ${params.order_id}`);
      
      const paymentLinkParams: any = {
        amount: params.amount * 100, 
        currency: params.currency,
        accept_partial: false,
        description: params.description || 'Payment for order',
        notify: {
          sms: false,
          email: false,
        },
        reminder_enable: false,
        notes: {
          ...(params.notes || {}),
          order_id: params.order_id, 
        },
        callback_url: '',
        callback_method: 'get',
      };

      if (params.customer && Object.keys(params.customer).length > 0) {
        paymentLinkParams.customer = params.customer;
      }


      const paymentLink = await this.razorpay.paymentLink.create(paymentLinkParams);
      this.logger.info(`Payment link created successfully: ${paymentLink.id}`);
      
      return {
        id: paymentLink.id,
        short_url: paymentLink.short_url,
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        status: paymentLink.status,
        order_id: params.order_id,
        created_at: paymentLink.created_at,
      };
    } catch (error: any) {
      const errorMessage = error?.error?.description || error?.message || error?.toString() || 'Unknown error occurred';
      this.logger.error(`Failed to create payment link: ${errorMessage}`, error as Error);
      throw new Error(errorMessage);
    }
  }
}

