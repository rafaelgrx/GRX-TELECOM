/* GRX 2.0 — preencha somente chave pública/publishable ou anon. NUNCA service_role.
   Vazio = modo local. Configuração parcial falha fechada e NÃO ativa login local na nuvem.
   Primeiro aplique supabase.sql e cadastre os membros conforme LEIA-ME.html. */
window.GRX_CONFIG = {
  url: "",
  anonKey: "",
  bucket: "grx-comprovantes-v2",
  table: "grx_regs_v2",
  cfgTable: "grx_config_v2",
  cfgRow: "listas",
  fotoMax: 1600,
  fotoQuality: 0.75
};
