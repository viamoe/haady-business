SELECT 
  level,
  COUNT(*) as count,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
FROM categories
GROUP BY level
ORDER BY level;
