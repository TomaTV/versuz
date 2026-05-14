-- RPC function to get category counts without row limits
CREATE OR REPLACE FUNCTION get_category_counts(p_table text, p_cat_col text, p_kind text)
RETURNS TABLE(category text, count bigint) AS $$
BEGIN
  RETURN QUERY EXECUTE format(
    'SELECT %I as category, COUNT(*) as count FROM %I %s GROUP BY %I ORDER BY count DESC',
    p_cat_col, p_table,
    CASE WHEN p_kind = 'claude_md' THEN 'WHERE word_count >= 40 OR word_count IS NULL' ELSE '' END,
    p_cat_col
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
