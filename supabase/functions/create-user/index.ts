import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  birth_date?: string;
  role: "admin_network" | "admin_campus" | "teacher" | "student" | "parent_viewer";
  campus_id?: string;
  study_program_id?: string;
  enrollment_cohort_id?: string;
  group_id?: string;
  generate_credentials?: boolean;
}

function generateLogin(fullName: string, campusDomain?: string): string {
  // Transliterate Ukrainian to Latin
  const translitMap: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'h', 'ґ': 'g', 'д': 'd', 'е': 'e', 'є': 'ye',
    'ж': 'zh', 'з': 'z', 'и': 'y', 'і': 'i', 'ї': 'yi', 'й': 'y', 'к': 'k', 'л': 'l',
    'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch', 'ь': '', 'ю': 'yu',
    'я': 'ya', "'": '', 'ы': 'y', 'э': 'e', 'ё': 'yo',
  };

  const nameParts = fullName.toLowerCase().split(' ').filter(Boolean);
  let login = '';

  if (nameParts.length >= 2) {
    // Last name + first letter of first name
    const lastName = nameParts[0];
    const firstName = nameParts[1];
    login = lastName + '.' + firstName[0];
  } else if (nameParts.length === 1) {
    login = nameParts[0];
  }

  // Transliterate
  login = login.split('').map(char => translitMap[char] || char).join('');
  
  // Remove non-alphanumeric except dots
  login = login.replace(/[^a-z0-9.]/g, '');

  // Add random number for uniqueness
  const randomNum = Math.floor(Math.random() * 900) + 100;
  login = `${login}${randomNum}`;

  if (campusDomain) {
    return `${login}@${campusDomain}`;
  }
  
  return login;
}

function generatePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the requesting user is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the requesting user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if requesting user is an admin - use limit(1) since user might have multiple admin roles
    const { data: adminRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .in("role", ["admin_network", "admin_campus"])
      .limit(1);

    if (!adminRoles || adminRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Unauthorized: Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminRole = adminRoles[0];

    const body: CreateUserRequest = await req.json();
    let { email, password, full_name, phone, birth_date, role, campus_id, study_program_id, enrollment_cohort_id, group_id, generate_credentials } = body;

    // Generate credentials for students if requested
    let generatedLogin: string | null = null;
    let generatedPassword: string | null = null;

    if (role === 'student' && generate_credentials) {
      // Get campus domain if available
      let campusDomain: string | undefined;
      if (campus_id) {
        const { data: campus } = await supabaseAdmin
          .from("campuses")
          .select("email")
          .eq("id", campus_id)
          .single();
        
        if (campus?.email) {
          // Extract domain from campus email
          const emailParts = campus.email.split('@');
          if (emailParts.length > 1) {
            campusDomain = emailParts[1];
          }
        }
      }

      generatedLogin = generateLogin(full_name, campusDomain);
      generatedPassword = generatePassword();
      
      // Use generated credentials
      email = generatedLogin;
      password = generatedPassword;
    }

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields: email, password, full_name, role" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Network admins can create any role, campus admins can only create non-admin roles
    if (adminRole.role === "admin_campus" && (role === "admin_network" || role === "admin_campus")) {
      return new Response(JSON.stringify({ error: "Campus admins cannot create admin users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the user in auth.users
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { full_name },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the profile with additional info
    const profileUpdate: Record<string, unknown> = {
      full_name,
      phone: phone || null,
      birth_date: birth_date || null,
    };

    // Add student-specific fields
    if (role === 'student') {
      profileUpdate.study_program_id = study_program_id || null;
      profileUpdate.enrollment_cohort_id = enrollment_cohort_id || null;
      
      if (generatedLogin && generatedPassword) {
        profileUpdate.generated_login = generatedLogin;
        // Store password hash (simple encoding for admin viewing - in production use proper encryption)
        profileUpdate.generated_password_hash = btoa(generatedPassword);
      }
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("user_id", newUser.user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
    }

    // Assign role to the user
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role,
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      return new Response(JSON.stringify({ error: "User created but role assignment failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If campus_id is provided, add campus membership
    if (campus_id) {
      const { error: campusError } = await supabaseAdmin
        .from("campus_memberships")
        .insert({
          user_id: newUser.user.id,
          campus_id,
          role,
        });

      if (campusError) {
        console.error("Error adding campus membership:", campusError);
      }
    }

    // If group_id is provided (for students), add group membership
    if (group_id && role === 'student') {
      const { error: groupError } = await supabaseAdmin
        .from("group_memberships")
        .insert({
          user_id: newUser.user.id,
          group_id,
          role: 'student',
        });

      if (groupError) {
        console.error("Error adding group membership:", groupError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name,
          role,
          generated_login: generatedLogin,
          generated_password: generatedPassword,
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
