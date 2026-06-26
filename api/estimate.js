// Vercel serverless function: receives free-quote submissions for Season Pro Cleaners.
// Validates, blocks spam, emails the lead via Resend if configured (else logs it).

export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ ok: false, error: "Method not allowed" }); }
  const b = (req.body && typeof req.body === "object") ? req.body : safeParse(req.body);

  const tooFast = b._ts && Date.now() - Number(b._ts) < 2500;
  if ((b.company && String(b.company).length) || tooFast) return res.status(200).json({ ok: true });

  const name = String(b.name || "").trim();
  const phone = String(b.phone || "").trim();
  if (name.length < 2) return res.status(400).json({ ok: false, error: "Please enter your name" });
  if (phone.replace(/\D/g, "").length < 7) return res.status(400).json({ ok: false, error: "Please enter a valid phone number" });

  const lead = {
    name: name.slice(0, 80), phone: phone.slice(0, 30),
    address: String(b.address || "").trim().slice(0, 160),
    service: String(b.service || "").trim().slice(0, 80),
    message: String(b.message || "").trim().slice(0, 2000),
    at: new Date().toISOString(),
  };
  try { await deliver(lead); } catch (e) { console.error("[quote] delivery failed:", e.message); }
  console.log("[lead]", JSON.stringify(lead));
  return res.status(200).json({ ok: true });
}
function safeParse(b) { if (!b) return {}; try { return JSON.parse(b); } catch { return {}; } }
async function deliver(lead) {
  const key = process.env.RESEND_API_KEY, to = process.env.LEAD_EMAIL;
  if (!key || !to) return;
  const from = process.env.LEAD_FROM || "Season Pro Leads <onboarding@resend.dev>";
  const text = ["New free-quote request from the website:", "", `Name:     ${lead.name}`, `Phone:    ${lead.phone}`, `Address:  ${lead.address || "—"}`, `Service:  ${lead.service || "—"}`, "", "Message:", lead.message || "—"].join("\n");
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to, subject: `🪟 New SPC lead — ${lead.name}`, text }) });
  if (!r.ok) throw new Error(`resend ${r.status}`);
}
