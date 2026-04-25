export async function postLogin(login: string): Promise<Response> {
  return fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login }),
  });
}

export async function readRedirect(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  return (data?.redirect as string | undefined) ?? "/feed";
}
