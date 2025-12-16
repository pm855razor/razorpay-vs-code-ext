/**
 * API Documentation data for Razorpay APIs
 * Contains input parameters, required fields, output information, and documentation links
 */

export interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

export interface ApiDocumentation {
  apiName: string;
  description: string;
  method: string;
  endpoint: string;
  inputParameters: ApiParameter[];
  outputFields: string[];
  docUrl: string;
  examples?: {
    request?: string;
    response?: string;
  };
}

/**
 * API Documentation for Create Order
 * Reference: https://razorpay.com/docs/api/orders/create
 */
export const createOrderDoc: ApiDocumentation = {
  apiName: 'Create Order',
  description: 'Create an order with basic details such as amount and currency',
  method: 'POST',
  endpoint: '/v1/orders',
  inputParameters: [
    {
      name: 'amount',
      type: 'integer',
      required: true,
      description: 'The amount for which the order was created, in currency subunits. For example, for an amount of ₹295, enter 29500',
      example: '50000',
    },
    {
      name: 'currency',
      type: 'string',
      required: true,
      description: 'ISO code for the currency in which you want to accept the payment. The default length is 3 characters',
      example: 'INR',
    },
    {
      name: 'receipt',
      type: 'string',
      required: false,
      description: 'Receipt number that corresponds to this order, set for your internal reference. Can have a maximum length of 40 characters and has to be unique',
      example: 'receipt_001',
    },
    {
      name: 'notes',
      type: 'json object',
      required: false,
      description: 'Key-value pair that can be used to store additional information about the entity. Maximum 15 key-value pairs, 256 characters (maximum) each',
      example: '{ "key1": "value1" }',
    },
    {
      name: 'partial_payment',
      type: 'boolean',
      required: false,
      description: 'Indicates whether the customer can make a partial payment. Default: false',
      example: 'false',
    },
    {
      name: 'first_payment_min_amount',
      type: 'integer',
      required: false,
      description: 'Minimum amount that must be paid by the customer as the first partial payment. Should be passed only if partial_payment is true',
      example: '50000',
    },
  ],
  outputFields: [
    'id - The unique identifier of the order',
    'amount - The amount for which the order was created, in currency subunits',
    'amount_paid - The amount paid against the order',
    'amount_due - The amount pending against the order',
    'currency - ISO code for the currency',
    'receipt - Receipt number that corresponds to this order',
    'status - The status of the order (created, attempted, paid)',
    'attempts - The number of payment attempts made against this order',
    'notes - Key-value pairs for additional information',
    'created_at - Unix timestamp when this order was created',
  ],
  docUrl: 'https://razorpay.com/docs/api/orders/create',
  examples: {
    request: `{
  "amount": 50000,
  "currency": "INR",
  "receipt": "receipt_001",
  "notes": {
    "key1": "value1"
  }
}`,
    response: `{
  "id": "order_RB58MiP5SPFYyM",
  "entity": "order",
  "amount": 50000,
  "amount_paid": 0,
  "amount_due": 50000,
  "currency": "INR",
  "receipt": "receipt_001",
  "status": "created",
  "attempts": 0,
  "notes": {
    "key1": "value1"
  },
  "created_at": 1756455561
}`,
  },
};

/**
 * API Documentation for Fetch Order
 * Reference: https://razorpay.com/docs/api/orders/fetch-with-id
 */
export const fetchOrderDoc: ApiDocumentation = {
  apiName: 'Fetch Order',
  description: 'Retrieve details of a particular order as per the id',
  method: 'GET',
  endpoint: '/v1/orders/:id',
  inputParameters: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'Unique identifier of the order to be retrieved',
      example: 'order_DaaS6LOUAASb7Y',
    },
  ],
  outputFields: [
    'id - The unique identifier of the order',
    'entity - Name of the entity (order)',
    'amount - The amount for which the order was created',
    'amount_paid - The amount paid against the order',
    'amount_due - The amount pending against the order',
    'currency - ISO code for the currency',
    'receipt - Receipt number that corresponds to this order',
    'status - The status of the order (created, attempted, paid)',
    'attempts - The number of payment attempts made against this order',
    'notes - Key-value pairs for additional information',
    'created_at - Unix timestamp when this order was created',
  ],
  docUrl: 'https://razorpay.com/docs/api/orders/fetch-with-id',
  examples: {
    response: `{
  "id": "order_DaaS6LOUAASb7Y",
  "entity": "order",
  "amount": 2000,
  "amount_paid": 0,
  "amount_due": 2000,
  "currency": "INR",
  "receipt": null,
  "status": "created",
  "attempts": 0,
  "notes": [],
  "created_at": 1654776878
}`,
  },
};

/**
 * API Documentation for Fetch Payment
 * Reference: https://razorpay.com/docs/api/payments/fetch-with-id
 */
export const fetchPaymentDoc: ApiDocumentation = {
  apiName: 'Fetch Payment',
  description: 'Retrieve details of a specific payment using its id',
  method: 'GET',
  endpoint: '/v1/payments/:id',
  inputParameters: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'Unique identifier of the payment to be retrieved. Must start with pay_',
      example: 'pay_1234567890',
    },
  ],
  outputFields: [
    'id - The unique identifier of the payment',
    'entity - Name of the entity (payment)',
    'amount - Payment amount in currency subunits',
    'currency - ISO code for the currency',
    'status - Payment status (created, authorized, captured, refunded, failed)',
    'order_id - The order ID associated with this payment',
    'method - Payment method used (card, netbanking, wallet, upi, etc.)',
    'description - Description of the payment',
    'created_at - Unix timestamp when this payment was created',
    'captured - Whether the payment was captured',
    'international - Whether the payment is international',
    'refund_status - Refund status (null, partial, full)',
    'amount_refunded - Amount refunded in currency subunits',
  ],
  docUrl: 'https://razorpay.com/docs/api/payments/fetch-with-id',
};

/**
 * API Documentation for Create Refund
 * Reference: https://razorpay.com/docs/api/refunds/create-normal
 */
export const createRefundDoc: ApiDocumentation = {
  apiName: 'Create Refund',
  description: 'Create a normal refund for a payment',
  method: 'POST',
  endpoint: '/v1/payments/:payment_id/refund',
  inputParameters: [
    {
      name: 'payment_id',
      type: 'string',
      required: true,
      description: 'Unique identifier of the payment for which refund is to be created. Must start with pay_',
      example: 'pay_1234567890',
    },
    {
      name: 'amount',
      type: 'integer',
      required: false,
      description: 'The amount to be refunded in currency subunits. If not provided, full refund will be processed',
      example: '50000',
    },
    {
      name: 'speed',
      type: 'string',
      required: false,
      description: 'Speed at which the refund is processed. Options: normal, instant',
      example: 'normal',
    },
    {
      name: 'notes',
      type: 'json object',
      required: false,
      description: 'Key-value pair that can be used to store additional information. Maximum 15 key-value pairs, 256 characters (maximum) each',
      example: '{ "reason": "Customer request" }',
    },
    {
      name: 'receipt',
      type: 'string',
      required: false,
      description: 'Receipt number that corresponds to this refund',
      example: 'receipt_refund_001',
    },
  ],
  outputFields: [
    'id - The unique identifier of the refund (starts with rfnd_)',
    'entity - Name of the entity (refund)',
    'amount - Refund amount in currency subunits',
    'currency - ISO code for the currency',
    'payment_id - The payment ID for which refund was created',
    'notes - Key-value pairs for additional information',
    'receipt - Receipt number that corresponds to this refund',
    'status - Refund status (pending, processed, failed)',
    'speed_processed - Speed at which the refund was processed',
    'created_at - Unix timestamp when this refund was created',
  ],
  docUrl: 'https://razorpay.com/docs/api/refunds/create-normal',
};

/**
 * API Documentation for Fetch Refund
 * Reference: https://razorpay.com/docs/api/refunds/fetch-with-id
 */
export const fetchRefundDoc: ApiDocumentation = {
  apiName: 'Fetch Refund',
  description: 'Retrieve details of a specific refund using its id',
  method: 'GET',
  endpoint: '/v1/refunds/:id',
  inputParameters: [
    {
      name: 'id',
      type: 'string',
      required: true,
      description: 'Unique identifier of the refund to be retrieved. Must start with rfnd_',
      example: 'rfnd_1234567890',
    },
  ],
  outputFields: [
    'id - The unique identifier of the refund',
    'entity - Name of the entity (refund)',
    'amount - Refund amount in currency subunits',
    'currency - ISO code for the currency',
    'payment_id - The payment ID for which refund was created',
    'notes - Key-value pairs for additional information',
    'receipt - Receipt number that corresponds to this refund',
    'status - Refund status (pending, processed, failed)',
    'speed_processed - Speed at which the refund was processed',
    'created_at - Unix timestamp when this refund was created',
  ],
  docUrl: 'https://razorpay.com/docs/api/refunds/fetch-with-id',
};

/**
 * Map of API patterns to their documentation
 * Used by the hover provider to detect and show relevant documentation
 */
export const apiDocumentationMap: Map<string, ApiDocumentation> = new Map([
  // Orders APIs
  ['orders.create', createOrderDoc],
  ['order.create', createOrderDoc],
  ['orders.fetch', fetchOrderDoc],
  ['order.fetch', fetchOrderDoc],
  
  // Payments APIs
  ['payments.fetch', fetchPaymentDoc],
  ['payment.fetch', fetchPaymentDoc],
  
  // Refunds APIs
  ['payments.refund', createRefundDoc],
  ['payment.refund', createRefundDoc],
  ['refunds.create', createRefundDoc],
  ['refund.create', createRefundDoc],
  ['refunds.fetch', fetchRefundDoc],
  ['refund.fetch', fetchRefundDoc],
]);

/**
 * Get API documentation by pattern
 */
export function getApiDocumentation(pattern: string): ApiDocumentation | undefined {
  return apiDocumentationMap.get(pattern.toLowerCase());
}

/**
 * Find matching API pattern in code
 * Supports various SDK patterns across different languages
 */
export function findApiPattern(text: string, position: number): string | null {
  // Define patterns for each API with their corresponding API pattern key
  const apiPatternMap: Array<{ patterns: RegExp[]; apiKey: string }> = [
    {
      patterns: [
        /razorpay\.orders\.create/gi,
        /razorpay_client\.order\.create/gi,
        /razorpay\.Order\.create/gi,
        /razorpayClient\.Order\.Create/gi,
        /razorpay\.Orders\.create/gi,
        /Razorpay::Order\.create/gi,
      ],
      apiKey: 'orders.create',
    },
    {
      patterns: [
        /razorpay\.orders\.fetch/gi,
        /razorpay_client\.order\.fetch/gi,
        /razorpay\.Order\.fetch/gi,
        /razorpayClient\.Order\.Fetch/gi,
        /razorpay\.Orders\.fetch/gi,
        /Razorpay::Order\.fetch/gi,
      ],
      apiKey: 'orders.fetch',
    },
    {
      patterns: [
        /razorpay\.payments\.fetch/gi,
        /razorpay_client\.payment\.fetch/gi,
        /razorpay\.Payment\.fetch/gi,
        /razorpayClient\.Payment\.Fetch/gi,
        /razorpay\.Payments\.fetch/gi,
        /Razorpay::Payment\.fetch/gi,
      ],
      apiKey: 'payments.fetch',
    },
    {
      patterns: [
        /razorpay\.payments\.refund/gi,
        /razorpay_client\.payment\.refund/gi,
        /razorpay\.Payment\.refund/gi,
        /razorpayClient\.Payment\.Refund/gi,
        /razorpay\.Payments\.refund/gi,
        /Razorpay::Payment\.refund/gi,
      ],
      apiKey: 'payments.refund',
    },
    {
      patterns: [
        /razorpay\.refunds\.fetch/gi,
        /razorpay_client\.refund\.fetch/gi,
        /razorpay\.Refund\.fetch/gi,
        /razorpayClient\.Refund\.Fetch/gi,
        /razorpay\.Refunds\.fetch/gi,
        /Razorpay::Refund\.fetch/gi,
      ],
      apiKey: 'refunds.fetch',
    },
  ];
  
  // Check each API pattern
  for (const { patterns, apiKey } of apiPatternMap) {
    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        if (match.index !== undefined) {
          const start = match.index;
          const end = start + match[0].length;
          // Check if cursor position is within the match range
          if (position >= start && position <= end) {
            return apiKey;
          }
        }
      }
    }
  }
  
  return null;
}

