import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InviteSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(["admin", "gestor", "atendente"]),
});

const ChangeRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "gestor", "atendente"]),
});

async function ensureAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("forbidden: admin only");
  return supabaseAdmin;
}

export const inviteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => InviteSchema.parse(i))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await ensureAdmin(context.userId);
    const origin = process.env.APP_PUBLIC_URL ?? "https://painel.gsacabamentos.com";
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      redirectTo: `${origin}/login`,
      data: { name: data.name ?? data.email },
    });
    if (error || !invited?.user) {
      return { ok: false, error: error?.message ?? "invite failed" };
    }
    await supabaseAdmin.from("profiles").upsert(
      { id: invited.user.id, email: data.email, name: data.name ?? data.email, active: true },
      { onConflict: "id" },
    );
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: invited.user.id, role: data.role }, { onConflict: "user_id,role" });
    return { ok: true, user_id: invited.user.id };
  });

export const changeUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ChangeRoleSchema.parse(i))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await ensureAdmin(context.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
