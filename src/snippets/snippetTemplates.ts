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
  // PAYMENTS APIs - TypeScript/JavaScript
  // ============================================
  {
    id: 'payment.capture-ts',
    name: 'Capture Payment',
    description: 'Capture an authorized payment',
    category: 'payment',
    language: ['typescript', 'javascript'],
    prefix: 'razorpay-payment-capture',
    body: [
      'const payment = await razorpay.payments.capture(${1:"paymentId"}, ${2:50000}, ${3:"INR"});',
      '',
      'console.log("Payment captured:", payment.id);',
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
    id: 'payment.capture-python',
    name: 'Capture Payment',
    description: 'Capture an authorized payment',
    category: 'payment',
    language: ['python'],
    prefix: 'razorpay-payment-capture',
    body: [
      'payment = razorpay_client.payment.capture("${1:paymentId}", ${2:50000})',
      'print(f"Payment captured: {payment[\'id\']}")',
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
];

