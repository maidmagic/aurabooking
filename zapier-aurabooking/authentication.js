module.exports = {
  type: "custom",
  test: {
    url: "{{bundle.authData.apiUrl}}/api/health",
    method: "GET",
    params: {},
    headers: {
      "X-Api-Key": "{{bundle.authData.apiKey}}",
    },
    body: {},
  },
  fields: [
    {
      key: "apiUrl",
      type: "string",
      required: true,
      default: "https://yourapp.vercel.app",
      helpText:
        "The URL where your AuraBooking instance is hosted (e.g. https://yourapp.vercel.app, no trailing slash).",
    },
    {
      key: "apiKey",
      type: "string",
      required: true,
      helpText:
        "Your AuraBooking webhook API key. Find this in Settings > Connections > Webhook Lead Receiver.",
    },
  ],
  connectionLabel: "AuraBooking",
};
