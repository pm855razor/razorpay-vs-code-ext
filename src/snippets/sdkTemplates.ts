import type { ProjectType } from '../utils/projectDetector';

export interface SDKTemplate {
  projectType: ProjectType;
  name: string;
  description: string;
  code: string;
  installCommand?: string;
}

/**
 * SDK integration templates for different project types.
 * Based on Razorpay official documentation.
 */
export const sdkTemplates: Record<ProjectType, SDKTemplate> = {
  web: {
    projectType: 'web',
    name: 'Web Checkout Integration',
    description: 'Standard Razorpay Checkout.js integration for HTML/JavaScript',
    code: `<button id="rzp-button1">Pay</button>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
var options = {
    "key": "YOUR_KEY_ID", // Enter the Key ID generated from the Dashboard
    "amount": "50000", // Amount is in currency subunits. 
    "currency": "INR",
    "name": "Acme Corp", //your business name
    "description": "Test Transaction",
    "image": "https://example.com/your_logo",
    "order_id": "order_9A33XWu170gUtm", // This is a sample Order ID. Pass the \`id\` obtained in the response of Step 1
    "handler": function (response){
        alert(response.razorpay_payment_id);
        alert(response.razorpay_order_id);
        alert(response.razorpay_signature);
    },
    "prefill": {
        "name": "John Smith", //your customer's name
        "email": "john.smith@example.com",
        "contact": "+11234567890" //Provide the customer's phone number for better conversion rates 
    },
    "notes": {
        "address": "Razorpay Corporate Office"
    },
    "theme": {
        "color": "#3399cc"
    }
};
var rzp1 = new Razorpay(options);
document.getElementById('rzp-button1').onclick = function(e){
    rzp1.open();
    e.preventDefault();
}
</script>`,
  },

  react: {
    projectType: 'react',
    name: 'React Integration',
    description: 'Razorpay integration for React applications',
    code: `import React, { useEffect } from 'react';

function PaymentButton({ orderId, amount, keyId }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = () => {
    const options = {
      key: keyId, // Your Razorpay Key ID
      amount: amount, // Amount in paise
      currency: 'INR',
      name: 'Your Company Name',
      description: 'Test Transaction',
      order_id: orderId, // Order ID from your server
      handler: function (response) {
        alert('Payment successful!');
        alert('Payment ID: ' + response.razorpay_payment_id);
        // Send payment details to your server for verification
      },
      prefill: {
        name: 'Customer Name',
        email: 'customer@example.com',
        contact: '+919999999999'
      },
      theme: {
        color: '#3399cc'
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <button onClick={handlePayment}>
      Pay Now
    </button>
  );
}

export default PaymentButton;`,
    installCommand: 'npm install react-razorpay',
  },

  nextjs: {
    projectType: 'nextjs',
    name: 'Next.js Integration',
    description: 'Razorpay integration for Next.js applications',
    code: `'use client';

import { useEffect } from 'react';

export default function PaymentButton({ orderId, amount, keyId }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handlePayment = () => {
    const options = {
      key: keyId, // Your Razorpay Key ID
      amount: amount, // Amount in paise
      currency: 'INR',
      name: 'Your Company Name',
      description: 'Test Transaction',
      order_id: orderId, // Order ID from your server
      handler: function (response) {
        // Handle payment success
        console.log('Payment ID:', response.razorpay_payment_id);
        // Send payment details to your API route for verification
        fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });
      },
      prefill: {
        name: 'Customer Name',
        email: 'customer@example.com',
        contact: '+919999999999'
      },
      theme: {
        color: '#3399cc'
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <button onClick={handlePayment} className="pay-button">
      Pay Now
    </button>
  );
}`,
    installCommand: 'npm install razorpay',
  },

  vue: {
    projectType: 'vue',
    name: 'Vue.js Integration',
    description: 'Razorpay integration for Vue.js applications',
    code: `<template>
  <button @click="handlePayment">Pay Now</button>
</template>

<script>
export default {
  name: 'PaymentButton',
  props: {
    orderId: String,
    amount: Number,
    keyId: String
  },
  mounted() {
    // Load Razorpay checkout script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  },
  methods: {
    handlePayment() {
      const options = {
        key: this.keyId, // Your Razorpay Key ID
        amount: this.amount, // Amount in paise
        currency: 'INR',
        name: 'Your Company Name',
        description: 'Test Transaction',
        order_id: this.orderId, // Order ID from your server
        handler: (response) => {
          alert('Payment successful!');
          alert('Payment ID: ' + response.razorpay_payment_id);
          // Send payment details to your server for verification
        },
        prefill: {
          name: 'Customer Name',
          email: 'customer@example.com',
          contact: '+919999999999'
        },
        theme: {
          color: '#3399cc'
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    }
  }
}
</script>`,
    installCommand: 'npm install razorpay',
  },

  angular: {
    projectType: 'angular',
    name: 'Angular Integration',
    description: 'Razorpay integration for Angular applications',
    code: `import { Component, OnInit } from '@angular/core';

declare var Razorpay: any;

@Component({
  selector: 'app-payment',
  template: '<button (click)="handlePayment()">Pay Now</button>'
})
export class PaymentComponent implements OnInit {
  orderId: string = 'order_xxx';
  amount: number = 50000;
  keyId: string = 'YOUR_KEY_ID';

  ngOnInit() {
    // Load Razorpay checkout script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }

  handlePayment() {
    const options = {
      key: this.keyId, // Your Razorpay Key ID
      amount: this.amount, // Amount in paise
      currency: 'INR',
      name: 'Your Company Name',
      description: 'Test Transaction',
      order_id: this.orderId, // Order ID from your server
      handler: (response: any) => {
        alert('Payment successful!');
        alert('Payment ID: ' + response.razorpay_payment_id);
        // Send payment details to your server for verification
      },
      prefill: {
        name: 'Customer Name',
        email: 'customer@example.com',
        contact: '+919999999999'
      },
      theme: {
        color: '#3399cc'
      }
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }
}`,
    installCommand: 'npm install razorpay',
  },

  android: {
    projectType: 'android',
    name: 'Android Integration',
    description: 'Razorpay integration for Android (Kotlin)',
    code: `import com.razorpay.Checkout
import com.razorpay.PaymentResultListener
import org.json.JSONObject

class PaymentActivity : AppCompatActivity(), PaymentResultListener {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_payment)
        
        val button = findViewById<Button>(R.id.payButton)
        button.setOnClickListener {
            startPayment()
        }
    }
    
    private fun startPayment() {
        val checkout = Checkout()
        checkout.setKeyID("YOUR_KEY_ID") // Your Razorpay Key ID
        
        try {
            val options = JSONObject()
            options.put("name", "Your Company Name")
            options.put("description", "Test Payment")
            options.put("order_id", "order_xxx") // Order ID from your server
            options.put("currency", "INR")
            options.put("amount", "50000") // Amount in paise
            
            val prefill = JSONObject()
            prefill.put("email", "customer@example.com")
            prefill.put("contact", "9999999999")
            options.put("prefill", prefill)
            
            checkout.open(this, options)
        } catch (e: Exception) {
            Toast.makeText(this, "Error in payment: " + e.message, Toast.LENGTH_LONG).show()
        }
    }
    
    override fun onPaymentSuccess(razorpayPaymentId: String?) {
        Toast.makeText(this, "Payment successful: " + razorpayPaymentId, Toast.LENGTH_LONG).show()
        // Send payment details to your server for verification
    }
    
    override fun onPaymentError(code: Int, description: String?) {
        Toast.makeText(this, "Payment failed: $description", Toast.LENGTH_LONG).show()
    }
}`,
    installCommand: 'Add to build.gradle: implementation \'com.razorpay:razorpay-android:1.6.33\'',
  },

  ios: {
    projectType: 'ios',
    name: 'iOS Integration',
    description: 'Razorpay integration for iOS (Swift)',
    code: `import UIKit
import Razorpay

class PaymentViewController: UIViewController, RazorpayPaymentCompletionProtocol {
    
    var razorpay: RazorpayCheckout!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        razorpay = RazorpayCheckout.initWithKey("YOUR_KEY_ID", andDelegate: self)
    }
    
    @IBAction func payButtonTapped(_ sender: UIButton) {
        startPayment()
    }
    
    func startPayment() {
        let options: [String:Any] = [
            "amount": "50000", // Amount in paise
            "currency": "INR",
            "description": "Test Payment",
            "order_id": "order_xxx", // Order ID from your server
            "name": "Your Company Name",
            "prefill": [
                "email": "customer@example.com",
                "contact": "9999999999"
            ],
            "theme": [
                "color": "#3399cc"
            ]
        ]
        
        razorpay.open(options)
    }
    
    func onPaymentSuccess(_ payment_id: String, andData response: [String : Any]?) {
        print("Payment successful: \\(payment_id)")
        // Send payment details to your server for verification
    }
    
    func onPaymentError(_ code: Int, description str: String, andData response: [String : Any]?) {
        print("Payment failed: \\(str)")
    }
}`,
    installCommand: 'Add to Podfile: pod \'razorpay-pod\', \'~> 1.2.0\'',
  },

  flutter: {
    projectType: 'flutter',
    name: 'Flutter Integration',
    description: 'Razorpay integration for Flutter applications',
    code: `import 'package:flutter/material.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

class PaymentPage extends StatefulWidget {
  @override
  _PaymentPageState createState() => _PaymentPageState();
}

class _PaymentPageState extends State<PaymentPage> {
  late Razorpay _razorpay;
  
  @override
  void initState() {
    super.initState();
    _razorpay = Razorpay();
    _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
    _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
    _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }
  
  @override
  void dispose() {
    super.dispose();
    _razorpay.clear();
  }
  
  void openCheckout() async {
    var options = {
      'key': 'YOUR_KEY_ID', // Your Razorpay Key ID
      'amount': 50000, // Amount in paise
      'name': 'Your Company Name',
      'description': 'Test Payment',
      'order_id': 'order_xxx', // Order ID from your server
      'prefill': {
        'contact': '9999999999',
        'email': 'customer@example.com'
      },
      'external': {
        'wallets': ['paytm']
      }
    };
    
    try {
      _razorpay.open(options);
    } catch (e) {
      debugPrint('Error: \$e');
    }
  }
  
  void _handlePaymentSuccess(PaymentSuccessResponse response) {
    print("Payment successful: \${response.paymentId}");
    // Send payment details to your server for verification
  }
  
  void _handlePaymentError(PaymentFailureResponse response) {
    print("Payment failed: \${response.message}");
  }
  
  void _handleExternalWallet(ExternalWalletResponse response) {
    print("External wallet: \${response.walletName}");
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Payment')),
      body: Center(
        child: ElevatedButton(
          onPressed: openCheckout,
          child: Text('Pay Now'),
        ),
      ),
    );
  }
}`,
    installCommand: 'flutter pub add razorpay_flutter',
  },

  node: {
    projectType: 'node',
    name: 'Node.js Server Integration',
    description: 'Razorpay server-side integration for Node.js',
    code: `const Razorpay = require('razorpay');
const express = require('express');
const app = express();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Order
app.post('/create-order', async (req, res) => {
  try {
    const options = {
      amount: 50000, // Amount in paise
      currency: 'INR',
      receipt: 'receipt_001',
      notes: {
        key1: 'value1',
        key2: 'value2'
      }
    };
    
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Verify Payment
app.post('/verify-payment', async (req, res) => {
  const { order_id, payment_id, signature } = req.body;
  
  const crypto = require('crypto');
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(order_id + '|' + payment_id)
    .digest('hex');
  
  if (generated_signature === signature) {
    res.json({ success: true, message: 'Payment verified' });
  } else {
    res.status(400).json({ success: false, message: 'Payment verification failed' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`,
    installCommand: 'npm install razorpay',
  },

  python: {
    projectType: 'python',
    name: 'Python Server Integration',
    description: 'Razorpay server-side integration for Python',
    code: `import razorpay
import os
from flask import Flask, request, jsonify

app = Flask(__name__)

# Initialize Razorpay
razorpay_client = razorpay.Client(
    auth=(os.getenv('RAZORPAY_KEY_ID'), os.getenv('RAZORPAY_KEY_SECRET'))
)

# Create Order
@app.route('/create-order', methods=['POST'])
def create_order():
    try:
        order_data = {
            'amount': 50000,  # Amount in paise
            'currency': 'INR',
            'receipt': 'receipt_001',
            'notes': {
                'key1': 'value1',
                'key2': 'value2'
            }
        }
        
        order = razorpay_client.order.create(data=order_data)
        return jsonify(order)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Verify Payment
@app.route('/verify-payment', methods=['POST'])
def verify_payment():
    import hmac
    import hashlib
    
    order_id = request.json.get('order_id')
    payment_id = request.json.get('payment_id')
    signature = request.json.get('signature')
    
    message = order_id + '|' + payment_id
    generated_signature = hmac.new(
        os.getenv('RAZORPAY_KEY_SECRET').encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    if generated_signature == signature:
        return jsonify({'success': True, 'message': 'Payment verified'})
    else:
        return jsonify({'success': False, 'message': 'Payment verification failed'}), 400

if __name__ == '__main__':
    app.run(port=3000)`,
    installCommand: 'pip install razorpay',
  },

  php: {
    projectType: 'php',
    name: 'PHP Server Integration',
    description: 'Razorpay server-side integration for PHP',
    code: `<?php
require 'vendor/autoload.php';

use Razorpay\\Api\\Api;

// Initialize Razorpay
$keyId = getenv('RAZORPAY_KEY_ID');
$keySecret = getenv('RAZORPAY_KEY_SECRET');
$api = new Api($keyId, $keySecret);

// Create Order
function createOrder() {
    global $api;
    
    $orderData = [
        'receipt' => 'receipt_001',
        'amount' => 50000, // Amount in paise
        'currency' => 'INR',
        'notes' => [
            'key1' => 'value1',
            'key2' => 'value2'
        ]
    ];
    
    try {
        $order = $api->order->create($orderData);
        return $order;
    } catch (Exception $e) {
        return ['error' => $e->getMessage()];
    }
}

// Verify Payment
function verifyPayment($orderId, $paymentId, $signature) {
    $keySecret = getenv('RAZORPAY_KEY_SECRET');
    $generated_signature = hash_hmac('sha256', $orderId . '|' . $paymentId, $keySecret);
    
    if ($generated_signature === $signature) {
        return ['success' => true, 'message' => 'Payment verified'];
    } else {
        return ['success' => false, 'message' => 'Payment verification failed'];
    }
}

// Example usage
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_SERVER['REQUEST_URI'] === '/create-order') {
    header('Content-Type: application/json');
    echo json_encode(createOrder());
}
?>`,
    installCommand: 'composer require razorpay/razorpay:2.*',
  },

  ruby: {
    projectType: 'ruby',
    name: 'Ruby Server Integration',
    description: 'Razorpay server-side integration for Ruby',
    code: `require 'razorpay'
require 'sinatra'

# Initialize Razorpay
Razorpay.setup(ENV['RAZORPAY_KEY_ID'], ENV['RAZORPAY_KEY_SECRET'])

# Create Order
post '/create-order' do
  begin
    order_params = {
      amount: 50000, # Amount in paise
      currency: 'INR',
      receipt: 'receipt_001',
      notes: {
        key1: 'value1',
        key2: 'value2'
      }
    }
    
    order = Razorpay::Order.create(order_params)
    order.to_json
  rescue => e
    status 500
    { error: e.message }.to_json
  end
end

# Verify Payment
post '/verify-payment' do
  require 'openssl'
  
  order_id = params[:order_id]
  payment_id = params[:payment_id]
  signature = params[:signature]
  
  message = order_id + '|' + payment_id
  generated_signature = OpenSSL::HMAC.hexdigest(
    OpenSSL::Digest.new('sha256'),
    ENV['RAZORPAY_KEY_SECRET'],
    message
  )
  
  if generated_signature == signature
    { success: true, message: 'Payment verified' }.to_json
  else
    status 400
    { success: false, message: 'Payment verification failed' }.to_json
  end
end`,
    installCommand: "gem 'razorpay'",
  },

  java: {
    projectType: 'java',
    name: 'Java Server Integration',
    description: 'Razorpay server-side integration for Java',
    code: `import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import org.json.JSONObject;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.MessageDigest;

public class RazorpayIntegration {
    
    private RazorpayClient razorpay;
    
    public RazorpayIntegration() {
        String keyId = System.getenv("RAZORPAY_KEY_ID");
        String keySecret = System.getenv("RAZORPAY_KEY_SECRET");
        razorpay = new RazorpayClient(keyId, keySecret);
    }
    
    // Create Order
    public JSONObject createOrder() {
        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", 50000); // Amount in paise
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "receipt_001");
            
            JSONObject notes = new JSONObject();
            notes.put("key1", "value1");
            notes.put("key2", "value2");
            orderRequest.put("notes", notes);
            
            return razorpay.Orders.create(orderRequest);
        } catch (RazorpayException e) {
            JSONObject error = new JSONObject();
            error.put("error", e.getMessage());
            return error;
        }
    }
    
    // Verify Payment
    public boolean verifyPayment(String orderId, String paymentId, String signature) {
        try {
            String message = orderId + "|" + paymentId;
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                System.getenv("RAZORPAY_KEY_SECRET").getBytes(),
                "HmacSHA256"
            );
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(message.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            String generatedSignature = hexString.toString();
            return generatedSignature.equals(signature);
        } catch (Exception e) {
            return false;
        }
    }
}`,
    installCommand: 'Add Maven/Gradle dependency: com.razorpay:razorpay-java',
  },

  go: {
    projectType: 'go',
    name: 'Go Server Integration',
    description: 'Razorpay server-side integration for Go',
    code: `package main

import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "fmt"
    "log"
    "os"
    
    "github.com/razorpay/razorpay-go"
)

func main() {
    // Initialize Razorpay
    keyID := os.Getenv("RAZORPAY_KEY_ID")
    keySecret := os.Getenv("RAZORPAY_KEY_SECRET")
    razorpayClient := razorpay.NewClient(keyID, keySecret)
    
    // Create Order
    orderParams := map[string]interface{}{
        "amount":   50000, // Amount in paise
        "currency": "INR",
        "receipt":  "receipt_001",
        "notes": map[string]string{
            "key1": "value1",
            "key2": "value2",
        },
    }
    
    order, err := razorpayClient.Order.Create(orderParams, nil)
    if err != nil {
        log.Fatal(err)
    }
    
    fmt.Printf("Order created: %s\\n", order["id"])
}

// Verify Payment
func verifyPayment(orderID, paymentID, signature string) bool {
    keySecret := os.Getenv("RAZORPAY_KEY_SECRET")
    message := orderID + "|" + paymentID
    
    mac := hmac.New(sha256.New, []byte(keySecret))
    mac.Write([]byte(message))
    generatedSignature := hex.EncodeToString(mac.Sum(nil))
    
    return generatedSignature == signature
}`,
    installCommand: 'go get github.com/razorpay/razorpay-go',
  },

  unknown: {
    projectType: 'unknown',
    name: 'Unknown Project Type',
    description: 'Project type could not be detected',
    code: '// Please select your project type manually or ensure your project has the required configuration files.',
  },
};

/**
 * Get SDK template for a project type
 */
export function getSDKTemplate(projectType: ProjectType): SDKTemplate {
  return sdkTemplates[projectType] || sdkTemplates.unknown;
}

