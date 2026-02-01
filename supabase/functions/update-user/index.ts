import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateUserRequest {
  user_id: string;
  email?: string;
  password?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: No auth header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's token to check permissions
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: currentUser } } = await supabaseUser.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (!currentUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if current user is admin
    const { data: roles } = await supabaseUser
      .from("user_roles")
      .select("role")
      .eq("user_id", currentUser.id);

    const isAdmin = roles?.some(
      (r) => r.role === "admin_network" || r.role === "admin_campus"
    );

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: UpdateUserRequest = await req.json();
    const { user_id, email, password } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email && !password) {
      return new Response(
        JSON.stringify({ error: "Nothing to update" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use admin client for user management
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const updateData: Record<string, string> = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;

    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      updateData
    );

    if (updateError) {
      console.error("Update user error:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If password was updated, also update the stored hash in profile
    if (password) {
      const encodedPassword = btoa(password);
      await supabaseAdmin
        .from("profiles")
        .update({ generated_password_hash: encodedPassword })
        .eq("user_id", user_id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: updatedUser.user.id,
          email: updatedUser.user.email 
        } 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
