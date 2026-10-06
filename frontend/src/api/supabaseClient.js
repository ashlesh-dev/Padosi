import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client — used ONLY for Storage (image uploads).
 * We do NOT use Supabase Auth; auth is handled by our own Spring Boot JWT.
 *
 * The anon key is safe to put in frontend code — it is a public key.
 * Row Level Security (RLS) in Supabase Storage policies controls what
 * anyone with this key can actually do.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.warn('[Padosi] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set — image upload will be disabled.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

/** The Storage bucket name for post images. Must match the bucket created in Supabase. */
export const POST_IMAGES_BUCKET = 'post-images';

/**
 * Upload a File object to Supabase Storage and return its public URL.
 * Throws if the upload fails.
 *
 * @param {File} file  - The image file selected by the user
 * @param {string} userId - The user's ID (used to namespace the path)
 * @returns {Promise<string>} - The public URL of the uploaded image
 */
export async function uploadPostImage(file, userId) {
  // Build a unique path: post-images/userId/timestamp-filename
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(error.message);

  // Get the permanent public URL
  const { data } = supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete an image from Supabase Storage given its public URL.
 * 
 * @param {string} imageUrl - The public URL of the image
 */
export async function deletePostImage(imageUrl) {
  if (!imageUrl) return;

  // Extract the relative path inside the bucket
  const bucketPrefix = `/${POST_IMAGES_BUCKET}/`;
  const idx = imageUrl.indexOf(bucketPrefix);
  if (idx === -1) return; // Not a recognized Supabase URL

  const path = imageUrl.substring(idx + bucketPrefix.length);

  const { error } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .remove([path]);

  if (error) {
    console.error('Failed to delete image from Supabase:', error.message);
  }
}
