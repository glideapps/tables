export async function throwError(response: Response) {
  if (response.ok) return;

  let message: string | undefined;
  try {
    const data = await response.json();
    message = data.message;
  } catch {}

  message ??= `Error ${response.status}: ${response.statusText}`;

  throw new Error(message);
}
