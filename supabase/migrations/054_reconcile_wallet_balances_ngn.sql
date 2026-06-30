-- Recompute wallet balances from the transaction ledger in NGN.
-- Fixes inflated balances caused by multiplying wallets.balance during USD→NGN migration
-- when balances already contained NGN amounts.

CREATE OR REPLACE FUNCTION wallet_tx_amount_ngn(
  p_amount NUMERIC,
  p_currency TEXT,
  p_metadata JSONB,
  p_rate NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE`
AS $$
DECLARE
  v_original_amount NUMERIC;
  v_original_currency TEXT;
  v_charged_amount NUMERIC;
BEGIN
  IF p_metadata IS NOT NULL THEN
    v_original_currency := upper(btrim(COALESCE(p_metadata->>'original_currency', '')));
    v_original_amount := NULLIF(btrim(COALESCE(p_metadata->>'original_amount', '')), '')::NUMERIC;

    IF v_original_currency = 'NGN' AND v_original_amount IS NOT NULL AND v_original_amount > 0 THEN
      RETURN ROUND(v_original_amount, 2);
    END IF;

    IF upper(btrim(COALESCE(p_metadata->>'charged_currency', ''))) = 'NGN' THEN
      v_charged_amount := NULLIF(btrim(COALESCE(p_metadata->>'charged_amount', '')), '')::NUMERIC;
      IF v_charged_amount IS NOT NULL AND v_charged_amount > 0 THEN
        RETURN ROUND(v_charged_amount, 2);
      END IF;
    END IF;
  END IF;

  IF upper(COALESCE(p_currency, 'USD')) = 'NGN' THEN
    RETURN ROUND(COALESCE(p_amount, 0), 2);
  END IF;

  RETURN ROUND(COALESCE(p_amount, 0) * p_rate, 2);
END;
$$;

CREATE OR REPLACE FUNCTION reconcile_wallet_balances()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate NUMERIC;
  v_updated INTEGER := 0;
BEGIN
  SELECT COALESCE(NULLIF(value->'exchangeRates'->>'NGN', '')::NUMERIC, 1450)
  INTO v_rate
  FROM site_content_blocks
  WHERE key = 'wallet'
  LIMIT 1;

  IF v_rate IS NULL OR v_rate <= 0 THEN
    v_rate := 1450;
  END IF;

  UPDATE wallet_transactions wt
  SET
    amount = wallet_tx_amount_ngn(wt.amount, wt.currency, wt.metadata, v_rate),
    currency = 'NGN'
  WHERE wt.status = 'completed';

  INSERT INTO wallets (user_id, balance)
  SELECT DISTINCT wt.user_id, 0
  FROM wallet_transactions wt
  WHERE wt.status = 'completed'
  ON CONFLICT (user_id) DO NOTHING;

  WITH ledger AS (
    SELECT
      wt.user_id,
      ROUND(
        SUM(
          CASE wt.kind
            WHEN 'purchase' THEN -wt.amount
            ELSE wt.amount
          END
        ),
        2
      ) AS balance_ngn
    FROM wallet_transactions wt
    WHERE wt.status = 'completed'
    GROUP BY wt.user_id
  )
  UPDATE wallets w
  SET balance = COALESCE(l.balance_ngn, 0)
  FROM ledger l
  WHERE w.user_id = l.user_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  UPDATE wallets w
  SET balance = 0
  WHERE NOT EXISTS (
    SELECT 1
    FROM wallet_transactions wt
    WHERE wt.user_id = w.user_id
      AND wt.status = 'completed'
  );

  RETURN v_updated;
END;
$$;

SELECT reconcile_wallet_balances();

GRANT EXECUTE ON FUNCTION reconcile_wallet_balances() TO service_role;

COMMENT ON FUNCTION wallet_tx_amount_ngn(NUMERIC, TEXT, JSONB, NUMERIC)
  IS 'Normalize a wallet transaction amount to NGN using metadata, currency, or legacy USD rate.';

COMMENT ON FUNCTION reconcile_wallet_balances()
  IS 'Recompute all wallet balances from completed transactions in NGN. Safe to re-run.';
