module.exports = {
  key: "payment_received",
  noun: "Payment",
  display: {
    label: "Payment Received",
    description: "Triggers when a deposit or payment is completed.",
  },

  operation: {
    type: "hook",

    inputFields: [],

    performSubscribe: {
      url: "{{bundle.authData.apiUrl}}/api/integrations/webhooks/zapier/subscribe",
      method: "POST",
      params: {},
      body: {
        event_type: "payment.completed",
        target_url: "{{bundle.targetUrl}}",
      },
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": "{{bundle.authData.apiKey}}",
      },
    },

    performUnsubscribe: {
      url: "{{bundle.authData.apiUrl}}/api/integrations/webhooks/zapier/unsubscribe",
      method: "POST",
      params: {},
      body: {
        target_url: "{{bundle.targetUrl}}",
        event_type: "payment.completed",
      },
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": "{{bundle.authData.apiKey}}",
      },
    },

    perform: {
      url: "{{bundle.authData.apiUrl}}/api/integrations/webhooks/zapier/samples?event_type=payment.completed",
      method: "GET",
      params: {},
      headers: {
        "X-Api-Key": "{{bundle.authData.apiKey}}",
      },
    },

    sample: {
      id: "pay_abc123",
      amount: 5000,
      status: "paid",
      customer_name: "Jane Smith",
      service_name: "Teeth Whitening",
      paid_at: "2026-06-17T10:30:00Z",
      created_at: "2026-06-17T10:00:00Z",
    },

    outputFields: [
      { key: "id", label: "Payment ID", type: "string" },
      { key: "amount", label: "Amount (cents)", type: "integer" },
      { key: "status", label: "Status", type: "string" },
      { key: "customer_name", label: "Customer Name", type: "string" },
      { key: "service_name", label: "Service Name", type: "string" },
      { key: "paid_at", label: "Paid At", type: "datetime" },
    ],
  },
};
