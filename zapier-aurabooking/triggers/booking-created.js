module.exports = {
  key: "booking_created",
  noun: "Booking",
  display: {
    label: "New Booking",
    description: "Triggers when a new appointment is booked.",
  },

  operation: {
    type: "hook",

    inputFields: [],

    performSubscribe: {
      url: "{{bundle.authData.apiUrl}}/api/integrations/webhooks/zapier/subscribe",
      method: "POST",
      params: {},
      body: {
        event_type: "booking.created",
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
        event_type: "booking.created",
      },
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": "{{bundle.authData.apiKey}}",
      },
    },

    perform: {
      url: "{{bundle.authData.apiUrl}}/api/integrations/webhooks/zapier/samples?event_type=booking.created",
      method: "GET",
      params: {},
      headers: {
        "X-Api-Key": "{{bundle.authData.apiKey}}",
      },
    },

    sample: {
      id: "abc123",
      customer_name: "Jane Smith",
      customer_phone: "+15551234567",
      service_name: "Teeth Whitening",
      start_time: "2026-06-18T14:00:00Z",
      end_time: "2026-06-18T14:30:00Z",
      status: "confirmed",
      payment_status: "unpaid",
      created_at: "2026-06-17T10:00:00Z",
    },

    outputFields: [
      { key: "id", label: "Booking ID", type: "string" },
      { key: "customer_name", label: "Customer Name", type: "string" },
      { key: "customer_phone", label: "Customer Phone", type: "string" },
      { key: "service_name", label: "Service Name", type: "string" },
      { key: "start_time", label: "Start Time", type: "datetime" },
      { key: "end_time", label: "End Time", type: "datetime" },
      { key: "status", label: "Status", type: "string" },
      { key: "payment_status", label: "Payment Status", type: "string" },
    ],
  },
};
