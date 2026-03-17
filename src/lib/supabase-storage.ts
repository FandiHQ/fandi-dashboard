/**
 * Supabase Storage utilities for image upload.
 *
 * SETUP REQUIRED: Create a PUBLIC bucket named "event-images" in the
 * Supabase Dashboard → Storage → New bucket → "event-images" → Public.
 */

import { supabase } from './supabase';

const BUCKET = 'event-images';

export async function uploadImage(file: File, folder: string): Promise<string> {
    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
    });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
}

export async function deleteImage(url: string): Promise<void> {
    const path = url.split(`/storage/v1/object/public/${BUCKET}/`)[1];
    if (path) {
        await supabase.storage.from(BUCKET).remove([path]);
    }
}
