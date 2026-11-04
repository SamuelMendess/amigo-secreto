import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import { createEmailHandler } from "../_shared/handler.mjs";

// verify_jwt=false: o handler valida o usuário com Auth.getUser antes de usar privilégios.
Deno.serve(
  createEmailHandler({
    createClient,
    env: (name: string) => Deno.env.get(name),
  }),
);
