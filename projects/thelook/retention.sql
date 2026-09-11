-- Same cohort/activity definition as the documented analysis.
-- Entry: first completed order, across all available history.
-- Later activity: ANY order status. This is not completed-repeat-purchase retention.
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
    o.user_id,
    c.cohort_month,
    DATE_DIFF(DATE_TRUNC(DATE(o.created_at), MONTH), c.cohort_month, MONTH)
      AS month_number
  FROM `sql-project-376612.thelook_ecommerce.orders` AS o
  JOIN first_complete AS c ON o.user_id = c.user_id
  WHERE EXTRACT(YEAR FROM c.cohort_month) = 2022
    AND EXTRACT(YEAR FROM o.created_at) = 2022
)
SELECT
  a.cohort_month,
  s.cohort_size,
  a.month_number,
  COUNT(*) AS active_users,
  SAFE_DIVIDE(COUNT(*), s.cohort_size) AS activity_rate
FROM activity AS a
JOIN cohort_sizes AS s ON s.cohort_month = a.cohort_month
WHERE a.month_number >= 0
GROUP BY a.cohort_month, s.cohort_size, a.month_number
ORDER BY a.cohort_month, a.month_number;
