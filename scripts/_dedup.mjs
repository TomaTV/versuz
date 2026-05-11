/**
 * Auto-purge content-hash duplicates from a table.
 *
 * Strategy : for each content_hash with > 1 row, keep the row with the
 * highest github_stars (then forks, then arbitrary stable id), delete the
 * rest. Logs which slugs were deleted for audit.
 *
 * Called after every scrape/upsert to keep the DB clean. Idempotent — runs
 * the same query whether there are dups or not.
 */
export async function purgeContentDuplicates(sb, table) {
  if (!sb) return { deleted: 0 };

  // Find rows that are duplicates (rn > 1 in the partition)
  let toDelete = null;
  let selErr = null;
  try {
    const result = await sb.rpc("find_content_dups", { target_table: table });
    toDelete = result.data;
    selErr = result.error;
  } catch (e) {
    selErr = { message: e.message || "RPC not available" };
  }

  if (selErr || !toDelete) {
    // Fallback : do it client-side via two queries
    const { data: all } = await sb
      .from(table)
      .select("id, slug, content_hash, github_stars, metadata")
      .not("content_hash", "is", null);
    if (!all || all.length === 0) return { deleted: 0 };

    const groups = new Map();
    for (const r of all) {
      const k = r.content_hash;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    }

    const toDeleteIds = [];
    const deletedLog = [];
    for (const [hash, rows] of groups) {
      if (rows.length < 2) continue;
      rows.sort((a, b) => {
        const sa = a.github_stars || 0;
        const sb = b.github_stars || 0;
        if (sa !== sb) return sb - sa;
        const fa = (a.metadata?.forks) || 0;
        const fb = (b.metadata?.forks) || 0;
        if (fa !== fb) return fb - fa;
        return a.id.localeCompare(b.id);
      });
      const keep = rows[0];
      for (let i = 1; i < rows.length; i++) {
        toDeleteIds.push(rows[i].id);
        deletedLog.push({ kept: keep.slug, deleted: rows[i].slug, hash: hash.slice(0, 8) });
      }
    }

    if (toDeleteIds.length === 0) return { deleted: 0 };

    const { error: delErr } = await sb.from(table).delete().in("id", toDeleteIds);
    if (delErr) {
      console.warn(`[dedup] ${table} delete failed : ${delErr.message}`);
      return { deleted: 0 };
    }
    for (const d of deletedLog) {
      console.log(`[dedup] ${table} deleted ${d.deleted} (kept ${d.kept}, hash ${d.hash})`);
    }
    return { deleted: toDeleteIds.length };
  }

  return { deleted: 0 };
}
