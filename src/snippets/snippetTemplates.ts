import type { SnippetTemplate } from '../types';

/**
 * Code snippet templates for Razorpay APIs
 * Based on Razorpay Postman Collection: https://www.postman.com/razorpaydev/razorpay-public-workspace/collection/mfu7vaw/razorpay-apis
 * 
 * Categories:
 * - Setup (Import and initialize Razorpay)
 * - Orders APIs (Create, Fetch)
 * - Payments APIs (Fetch)
 */
export const snippetTemplates: SnippetTemplate[] = [
  // ============================================
  // SETUP - TypeScript/JavaScript
  // ============================================
  {
    id: 'setup-ts',
    name: 'Razorpay Setup',
    description: 'Import Razorpay and initialize (use this once at the top of your file)',
    category: 'setup',
    language: ['typescript', 'javascript'],
    prefix: 'razorpay-setup',
    body: [
      "import Razorpay from 'razorpay';",
      "import dotenv from 'dotenv';",
      '',
      'dotenv.config();',
      '',
      "const razorpay = new Razorpay({",
      '  key_id: process.env.RAZORPAY_KEY_ID || "",',
      '  key_secret: process.env.RAZORPAY_KEY_SECRET || "",',
      '});',
    ],
  },
  // ============================================
  // SETUP - Python
  // ============================================
  {
    id: 'setup-python',
    name: 'Razorpay Setup',
    description: 'Import Razorpay and initialize (use this once at the top of your file)',
    category: 'setup',
    language: ['python'],
    prefix: 'razorpay-setup',
    body: [
      'import razorpay',
      'import os',
      '',
      'razorpay_client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))',
    ],
  },
  // ============================================
  // SETUP - Java
  // ============================================
  {
    id: 'setup-java',
    name: 'Razorpay Setup',
    description: 'Import Razorpay and initialize (use this once at the top of your file)',
    category: 'setup',
    language: ['java'],
    prefix: 'razorpay-setup',
    body: [
      'import com.razorpay.Razorpay;',
      'import com.razorpay.RazorpayException;',
      '',
      'Razorpay razorpay = new Razorpay(System.getenv("RAZORPAY_KEY_ID"), System.getenv("RAZORPAY_KEY_SECRET"));',
    ],
  },
  // ============================================
  // SETUP - Go
  // ============================================
  {
    id: 'setup-go',
    name: 'Razorpay Setup',
    description: 'Import Razorpay and initialize (use this once at the top of your file)',
    category: 'setup',
    language: ['go'],
    prefix: 'razorpay-setup',
    body: [
      'import (',
      '    "github.com/razorpay/razorpay-go"',
      '    "os"',
      ')',
      '',
      'keyID := os.Getenv("RAZORPAY_KEY_ID")',
      'keySecret := os.Getenv("RAZORPAY_KEY_SECRET")',
      'razorpayClient := razorpay.NewClient(keyID, keySecret)',
    ],
  },
  // ============================================
  // SETUP - Ruby
  // ============================================
  {
    id: 'setup-ruby',
    name: 'Razorpay Setup',
    description: 'Import Razorpay and initialize (use this once at the top of your file)',
    category: 'setup',
    language: ['ruby'],
    prefix: 'razorpay-setup',
    body: [
      "require 'razorpay'",
      '',
      'Razorpay.setup(ENV["RAZORPAY_KEY_ID"], ENV["RAZORPAY_KEY_SECRET"])',
    ],
  },

  // ============================================
  // ORDERS APIs - TypeScript/JavaScript
  // ============================================
  {
    id: 'order.create-ts',
    name: 'Create Order',
    description: 'Create a new order',
    category: 'order',
    language: ['typescript', 'javascript'],
    prefix: 'razorpay-order-create',
    body: [
      'const order = await razorpay.orders.create({',
      '  amount: ${1:50000}, // Amount in paise',
      '  currency: ${2:"INR"},',
      '  receipt: ${3:"receipt_001"},',
      '  notes: {',
      '    ${4:key1}: ${5:"value1"},',
      '  },',
      '});',
      '',
      'console.log("Order created:", order.id);',
    ],
  },
  {
    id: 'order.fetch-ts',
    name: 'Fetch Order',
    description: 'Fetch order details by ID',
    category: 'order',
    language: ['typescript', 'javascript'],
    prefix: 'razorpay-order-fetch',
    body: [
      'const order = await razorpay.orders.fetch(${1:"<paste order id here>"});',
      '',
      'console.log("Order:", order);',
    ],
  },
  // ============================================
  // ORDERS APIs - Python
  // ============================================
  {
    id: 'order.create-python',
    name: 'Create Order',
    description: 'Create a new order',
    category: 'order',
    language: ['python'],
    prefix: 'razorpay-order-create',
    body: [
      'order_data = {',
      '    "amount": ${1:50000},  # Amount in paise',
      '    "currency": "${2:INR}",',
      '    "receipt": "${3:receipt_001}",',
      '    "notes": {',
      '        "${4:key1}": "${5:value1}"',
      '    }',
      '}',
      '',
      'order = razorpay_client.order.create(data=order_data)',
      'print(f"Order created: {order[\'id\']}")',
    ],
  },
  {
    id: 'order.fetch-python',
    name: 'Fetch Order',
    description: 'Fetch order details by ID',
    category: 'order',
    language: ['python'],
    prefix: 'razorpay-order-fetch',
    body: [
      'order = razorpay_client.order.fetch("${1:<paste order id here>}")',
      'print(f"Order: {order}")',
    ],
  },
  // ============================================
  // ORDERS APIs - Java
  // ============================================
  {
    id: 'order.create-java',
    name: 'Create Order',
    description: 'Create a new order',
    category: 'order',
    language: ['java'],
    prefix: 'razorpay-order-create',
    body: [
      'JSONObject orderRequest = new JSONObject();',
      'orderRequest.put("amount", ${1:50000}); // Amount in paise',
      'orderRequest.put("currency", "${2:INR}");',
      'orderRequest.put("receipt", "${3:receipt_001}");',
      '',
      'JSONObject notes = new JSONObject();',
      'notes.put("${4:key1}", "${5:value1}");',
      'orderRequest.put("notes", notes);',
      '',
      'try {',
      '    Order order = razorpay.Orders.create(orderRequest);',
      '    System.out.println("Order created: " + order.get("id"));',
      '} catch (RazorpayException e) {',
      '    System.out.println("Error: " + e.getMessage());',
      '}',
    ],
  },
  {
    id: 'order.fetch-java',
    name: 'Fetch Order',
    description: 'Fetch order details by ID',
    category: 'order',
    language: ['java'],
    prefix: 'razorpay-order-fetch',
    body: [
      'try {',
      '    Order order = razorpay.Orders.fetch("${1:<paste order id here>}");',
      '    System.out.println("Order: " + order);',
      '} catch (RazorpayException e) {',
      '    System.out.println("Error: " + e.getMessage());',
      '}',
    ],
  },
  // ============================================
  // ORDERS APIs - Go
  // ============================================
  {
    id: 'order.create-go',
    name: 'Create Order',
    description: 'Create a new order',
    category: 'order',
    language: ['go'],
    prefix: 'razorpay-order-create',
    body: [
      'orderParams := map[string]interface{}{',
      '    "amount":   ${1:50000}, // Amount in paise',
      '    "currency": "${2:INR}",',
      '    "receipt":  "${3:receipt_001}",',
      '    "notes": map[string]string{',
      '        "${4:key1}": "${5:value1}",',
      '    },',
      '}',
      '',
      'order, err := razorpayClient.Order.Create(orderParams, nil)',
      'if err != nil {',
      '    log.Fatal(err)',
      '}',
      'fmt.Printf("Order created: %s\\n", order["id"])',
    ],
  },
  {
    id: 'order.fetch-go',
    name: 'Fetch Order',
    description: 'Fetch order details by ID',
    category: 'order',
    language: ['go'],
    prefix: 'razorpay-order-fetch',
    body: [
      'order, err := razorpayClient.Order.Fetch("${1:<paste order id here>}", nil, nil)',
      'if err != nil {',
      '    log.Fatal(err)',
      '}',
      'fmt.Printf("Order: %+v\\n", order)',
    ],
  },
  // ============================================
  // ORDERS APIs - Ruby
  // ============================================
  {
    id: 'order.create-ruby',
    name: 'Create Order',
    description: 'Create a new order',
    category: 'order',
    language: ['ruby'],
    prefix: 'razorpay-order-create',
    body: [
      'order_params = {',
      '  amount: ${1:50000}, # Amount in paise',
      '  currency: "${2:INR}",',
      '  receipt: "${3:receipt_001}",',
      '  notes: {',
      '    ${4:key1}: "${5:value1}"',
      '  }',
      '}',
      '',
      'order = Razorpay::Order.create(order_params)',
      'puts "Order created: #{order.id}"',
    ],
  },
  {
    id: 'order.fetch-ruby',
    name: 'Fetch Order',
    description: 'Fetch order details by ID',
    category: 'order',
    language: ['ruby'],
    prefix: 'razorpay-order-fetch',
    body: [
      'order = Razorpay::Order.fetch("${1:<paste order id here>}")',
      'puts "Order: #{order}"',
    ],
  },
  
  // ============================================
  // PAYMENTS APIs - TypeScript/JavaScript
  // ============================================
  {
    id: 'payment.create-ts',
    name: 'Create Payment',
    description: 'Create a new payment',
    category: 'payment',
    language: ['typescript', 'javascript'],
    prefix: 'razorpay-payment-create',
    body: [
      'const payment = await razorpay.payments.create({',
      '  amount: ${1:50000}, // Amount in paise',
      '  currency: ${2:"INR"},',
      '  order_id: ${3:"order_id"},',
      '  method: ${4:"card"},',
      '  notes: {',
      '    ${5:key1}: ${6:"value1"},',
      '  },',
      '});',
      '',
      'console.log("Payment created:", payment.id);',
    ],
  },
  {
    id: 'payment.fetch-ts',
    name: 'Fetch Payment',
    description: 'Fetch payment details by ID',
    category: 'payment',
    language: ['typescript', 'javascript'],
    prefix: 'razorpay-payment-fetch',
    body: [
      'const payment = await razorpay.payments.fetch(${1:"paymentId"});',
      '',
      'console.log("Payment:", payment);',
    ],
  },
  // ============================================
  // PAYMENTS APIs - Python
  // ============================================
  {
    id: 'payment.create-python',
    name: 'Create Payment',
    description: 'Create a new payment',
    category: 'payment',
    language: ['python'],
    prefix: 'razorpay-payment-create',
    body: [
      'payment_data = {',
      '    "amount": ${1:50000},  # Amount in paise',
      '    "currency": "${2:INR}",',
      '    "order_id": "${3:order_id}",',
      '    "method": "${4:card}",',
      '    "notes": {',
      '        "${5:key1}": "${6:value1}"',
      '    }',
      '}',
      '',
      'payment = razorpay_client.payment.create(data=payment_data)',
      'print(f"Payment created: {payment[\'id\']}")',
    ],
  },
  {
    id: 'payment.fetch-python',
    name: 'Fetch Payment',
    description: 'Fetch payment details by ID',
    category: 'payment',
    language: ['python'],
    prefix: 'razorpay-payment-fetch',
    body: [
      'payment = razorpay_client.payment.fetch("${1:paymentId}")',
      'print(f"Payment: {payment}")',
    ],
  },
  // ============================================
  // PAYMENTS APIs - Java
  // ============================================
  {
    id: 'payment.create-java',
    name: 'Create Payment',
    description: 'Create a new payment',
    category: 'payment',
    language: ['java'],
    prefix: 'razorpay-payment-create',
    body: [
      'JSONObject paymentRequest = new JSONObject();',
      'paymentRequest.put("amount", ${1:50000}); // Amount in paise',
      'paymentRequest.put("currency", "${2:INR}");',
      'paymentRequest.put("order_id", "${3:order_id}");',
      'paymentRequest.put("method", "${4:card}");',
      '',
      'JSONObject notes = new JSONObject();',
      'notes.put("${5:key1}", "${6:value1}");',
      'paymentRequest.put("notes", notes);',
      '',
      'try {',
      '    Payment payment = razorpay.Payments.create(paymentRequest);',
      '    System.out.println("Payment created: " + payment.get("id"));',
      '} catch (RazorpayException e) {',
      '    System.out.println("Error: " + e.getMessage());',
      '}',
    ],
  },
  {
    id: 'payment.fetch-java',
    name: 'Fetch Payment',
    description: 'Fetch payment details by ID',
    category: 'payment',
    language: ['java'],
    prefix: 'razorpay-payment-fetch',
    body: [
      'try {',
      '    Payment payment = razorpay.Payments.fetch("${1:paymentId}");',
      '    System.out.println("Payment: " + payment);',
      '} catch (RazorpayException e) {',
      '    System.out.println("Error: " + e.getMessage());',
      '}',
    ],
  },
  // ============================================
  // PAYMENTS APIs - Go
  // ============================================
  {
    id: 'payment.create-go',
    name: 'Create Payment',
    description: 'Create a new payment',
    category: 'payment',
    language: ['go'],
    prefix: 'razorpay-payment-create',
    body: [
      'paymentParams := map[string]interface{}{',
      '    "amount":   ${1:50000}, // Amount in paise',
      '    "currency": "${2:INR}",',
      '    "order_id": "${3:order_id}",',
      '    "method":  "${4:card}",',
      '    "notes": map[string]string{',
      '        "${5:key1}": "${6:value1}",',
      '    },',
      '}',
      '',
      'payment, err := razorpayClient.Payment.Create(paymentParams, nil)',
      'if err != nil {',
      '    log.Fatal(err)',
      '}',
      'fmt.Printf("Payment created: %s\\n", payment["id"])',
    ],
  },
  {
    id: 'payment.fetch-go',
    name: 'Fetch Payment',
    description: 'Fetch payment details by ID',
    category: 'payment',
    language: ['go'],
    prefix: 'razorpay-payment-fetch',
    body: [
      'payment, err := razorpayClient.Payment.Fetch("${1:paymentId}", nil, nil)',
      'if err != nil {',
      '    log.Fatal(err)',
      '}',
      'fmt.Printf("Payment: %+v\\n", payment)',
    ],
  },
  // ============================================
  // PAYMENTS APIs - Ruby
  // ============================================
  {
    id: 'payment.create-ruby',
    name: 'Create Payment',
    description: 'Create a new payment',
    category: 'payment',
    language: ['ruby'],
    prefix: 'razorpay-payment-create',
    body: [
      'payment_params = {',
      '  amount: ${1:50000}, # Amount in paise',
      '  currency: "${2:INR}",',
      '  order_id: "${3:order_id}",',
      '  method: "${4:card}",',
      '  notes: {',
      '    ${5:key1}: "${6:value1}"',
      '  }',
      '}',
      '',
      'payment = Razorpay::Payment.create(payment_params)',
      'puts "Payment created: #{payment.id}"',
    ],
  },
  {
    id: 'payment.fetch-ruby',
    name: 'Fetch Payment',
    description: 'Fetch payment details by ID',
    category: 'payment',
    language: ['ruby'],
    prefix: 'razorpay-payment-fetch',
    body: [
      'payment = Razorpay::Payment.fetch("${1:paymentId}")',
      'puts "Payment: #{payment}"',
    ],
  },
  
  // ============================================
  // REFUNDS APIs - TypeScript/JavaScript
  // ============================================
  {
    id: 'refund.create-ts',
    name: 'Create Refund',
    description: 'Create a new refund',
    category: 'refund',
    language: ['typescript', 'javascript'],
    prefix: 'razorpay-refund-create',
    body: [
      'const refund = await razorpay.payments.refund(${1:"paymentId"}, {',
      '  amount: ${2:50000}, // Amount in paise (optional, full refund if not provided)',
      '  notes: {',
      '    ${3:key1}: ${4:"value1"},',
      '  },',
      '});',
      '',
      'console.log("Refund created:", refund.id);',
    ],
  },
  {
    id: 'refund.fetch-ts',
    name: 'Fetch Refund',
    description: 'Fetch refund details by ID',
    category: 'refund',
    language: ['typescript', 'javascript'],
    prefix: 'razorpay-refund-fetch',
    body: [
      'const refund = await razorpay.refunds.fetch(${1:"refundId"});',
      '',
      'console.log("Refund:", refund);',
    ],
  },
  // ============================================
  // REFUNDS APIs - Python
  // ============================================
  {
    id: 'refund.create-python',
    name: 'Create Refund',
    description: 'Create a new refund',
    category: 'refund',
    language: ['python'],
    prefix: 'razorpay-refund-create',
    body: [
      'refund_data = {',
      '    "amount": ${1:50000},  # Amount in paise (optional, full refund if not provided)',
      '    "notes": {',
      '        "${2:key1}": "${3:value1}"',
      '    }',
      '}',
      '',
      'refund = razorpay_client.payment.refund("${4:paymentId}", data=refund_data)',
      'print(f"Refund created: {refund[\'id\']}")',
    ],
  },
  {
    id: 'refund.fetch-python',
    name: 'Fetch Refund',
    description: 'Fetch refund details by ID',
    category: 'refund',
    language: ['python'],
    prefix: 'razorpay-refund-fetch',
    body: [
      'refund = razorpay_client.refund.fetch("${1:refundId}")',
      'print(f"Refund: {refund}")',
    ],
  },
  // ============================================
  // REFUNDS APIs - Java
  // ============================================
  {
    id: 'refund.create-java',
    name: 'Create Refund',
    description: 'Create a new refund',
    category: 'refund',
    language: ['java'],
    prefix: 'razorpay-refund-create',
    body: [
      'JSONObject refundRequest = new JSONObject();',
      'refundRequest.put("amount", ${1:50000}); // Amount in paise (optional)',
      '',
      'JSONObject notes = new JSONObject();',
      'notes.put("${2:key1}", "${3:value1}");',
      'refundRequest.put("notes", notes);',
      '',
      'try {',
      '    Refund refund = razorpay.Payments.refund("${4:paymentId}", refundRequest);',
      '    System.out.println("Refund created: " + refund.get("id"));',
      '} catch (RazorpayException e) {',
      '    System.out.println("Error: " + e.getMessage());',
      '}',
    ],
  },
  {
    id: 'refund.fetch-java',
    name: 'Fetch Refund',
    description: 'Fetch refund details by ID',
    category: 'refund',
    language: ['java'],
    prefix: 'razorpay-refund-fetch',
    body: [
      'try {',
      '    Refund refund = razorpay.Refunds.fetch("${1:refundId}");',
      '    System.out.println("Refund: " + refund);',
      '} catch (RazorpayException e) {',
      '    System.out.println("Error: " + e.getMessage());',
      '}',
    ],
  },
  // ============================================
  // REFUNDS APIs - Go
  // ============================================
  {
    id: 'refund.create-go',
    name: 'Create Refund',
    description: 'Create a new refund',
    category: 'refund',
    language: ['go'],
    prefix: 'razorpay-refund-create',
    body: [
      'refundParams := map[string]interface{}{',
      '    "amount": ${1:50000}, // Amount in paise (optional)',
      '    "notes": map[string]string{',
      '        "${2:key1}": "${3:value1}",',
      '    },',
      '}',
      '',
      'refund, err := razorpayClient.Payment.Refund("${4:paymentId}", refundParams, nil)',
      'if err != nil {',
      '    log.Fatal(err)',
      '}',
      'fmt.Printf("Refund created: %s\\n", refund["id"])',
    ],
  },
  {
    id: 'refund.fetch-go',
    name: 'Fetch Refund',
    description: 'Fetch refund details by ID',
    category: 'refund',
    language: ['go'],
    prefix: 'razorpay-refund-fetch',
    body: [
      'refund, err := razorpayClient.Refund.Fetch("${1:refundId}", nil, nil)',
      'if err != nil {',
      '    log.Fatal(err)',
      '}',
      'fmt.Printf("Refund: %+v\\n", refund)',
    ],
  },
  // ============================================
  // REFUNDS APIs - Ruby
  // ============================================
  {
    id: 'refund.create-ruby',
    name: 'Create Refund',
    description: 'Create a new refund',
    category: 'refund',
    language: ['ruby'],
    prefix: 'razorpay-refund-create',
    body: [
      'refund_params = {',
      '  amount: ${1:50000}, # Amount in paise (optional)',
      '  notes: {',
      '    ${2:key1}: "${3:value1}"',
      '  }',
      '}',
      '',
      'refund = Razorpay::Payment.refund("${4:paymentId}", refund_params)',
      'puts "Refund created: #{refund.id}"',
    ],
  },
  {
    id: 'refund.fetch-ruby',
    name: 'Fetch Refund',
    description: 'Fetch refund details by ID',
    category: 'refund',
    language: ['ruby'],
    prefix: 'razorpay-refund-fetch',
    body: [
      'refund = Razorpay::Refund.fetch("${1:refundId}")',
      'puts "Refund: #{refund}"',
    ],
  },
];