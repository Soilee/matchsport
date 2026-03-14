-- ============================================================
-- MatchSport Migration V4 - Professional Payments & Installments
-- ============================================================

-- 1. NEW TABLE: INSTALLMENTS
CREATE TABLE IF NOT EXISTS installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENHANCED PAYMENT TRIGGER
CREATE OR REPLACE FUNCTION fn_extend_membership_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_months INTEGER;
  v_membership RECORD;
  v_new_end DATE;
  v_remaining INTEGER;
  v_base_date DATE;
  v_total_price NUMERIC(10, 2);
  v_installment_amount NUMERIC(10, 2);
  v_i INTEGER;
BEGIN
  -- We only extend on completed state
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  -- Double count protection
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Determine months
  IF NEW.package_type ILIKE '%12_month%' OR NEW.package_type ILIKE '%1_yil%' OR NEW.package_type ILIKE '%6+6%' THEN v_months := 12;
  ELSIF NEW.package_type ILIKE '%6_month%' THEN v_months := 6;
  ELSIF NEW.package_type ILIKE '%3_month%' THEN v_months := 3;
  ELSE v_months := 1;
  END IF;

  -- Find membership
  SELECT * INTO v_membership FROM memberships WHERE user_id = NEW.user_id ORDER BY end_date DESC LIMIT 1;

  v_total_price := COALESCE(NEW.total_price, NEW.amount);

  IF v_membership IS NOT NULL THEN
    v_base_date := GREATEST(v_membership.end_date, CURRENT_DATE);
    v_new_end := v_base_date + (v_months || ' months')::INTERVAL;
    v_remaining := (v_new_end - CURRENT_DATE);

    UPDATE memberships 
    SET 
      end_date = v_new_end,
      remaining_days = v_remaining,
      status = 'active',
      package_type = NEW.package_type,
      amount = COALESCE(amount, 0) + NEW.amount,
      total_price = v_total_price,
      next_payment_date = CASE 
        WHEN v_total_price > (COALESCE(amount, 0) + NEW.amount)
        THEN CURRENT_DATE + '30 days'::INTERVAL
        ELSE NULL
      END
    WHERE id = v_membership.id;

    NEW.membership_id := v_membership.id;
  ELSE
    v_new_end := CURRENT_DATE + (v_months || ' months')::INTERVAL;
    v_remaining := (v_new_end - CURRENT_DATE);

    INSERT INTO memberships (user_id, start_date, end_date, total_days, remaining_days, status, package_type, amount, total_price, next_payment_date)
    VALUES (
      NEW.user_id, CURRENT_DATE, v_new_end, v_months * 30, v_remaining, 'active', NEW.package_type, NEW.amount, 
      v_total_price,
      CASE WHEN v_total_price > NEW.amount THEN CURRENT_DATE + '30 days'::INTERVAL ELSE NULL END
    )
    RETURNING id INTO NEW.membership_id;
  END IF;

  -- Generate Installments if type is 'installment'
  IF NEW.payment_type = 'installment' AND NEW.installment_count > 1 THEN
    -- First installment is usually paid now, so we create remaining ones
    v_installment_amount := (v_total_price - NEW.amount) / (NEW.installment_count - 1);
    
    FOR v_i IN 1..(NEW.installment_count - 1) LOOP
      INSERT INTO installments (membership_id, user_id, amount, due_date, status)
      VALUES (NEW.membership_id, NEW.user_id, v_installment_amount, CURRENT_DATE + (v_i * 30 || ' days')::INTERVAL, 'pending');
    END LOOP;
  END IF;

  -- Audit log
  INSERT INTO audit_logs (action, actor_id, target_id, details)
  VALUES ('PAYMENT_COMPLETED', NEW.processed_by, NEW.user_id, jsonb_build_object('payment_id', NEW.id, 'amount', NEW.amount, 'total_price', v_total_price, 'installments', NEW.installment_count));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE installments;
