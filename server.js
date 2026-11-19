require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const TOKEN = process.env.PAGBANK_TOKEN;
const API_BASE = process.env.PAGBANK_ENV === "production"
  ? "https://api.pagseguro.com"
  : "https://sandbox.api.pagseguro.com";
const ORDERS_FILE = path.join(__dirname, "orders.json");

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

function readOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, "utf8")); }
  catch { return []; }
}
function saveOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}
function moneyToCents(value) {
  return Math.round(Number(value) * 100);
}

// O servidor usa uma lista própria de produtos para impedir que o navegador
// envie preços alterados no momento da criação do checkout.
const PRODUCTS = {
  "mizuno-wave-prophecy-14": { name: "MIZUNO WAVE PROPHECY 14", price: 379.99 },
  "mizuno-wave-prophecy-15": { name: "MIZUNO WAVE PROPHECY 15", price: 449.99 },
  "mizuno-wave-prophecy-13": { name: "MIZUNO WAVE PROPHECY 13", price: 379.99 },
  "mizuno-wave-prophecy-11": { name: "MIZUNO WAVE PROPHECY 11", price: 400 },
  "nike-dunk-twist": { name: "NIKE DUNK TWIST", price: 209.99 },
  "nike-dunk-low-sb": { name: "NIKE DUNK LOW SB", price: 209.99 },
  "adidas-grand-court-preto": { name: "TÊNIS ADIDAS GRAND COURT BASE PRETO", price: 199 },
  "adidas-grand-court-branco-azul": { name: "TÊNIS ADIDAS GRAND COURT BASE BRANCO E AZUL", price: 199 },
  "adidas-grand-court-branco": { name: "TÊNIS ADIDAS GRAND COURT BASE BRANCO", price: 199 },
  "adidas-grand-court-branco-vermelho": { name: "TÊNIS ADIDAS GRAND COURT BASE BRANCO E VERMELHO", price: 199 },
  "adidas-grand-court-cinza-vermelho": { name: "TÊNIS ADIDAS GRAND COURT BASE CINZA E VERMELHO", price: 199 },
  "adidas-grand-court-azul": { name: "TÊNIS ADIDAS GRAND COURT BASE AZUL", price: 199 },
  "tommy-hilfiger-lancamento": { name: "TÊNIS TOMMY HILFIGER LANÇAMENTO", price: 279.99 },
  "tommy-hilfiger-dino": { name: "TÊNIS TOMMY HILFIGER DINO", price: 279.99 },
  "puma-ca-pro-mercedes": { name: "PUMA CA PRO MERCEDES BRANCO AZUL", price: 279.99 },
  "puma-ca-pro-verde": { name: "PUMA CA PRO VERDE", price: 279.99 },
  "puma-ca-pro-bmw-branco": { name: "PUMA CA PRO BMW BRANCO", price: 279.99 },
  "puma-ca-pro-bmw-preto-especial": { name: "PUMA CA PRO BMW PRETO EDIÇÃO ESPECIAL", price: 279.99 },
  "puma-ca-pro-bmw-preto-azul": { name: "PUMA CA PRO BMW PRETO DETALHE AZUL", price: 279.99 },
  "puma-caven-ferrari-branco": { name: "PUMA CAVEN FERRARI BRANCO", price: 279.99 },
  "puma-caven-ferrari-preto": { name: "PUMA CAVEN FERRARI PRETO", price: 279.99 },
  "nike-shox-r4": { name: "TÊNIS NIKE SHOX R4", price: 279.99 },
  "nike-shox-12-molas": { name: "TÊNIS NIKE SHOX 12 MOLAS TL 2", price: 420 },
  "nike-shox-r4-brasil": { name: "NIKE SHOX R4 BRASIL", price: 319.99 },
  "nike-court-vision-sola-alta": { name: "NIKE COURT VISION SOLA ALTA", price: 249 },
  "nike-court-borough": { name: "NIKE COURT BOROUGH", price: 229.99 },
  "nike-court-vision": { name: "NIKE COURT VISION", price: 229.99 },
  "air-max-tn-plus": { name: "AIR MAX TN PLUS", price: 400 },
  "air-max-95-corteiz": { name: "AIR MAX 95 X CORTEIZ", price: 429.99 },
  "new-balance-2000": { name: "TÊNIS NEW BALANCE 2000 ABZORB", price: 349.99 },
  "air-max-dn": { name: "AIR MAX DN LANÇAMENTO", price: 499.99 },
  "nike-alphafly-3": { name: "NIKE ALPHAFLY 3", price: 589.99 },
  "adidas-adizero-prime-x3": { name: "ADIDAS ADIZERO PRIME X3", price: 589.99 },
  "adidas-adizero-evo-sl-atr": { name: "ADIDAS ADIZERO EVO SL ATR", price: 589.99 },
  "adidas-adizero-adios-pro-evo-1": { name: "ADIDAS ADIZERO ADIOS PRO EVO 1", price: 589.99 },
  "adidas-adizero-adios-pro-evo-4": { name: "ADIDAS ADIZERO ADIOS PRO EVO 4", price: 589.99 },
  "camiseta-porche-boss": { name: "CAMISETA PORCHE BOSS", price: 99.98 },
  "camiseta-emporio-armany": { name: "CAMISETA EMPÓRIO ARMANY", price: 99.98 },
  "camiseta-lacoste-big-logo": { name: "CAMISETA LACOSTE BIG LOGO", price: 99.98 },
  "camiseta-tommy-hilfiger-original": { name: "CAMISETA TOMMY HILFIGER ORIGINAL", price: 229.99 },
  "camiseta-nike-icon-original": { name: "CAMISETA NIKE ICON ORIGINAL", price: 99.8 }
};

app.get("/api/health", (_req, res) => res.json({ ok: true, store: "GS Imports" }));

app.post("/api/checkout", async (req, res) => {
  try {
    if (!TOKEN) return res.status(503).json({ error: "Checkout ainda não configurado. Adicione PAGBANK_TOKEN no arquivo .env." });

    const { items, buyer } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Seu carrinho está vazio." });
    if (!buyer?.name || !buyer?.email || !buyer?.phone) return res.status(400).json({ error: "Informe nome, e-mail e telefone." });

    const checkoutItems = items.map((item) => {
      const product = PRODUCTS[item.id];
      const quantity = Math.max(1, Math.min(10, Number(item.quantity) || 1));
      if (!product) throw new Error("Produto inválido no carrinho.");
      return { name: product.name, quantity, unit_amount: moneyToCents(product.price) };
    });

    const referenceId = `GS-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const payload = {
      reference_id: referenceId,
      items: checkoutItems,
      customer_modifiable: true,
      payment_methods: [
        { type: "PIX" },
        { type: "CREDIT_CARD" },
        { type: "DEBIT_CARD" }
      ],
      payment_methods_configs: [
        { type: "CREDIT_CARD", config_options: [{ option: "INSTALLMENTS_LIMIT", value: "6" }] }
      ],
      soft_descriptor: "GS IMPORTS",
      redirect_url: `${BASE_URL}/?pedido=${encodeURIComponent(referenceId)}`,
      return_url: `${BASE_URL}/?pedido=${encodeURIComponent(referenceId)}`,
      notification_urls: [`${BASE_URL}/api/pagbank/webhook`],
      payment_notification_urls: [`${BASE_URL}/api/pagbank/webhook`]
    };

    const response = await fetch(`${API_BASE}/checkouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("PagBank checkout error:", response.status, data);
      return res.status(502).json({ error: "O PagBank não conseguiu criar o checkout. Confira as credenciais e a configuração da conta." });
    }

    const payLink = (data.links || []).find(link => link.rel === "PAY")?.href;
    if (!payLink) return res.status(502).json({ error: "O PagBank não retornou o link de pagamento." });

    const orders = readOrders();
    orders.push({
      reference_id: referenceId,
      checkout_id: data.id,
      created_at: new Date().toISOString(),
      status: "AGUARDANDO_PAGAMENTO",
      buyer: { name: buyer.name, email: buyer.email, phone: buyer.phone },
      items: checkoutItems
    });
    saveOrders(orders);
    res.json({ checkoutUrl: payLink, referenceId });
  } catch (error) {
    res.status(400).json({ error: error.message || "Não foi possível iniciar o pagamento." });
  }
});

// Webhook: registra notificações recebidas. A confirmação final deve ser validada
// consultando o checkout/pagamento na API PagBank antes de liberar o pedido.
app.post("/api/pagbank/webhook", (req, res) => {
  const eventsPath = path.join(__dirname, "pagbank-events.jsonl");
  fs.appendFileSync(eventsPath, JSON.stringify({ received_at: new Date().toISOString(), body: req.body }) + "\n");
  res.sendStatus(200);
});

app.get("/api/order/:referenceId", (req, res) => {
  const order = readOrders().find(o => o.reference_id === req.params.referenceId);
  if (!order) return res.status(404).json({ error: "Pedido não encontrado." });
  res.json({ reference_id: order.reference_id, status: order.status });
});

app.listen(PORT, () => console.log(`GS Imports rodando em http://localhost:${PORT}`));
