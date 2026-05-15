-- 1) apagar mensagens vazias (sem body, sem transcript, sem áudio, sem mídia)
DELETE FROM gs_whatsapp_messages
WHERE coalesce(body,'') = ''
  AND coalesce(transcript,'') = ''
  AND coalesce(audio_url,'') = ''
  AND coalesce(media->>'url','') = '';

-- 2) apagar contato/conversa do número 554196789357 (não é cliente real)
DELETE FROM gs_whatsapp_messages
  WHERE conversation_id IN (
    SELECT c.id FROM gs_whatsapp_conversations c
    JOIN gs_whatsapp_contacts ct ON ct.id = c.contact_id
    WHERE ct.phone = '554196789357'
  );
DELETE FROM gs_whatsapp_conversations
  WHERE contact_id IN (SELECT id FROM gs_whatsapp_contacts WHERE phone = '554196789357');
DELETE FROM gs_whatsapp_contacts WHERE phone = '554196789357';

-- 3) apagar conversas que ficaram sem mensagens
DELETE FROM gs_whatsapp_conversations c
WHERE NOT EXISTS (
  SELECT 1 FROM gs_whatsapp_messages m WHERE m.conversation_id = c.id
);

-- 4) apagar contatos sem nenhuma conversa
DELETE FROM gs_whatsapp_contacts ct
WHERE NOT EXISTS (
  SELECT 1 FROM gs_whatsapp_conversations c WHERE c.contact_id = ct.id
);

-- 5) apagar eventos órfãos do backfill incompleto
DELETE FROM gs_whatsapp_events
WHERE conversation_id IS NOT NULL
  AND conversation_id NOT IN (SELECT id FROM gs_whatsapp_conversations);