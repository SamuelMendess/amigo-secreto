import { supabase } from "../supabaseClient";
export async function result(request) {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}
export const api = {
  groups: () =>
    result(
      supabase
        .from("exchange_groups")
        .select("*")
        .order("created_at", { ascending: false }),
    ),
  group: (id) =>
    result(supabase.from("exchange_groups").select("*").eq("id", id).single()),
  members: (id) =>
    result(
      supabase
        .from("group_members")
        .select("*")
        .eq("group_id", id)
        .order("joined_at"),
    ),
  invites: (id) =>
    result(
      supabase
        .from("group_invites")
        .select("id,email,status,email_state,expires_at")
        .eq("group_id", id)
        .order("created_at", { ascending: false }),
    ),
  wishes: (groupId, userId) =>
    result(
      supabase
        .from("wishlist_items")
        .select("*")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .order("created_at"),
    ),
  assignment: (id) =>
    result(
      supabase
        .from("draw_assignments")
        .select("recipient_id")
        .eq("group_id", id)
        .maybeSingle(),
    ),
  rpc: (name, args) => result(supabase.rpc(name, args)),
  addWish: (item) => result(supabase.from("wishlist_items").insert(item)),
  deleteWish: (id) =>
    result(supabase.from("wishlist_items").delete().eq("id", id)),
  async sendEmails(groupId) {
    let processed = 0;
    for (let batch = 0; batch < 5; batch++) {
      const { data, error } = await supabase.functions.invoke(
        "process-emails",
        { body: { groupId } },
      );
      if (error || data?.error || data?.failed)
        throw new Error(
          "Os avisos estão salvos, mas alguns e-mails aguardam envio. Tente novamente em alguns minutos.",
        );
      processed += data.processed;
      if (data.processed < 10) break;
    }
    return processed;
  },
};
