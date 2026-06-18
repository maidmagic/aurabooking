module.exports = {
  key: "lead_created",
  noun: "Lead",
  display: {
    label: "New Lead",
    description: "Triggers when a new lead comes in via webhook (Zapier, Gravity Forms, Unbounce, etc.).",
  },

  operation: {
    type: "hook",

    inputFields: [],

    performSubscribe: {
      url: "{{bundle.authData.apiUrl}}/api/integrations/webhooks/zapier/subscribe",
      method: "POST",
      params: {},
      body: {
        event_type: "lead.created",
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
        event_type: "lead.created",
      },
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": "{{bundle.authData.apiKey}}",
      },
    },

    perform: {
      url: "{{bundle.authData.apiUrl}}/api/integrations/webhooks/zapier/samples?event_type=lead.created",
      method: "GET",
      params: {},
      headers: {
        "X-Api-Key": "{{bundle.authData.apiKey}}",
      },
    },

    sample: {
      id: "conv_abc123",
      customer_name: "John Doe",
      customer_phone: "+15559876543",
      channel: "webhook",
      status: "new",
      ai_active: true,
      created_at: "2026-06-17T10:00:00Z",
    },

    outputFields: [
      { key: "id", label: "Lead / Conversation ID", type: "string" },
      { key: "customer_name", label: "Customer Name", type: "string" },
      { key: "customer_phone", label: "Customer Phone", type: "string" },
      { key: "channel", label: "Source Channel", type: "string" },
      { key: "status", label: "Status", type: "string" },
      { key: "ai_active", label: "AI Active", type: "boolean" },
      { key: "created_at", label: "Created At", type: "datetime" },
    ],
  },
};
