/** UI interna de demo (módulos, admin en header, mensajes de tarjeta simulada). */
export function showDemoUi(): boolean {
  const flag = process.env.NEXT_PUBLIC_SHOW_DEMO_UI?.trim().toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return process.env.NODE_ENV === "development";
}
