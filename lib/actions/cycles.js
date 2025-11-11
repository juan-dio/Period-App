"use server"

import { createClient } from "@/lib/supabase/server";
import { addOrUpdateCycle, getCycles, predictUserCycle } from "../supabase/db/cycles";

/**
 * Add new cycle or update existing cycle data
 */
export async function addOrUpdateCycleAction(formData) {
  const supabase = await createClient();
  const errors = {};

  const user = await supabase.auth.getUser();

  if (!user.data.user) {
    errors.auth = "User not authenticated.";
  }
  const userId = user.data.user.id;

  const date = formData.get("date");
  const flow = formData.get("flow");
  const mood = formData.get("mood");
  const symptoms = formData.getAll("symptoms");
  const activities = formData.getAll("activities");
  const notes = formData.get("notes");

  let newCycle;
  try {
    newCycle = await addOrUpdateCycle(userId, date, flow, mood, symptoms, activities, notes);
  } catch (error) {
    errors.database = error.message;
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return { newCycle };
}

/**
 * Get cycle periods from cycles data
 */
export async function getCyclesAction() {
  const supabase = await createClient();
  const errors = {};

  const user = await supabase.auth.getUser();

  let cycles;
  try {
    cycles = await getCycles(user.data.user.id);
  } catch (error) {
    errors.database = error.message;
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return { cycles };
}

/**
 * Get predicted cycles from cycles data
 */
export async function getPredictedCyclesAction() {
  const supabase = await createClient();
  const errors = {};

  const user = await supabase.auth.getUser();

  let predictions;
  try {
    predictions = await predictUserCycle(user.data.user.id);
  } catch (error) {
    errors.database = error.message;
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return { predictions };
}