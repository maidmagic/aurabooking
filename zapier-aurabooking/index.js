const authentication = require("./authentication");
const BookingCreatedTrigger = require("./triggers/booking-created");
const LeadCreatedTrigger = require("./triggers/lead-created");
const PaymentReceivedTrigger = require("./triggers/payment-received");
const CreateLeadAction = require("./actions/create-lead");

module.exports = {
  version: require("./package.json").version,
  platformVersion: require("zapier-platform-core").version,

  authentication,

  beforeRequest: [
    (request) => {
      request.headers["X-Api-Key"] = request.authData.apiKey;
      request.headers["Content-Type"] = "application/json";
      return request;
    },
  ],

  afterResponse: [
    (response) => {
      if (response.status === 401) {
        throw new Error("The API Key is invalid or disabled.");
      }
      return response;
    },
  ],

  triggers: {
    [BookingCreatedTrigger.key]: BookingCreatedTrigger,
    [LeadCreatedTrigger.key]: LeadCreatedTrigger,
    [PaymentReceivedTrigger.key]: PaymentReceivedTrigger,
  },

  creates: {
    [CreateLeadAction.key]: CreateLeadAction,
  },

  searchOrCreates: {},
};
