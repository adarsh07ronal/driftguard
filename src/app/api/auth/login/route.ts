import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!supabaseUrl || !supabaseAnonKey || !appUrl) {
    return NextResponse.json(
      {
        error:
          "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_APP_URL",
      },
      { status: 500 }
    );
  }

  // Use supabase-js directly with implicit flow so NO code_verifier is generated.
  // Supabase will return #access_token=... in the hash instead of ?code=...
  const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        flowType: "implicit",
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${appUrl}/auth/callback`,
      scopes: "user:email",
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(
      new URL(`/auth?error=${encodeURIComponent(error?.message ?? "oauth_failed")}`, request.url)
    );
  }

  // No code_verifier needed — redirect straight to GitHub
  return NextResponse.redirect(data.url);
}
