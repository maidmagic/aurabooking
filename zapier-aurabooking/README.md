# Zapier AuraBooking

Zapier integration app for AuraBooking — AI-powered appointment booking for service businesses.

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run tests:

   ```bash
   npm test
   ```

3. Push to Zapier:

   ```bash
   npx zapier push
   ```

> You'll need the [Zapier CLI](https://platform.zapier.com/cli_tutorials/getting-started) installed and logged in first.

## Triggers

| Trigger       | Description                              |
|---------------|------------------------------------------|
| New Booking   | Fires when a new appointment is booked.  |
| New Lead      | Fires when a new lead is received.       |
| Payment       | Fires when a deposit/payment completes.  |

## Actions

| Action       | Description                              |
|--------------|------------------------------------------|
| Create Lead  | Creates a new lead in AuraBooking.       |
