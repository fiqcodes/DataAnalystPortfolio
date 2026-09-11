-- Equivalent consolidated form of the documented 2021/2022 growth queries.
-- Completed order items only. Gross profit = sale price - product cost.
-- Historical source project; do not substitute a current dataset and expect
-- the historical output values to remain unchanged.
WITH annual AS (
  SELECT
    p.category,
    EXTRACT(YEAR FROM oi.created_at) AS year,
    SUM(oi.sale_price) AS revenue,
    SUM(oi.sale_price - p.cost) AS gross_profit
  FROM `sql-project-376612.thelook_ecommerce.order_items` AS oi
  JOIN `sql-project-376612.thelook_ecommerce.products` AS p
    ON p.id = oi.product_id
  WHERE oi.status = 'Complete'
    AND EXTRACT(YEAR FROM oi.created_at) IN (2021, 2022)
  GROUP BY p.category, year
)
SELECT
  y22.category,
  y21.revenue AS revenue_2021,
  y22.revenue AS revenue_2022,
  ROUND(SAFE_DIVIDE(y22.revenue - y21.revenue, y21.revenue) * 100, 2)
    AS revenue_growth_pct,
  y21.gross_profit AS gross_profit_2021,
  y22.gross_profit AS gross_profit_2022,
  ROUND(SAFE_DIVIDE(y22.gross_profit - y21.gross_profit,
    y21.gross_profit) * 100, 2) AS gross_profit_growth_pct
FROM annual AS y22
JOIN annual AS y21 ON y21.category = y22.category
WHERE y21.year = 2021 AND y22.year = 2022
ORDER BY gross_profit_growth_pct;
