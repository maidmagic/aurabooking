module.exports = {
  key: "create_lead",
  noun: "Lead",
  display: {
    label: "Create Lead",
    description: "Creates a new lead/conversation in AuraBooking.",
  },

  operation: {
    inputFields: [
      {
        key: "name",
        label: "Customer Name",
        type: "string",
        required: true,
        helpText: "The customer's full name.",
      },
      {
        key: "phone",
        label: "Customer Phone",
        type: "string",
        required: true,
        helpText: "Customer phone number including country code (e.g. +15551234567).",
      },
      {
        key: "email",
        label: "Customer Email",
        type: "string",
        required: false,
      },
      {
        key: "message",
        label: "Initial Message",
        type: "text",
        required: false,
        helpText: "Optional message from the customer.",
      },
      {
        key: "source",
        label: "Source",
        type: "string",
        required: false,
        default: "zapier",
        helpText: "Where this lead came from.",
      },
    ],

    perform: {
      url: "{{bundle.authData.apiUrl}}/api/webhooks/lead",
      method: "POST",
      params: {},
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": "{{bundle.authData.apiKey}}",
      },
      body: {
        name: "{{bundle.inputData.name}}",
        phone: "{{bundle.inputData.phone}}",
        email: "{{bundle.inputData.email}}",
        message: "{{bundle.inputData.message}}",
        source: "{{bundle.inputData.source}}",
      },
    },

    sample: {
      success: true,
      conversation_id: "conv_abc123",
    },

    outputFields: [
      { key: "success", label: "Success", type: "boolean" },
      { key: "conversation_id", label: "Conversation ID", type: "string" },
    ],
  },
};
