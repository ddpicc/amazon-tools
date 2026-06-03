"use server";

import { signIn } from "@/auth";

export async function loginAction(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/projects"
  });
}
