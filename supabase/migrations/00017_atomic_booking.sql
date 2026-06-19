-- Atomic booking: wraps appointment insert + slot_hold insert in a Postgres transaction
-- Prevents orphaned data from mid-crash between multi-table mutations

CREATE OR REPLACE FUNCTION public.execute_safe_booking(
  p_user_id UUID,
  p_conversation_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_service_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_idempotency_key TEXT,
  p_payment_status TEXT DEFAULT 'unpaid',
  p_deposit_required BOOLEAN DEFAULT false,
  p_pms_appointment_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_appointment_id UUID;
  v_conflict_id UUID;
  v_hold_id UUID;
BEGIN
  -- Idempotency: return existing if this key was already processed
  SELECT id INTO v_appointment_id
  FROM public.appointments
  WHERE idempotency_key = p_idempotency_key
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'appointment_id', v_appointment_id
    );
  END IF;

  -- Double-book prevention: check for existing non-cancelled appointment at this time
  SELECT id INTO v_conflict_id
  FROM public.appointments
  WHERE user_id = p_user_id
    AND start_time = p_start_time
    AND status <> 'cancelled'
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'That time slot has already been booked. Please check availability for an alternative.'
    );
  END IF;

  -- Check for active slot holds at this time
  SELECT id INTO v_hold_id
  FROM public.slot_holds
  WHERE user_id = p_user_id
    AND start_time = p_start_time
    AND end_time = p_end_time
    AND released = false
    AND expires_at > now()
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'That time slot is currently on hold for another customer. Please check availability for an alternative.'
    );
  END IF;

  -- Atomic insert: appointment + optional slot_hold inside same transaction
  INSERT INTO public.appointments (
    user_id, conversation_id, customer_name, customer_phone,
    service_id, start_time, end_time, payment_status, idempotency_key,
    pms_appointment_id
  ) VALUES (
    p_user_id, p_conversation_id, p_customer_name, p_customer_phone,
    p_service_id, p_start_time, p_end_time, p_payment_status, p_idempotency_key,
    p_pms_appointment_id
  )
  RETURNING id INTO v_appointment_id;

  IF p_deposit_required THEN
    INSERT INTO public.slot_holds (
      user_id, start_time, end_time,
      expires_at, conversation_id
    ) VALUES (
      p_user_id, p_start_time, p_end_time,
      now() + interval '10 minutes', p_conversation_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'appointment_id', v_appointment_id,
    'deposit_required', p_deposit_required
  );

EXCEPTION
  WHEN unique_violation THEN
    -- idempotency_key collision from concurrent request
    SELECT id INTO v_appointment_id
    FROM public.appointments
    WHERE idempotency_key = p_idempotency_key
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent', true,
        'appointment_id', v_appointment_id
      );
    END IF;

    RETURN jsonb_build_object(
      'success', false,
      'error', 'A concurrent booking request was detected. Please try again.'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;
