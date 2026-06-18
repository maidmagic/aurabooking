# Missed Call Text — Feature Spec

## Goal
When a patient calls a business's Twilio number and the business doesn't pick up, auto-send a customizable SMS to the patient from the business number. The conversation appears in the inbox so the business can continue the chat.

## Flow
1. Patient calls the business's Twilio number
2. Twilio hits `POST /api/webhooks/twilio/voice` — returns TwiML instructing Twilio to forward (`<Dial>`) to the business's real phone
3. Call rings the business's phone for 15 seconds. If unanswered, Twilio sends `POST /api/webhooks/twilio/voice-status` with `DialCallStatus=no-answer`
4. Our handler sends the custom SMS to the patient from the business's Twilio number
5. A conversation is created/found (channel: `sms`) and the auto-text is stored as an AI message, so it shows up in the inbox

## Data Model
Store voice settings in `integrations.metadata` (JSONB):
```json
{
  "forward_phone": "+15551234567",
  "missed_call_message": "We missed your call! Text us back and we'll help you out.",
  "missed_call_enabled": true
}
```

Default message: *"We missed your call! Text us back and we'll help you out."*

## New Endpoints

### `POST /api/webhooks/twilio/voice`
- Called by Twilio when an incoming call arrives
- Reads `integrations.metadata.forward_phone`
- Returns TwiML: `<Response><Dial timeout="15" action="/api/webhooks/twilio/voice-status"><Number>{forward_phone}</Number></Dial></Response>`
- Content-Type: `text/xml`

### `POST /api/webhooks/twilio/voice-status`
- Called by Twilio after dial attempt completes
- Reads `DialCallStatus` from form data
- If `DialCallStatus === "no-answer"`:
  - Send SMS to `From` number
  - Find/create conversation
  - Store auto-text message
- Returns `200 OK` (empty TwiML or JSON)

## Existing Changes

### `src/app/api/integrations/twilio/route.ts` (POST handler)
- Accept new fields in body: `forward_phone`, `missed_call_message`, `missed_call_enabled`
- Store in `integrations.metadata`

### `src/app/(dashboard)/integrations/page.tsx`
- Add to Twilio card:
  - Toggle: Enable Missed Call Text
  - Text input: Forwarding phone number
  - Textarea: Custom missed call message (with default placeholder)

## Configuration
- Per-business, stored in Twilio integration metadata
- Toggle-able on/off
- Customizable message with a sensible default
- Forwarding phone number required when enabled

## Security
- Twilio signature validation on both voice webhook endpoints
- Rate limiting considered (one SMS per missed call)

## Future (not building now)
- Call Pop (contact lookup on inbound call)
- Phone analytics dashboard
- Multiple forwarding destinations
- Voicemail transcription
