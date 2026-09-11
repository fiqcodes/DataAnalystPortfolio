-- PROPOSED FOLLOW-UP, not the source of the displayed historical metrics.
-- Requires a database rerun. Do not label existing rates as completed retention.
-- Preserve first-completed-order cohorts, restrict later activity to Complete,
-- and generate zero-count eligible months rather than dropping them.
WITH first_complete AS (
  SELECT user_id, MIN(DATE_TRUNC(DATE(created_at), MONTH)) AS cohort_month
  FROM `sql-project-376612.thelook_ecommerce.orders`
  WHERE status = 'Complete'
  GROUP BY user_id
),
cohort_sizes AS (
  SELECT cohort_month, COUNT(*) AS cohort_size
  FROM first_complete
  WHERE EXTRACT(YEAR FROM cohort_month) = 2022
  GROUP BY cohort_month
),
activity AS (
  SELECT DISTINCT
    o.user_id, c.cohort_month,
    DATE_DIFF(DATE_TRUNC(DATE(o.created_at), MONTH), c.cohort_month, MONTH)
      AS month_number
  FROM `sql-project-376612.thelook_ecommerce.orders` AS o
  JOIN first_complete AS c ON o.user_id = c.user_id
  WHERE EXTRACT(YEAR FROM c.cohort_month) = 2022
    AND EXTRACT(YEAR FROM o.created_at) = 2022
    AND o.status = 'Complete'
),
observed_months AS (
  SELECT s.*, month_number
  FROM cohort_sizes AS s
  CROSS JOIN UNNEST(GENERATE_ARRAY(0,
    DATE_DIFF(DATE '2022-12-01', s.cohort_month, MONTH))) AS month_number
)
SELECT
  m.cohort_month, m.cohort_size, m.month_number,
  COUNT(a.user_id) AS completed_buyers,
  SAFE_DIVIDE(COUNT(a.user_id), m.cohort_size) AS completed_purchase_rate
FROM observed_months AS m
LEFT JOIN activity AS a
  ON a.cohort_month = m.cohort_month AND a.month_number = m.month_number
GROUP BY m.cohort_month, m.cohort_size, m.month_number
ORDER BY m.cohort_month, m.month_number;
