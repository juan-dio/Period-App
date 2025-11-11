"use server"

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/**
 * SIGNUP: Membuat user baru di Supabase Auth
 */
export async function signUpAction(currentState, formData) {
  const supabase = await createClient();
  const schema = z.object({
    email: z.string().email(),
    password: z.string().regex(/\d/, "Password must contain at least one number").min(8, "Password must be at least 8 characters long"),
  });
  const errors = {};

  const email = formData.get("email");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirm_password");

  const validation = schema.safeParse({ email, password });

  if (!validation.success) {
    const zodErrors = z.flattenError(validation.error).fieldErrors;
    console.log(zodErrors);
    if (zodErrors.email) {
      errors.email = zodErrors.email[0];
    }
    if (zodErrors.password) {
      errors.password = zodErrors.password[0];
    }
  }

  if (password !== confirmPassword) {
    errors.confirm_password = "Passwords do not match.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    errors.auth = error.message;
  }

  // Jika Supabase email confirmation aktif
  if (data.user?.identities?.length === 0) {
    errors.auth = "Email already registered.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return redirect("/login?registered=true");
}

/**
 * LOGIN: Autentikasi user & set session
 */
export async function loginAction(currentState, formData) {
  const supabase = await createClient();
  const errors = {};

  const email = formData.get("email");
  const password = formData.get("password");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    errors.auth = error.message;
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return redirect("/");
}

/**
 * LOGOUT: Hapus sesi user
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/login");
}

/**
 * GET USER SESSION
 */
export async function getUserSession() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
