import { Database } from "./types/database";
import { SupabaseClient } from "@supabase/supabase-js";

type T = Database['public']['Tables']['organizations'];

const client = {} as SupabaseClient<Database>;
const builder = client.from("organizations");
