const KNOWN_TEST_PHONES = new Set([
  "5541999990021",
  "5541999990022",
  "554199990022",
  "5541998848435",
]);

const TEST_TEXT_PATTERN = /\b(orion|lovable|almir teste|teste direto|test_flow_ready|schema-ok|painel correto)\b/i;

function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function isKnownWhatsappTestRecord(record: {
  name?: string | null;
  display_name?: string | null;
  phone?: string | null;
  remote_jid?: string | null;
  provider_message_id?: string | null;
  body?: string | null;
}) {
  const phone = digits(record.phone || record.remote_jid);
  const label = [
    record.name,
    record.display_name,
    record.remote_jid,
    record.provider_message_id,
    record.body,
  ]
    .filter(Boolean)
    .join(" ");

  return KNOWN_TEST_PHONES.has(phone) || TEST_TEXT_PATTERN.test(label);
}

export function isProductionWhatsappContact(contact: {
  name?: string | null;
  display_name?: string | null;
  phone?: string | null;
}) {
  return !isKnownWhatsappTestRecord(contact);
}

export function isProductionWhatsappConversation(conversation: {
  remote_jid?: string | null;
  contact?: {
    name?: string | null;
    display_name?: string | null;
    phone?: string | null;
  } | null;
}) {
  return !isKnownWhatsappTestRecord({
    remote_jid: conversation.remote_jid,
    name: conversation.contact?.name,
    display_name: conversation.contact?.display_name,
    phone: conversation.contact?.phone,
  });
}