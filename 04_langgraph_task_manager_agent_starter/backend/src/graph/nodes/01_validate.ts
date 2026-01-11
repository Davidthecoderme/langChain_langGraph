

import { State } from "../types";

export async function ValidateNode(state: State): Promise<Partial<State>> {
  const raw = state.input ?? "";

  // Normalize once so every later node sees consistent input
  const input = raw.replace(/\s+/g, " ").trim();

  // Empty / too short / too long
  if (input.length === 0) {
    return { status: "cancelled", message: "Please enter a request." };
  }
  if (input.length < 5) {
    return {
      status: "cancelled",
      message: "Input is too short, must be at least 5 characters.",
    };
  }
  if (input.length > 500) {
    return {
      status: "cancelled",
      message: "Input is too long, must be at most 500 characters.",
    };
  }

  // Reject inputs that are basically only symbols/punctuation
  // (keeps planner from trying to interpret "??????" or "....")
  if (/^[\p{P}\p{S}\s]+$/u.test(input)) {
    return {
      status: "cancelled",
      message: "Input must include some words (not only symbols).",
    };
  }

  // Simple repetition guard (e.g., "aaaaaa", "lol lol lol lol ...")
  const uniqueChars = new Set(input).size;
  if (uniqueChars <= 2 && input.length > 20) {
    return {
      status: "cancelled",
      message: "Input looks repetitive. Please describe your request normally.",
    };
  }

  // Return cleaned input so later nodes use the normalized version
  return {
    input,
    status: "planned",
    message: "Input is valid, proceeding to planning.",
  };
}


