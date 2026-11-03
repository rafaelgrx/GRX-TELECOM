/* GRX 2.0 — chave publishable é pública; NUNCA use service_role.
   Configure o projeto Supabase e execute supabase.sql antes de usar a nuvem. */
window.GRX_CONFIG = {
  url: "https://cciioxipmmoajgdezikh.supabase.co",
  anonKey: "sb_publishable_BqRiSTGH9DSC7pqhdQMLGg_-YpnGc6W",
  bucket: "grx-comprovantes-v2",
  table: "grx_regs_v2",
  cfgTable: "grx_config_v2",
  cfgRow: "listas",
  fotoMax: 1600,
  fotoQuality: 0.4
};
