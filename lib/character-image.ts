import { supabase } from "./supabase";

export function getCharacterImageUrl(imagePath: string) {
  const { data } = supabase.storage
    .from("Characters")
    .getPublicUrl(imagePath);

  return data.publicUrl;
}