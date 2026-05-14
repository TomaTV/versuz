#!/usr/bin/env node
import "../_env.mjs";

/**
 * Migration script to update existing records with source='github'
 * and update metadata.source field for consistency.
 * 
 * This should be run after migration 0033_add_source_field.sql
 */

import { createClient } from "@supabase/supabase-js";

function makeSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function updateSkillsSource(sb) {
  console.log("[migration] Updating skills source field...");
  
  // Update source column for all skills
  const { error: sourceError } = await sb
    .from('skills')
    .update({ source: 'github' })
    .is('source', null);
    
  if (sourceError) {
    console.error('[migration] Error updating skills source:', sourceError);
    return false;
  }
  
  // Update metadata.source field for consistency
  const { data: skills, error: fetchError } = await sb
    .from('skills')
    .select('id, metadata')
    .eq('source', 'github');
    
  if (fetchError) {
    console.error('[migration] Error fetching skills:', fetchError);
    return false;
  }
  
  let updated = 0;
  for (const skill of skills) {
    const metadata = { ...skill.metadata, source: 'github' };
    const { error: updateError } = await sb
      .from('skills')
      .update({ metadata })
      .eq('id', skill.id);
      
    if (updateError) {
      console.warn(`[migration] Error updating skill ${skill.id}:`, updateError);
    } else {
      updated++;
    }
  }
  
  console.log(`[migration] Updated ${updated} skills with source='github'`);
  return true;
}

async function updateClaudeMdSource(sb) {
  console.log("[migration] Updating claude_md_files source field...");
  
  // Update source column for all claude_md_files
  const { error: sourceError } = await sb
    .from('claude_md_files')
    .update({ source: 'github' })
    .is('source', null);
    
  if (sourceError) {
    console.error('[migration] Error updating claude_md_files source:', sourceError);
    return false;
  }
  
  // Update metadata.source field for consistency
  const { data: files, error: fetchError } = await sb
    .from('claude_md_files')
    .select('id, metadata')
    .eq('source', 'github');
    
  if (fetchError) {
    console.error('[migration] Error fetching claude_md_files:', fetchError);
    return false;
  }
  
  let updated = 0;
  for (const file of files) {
    const metadata = { ...file.metadata, source: 'github' };
    const { error: updateError } = await sb
      .from('claude_md_files')
      .update({ metadata })
      .eq('id', file.id);
      
    if (updateError) {
      console.warn(`[migration] Error updating claude_md_file ${file.id}:`, updateError);
    } else {
      updated++;
    }
  }
  
  console.log(`[migration] Updated ${updated} claude_md_files with source='github'`);
  return true;
}

async function main() {
  console.log("[migration] Starting source field migration...");
  
  const sb = makeSupabase();
  if (!sb) {
    console.error("[migration] Supabase env vars missing");
    process.exit(1);
  }
  
  const skillsSuccess = await updateSkillsSource(sb);
  const claudeSuccess = await updateClaudeMdSource(sb);
  
  if (skillsSuccess && claudeSuccess) {
    console.log("[migration] ✅ Migration completed successfully");
    console.log("[migration] 📊 All existing records now have source='github'");
    console.log("[migration] 🔄 Run 'npm run db:refresh-rankings' to update rankings view");
  } else {
    console.error("[migration] ❌ Migration failed");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[migration] Fatal error:", err);
  process.exit(1);
});
