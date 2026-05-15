DELETE FROM public.gs_whatsapp_events WHERE conversation_id = 'fe3f814e-6350-43fb-9abf-9d0020e88027' OR contact_id IN (SELECT id FROM public.gs_whatsapp_contacts WHERE phone = '554196789357');
DELETE FROM public.gs_whatsapp_messages WHERE conversation_id = 'fe3f814e-6350-43fb-9abf-9d0020e88027';
DELETE FROM public.gs_whatsapp_conversations WHERE id = 'fe3f814e-6350-43fb-9abf-9d0020e88027';
DELETE FROM public.gs_whatsapp_contacts WHERE phone = '554196789357';