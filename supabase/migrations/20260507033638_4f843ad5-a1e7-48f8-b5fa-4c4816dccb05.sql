-- Ensure MVP development policies are explicit and idempotent

-- contacts
DROP POLICY IF EXISTS "contacts auth all" ON public.contacts;
DROP POLICY IF EXISTS "contacts authenticated select" ON public.contacts;
DROP POLICY IF EXISTS "contacts authenticated insert" ON public.contacts;
DROP POLICY IF EXISTS "contacts authenticated update" ON public.contacts;
CREATE POLICY "contacts authenticated select"
ON public.contacts
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "contacts authenticated insert"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (true);
CREATE POLICY "contacts authenticated update"
ON public.contacts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- conversations
DROP POLICY IF EXISTS "conversations auth all" ON public.conversations;
DROP POLICY IF EXISTS "conversations authenticated select" ON public.conversations;
DROP POLICY IF EXISTS "conversations authenticated insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations authenticated update" ON public.conversations;
CREATE POLICY "conversations authenticated select"
ON public.conversations
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "conversations authenticated insert"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);
CREATE POLICY "conversations authenticated update"
ON public.conversations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- messages
DROP POLICY IF EXISTS "messages auth all" ON public.messages;
DROP POLICY IF EXISTS "messages authenticated select" ON public.messages;
DROP POLICY IF EXISTS "messages authenticated insert" ON public.messages;
DROP POLICY IF EXISTS "messages authenticated update" ON public.messages;
CREATE POLICY "messages authenticated select"
ON public.messages
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "messages authenticated insert"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (true);
CREATE POLICY "messages authenticated update"
ON public.messages
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- conversation_events
DROP POLICY IF EXISTS "events auth all" ON public.conversation_events;
DROP POLICY IF EXISTS "conversation_events authenticated select" ON public.conversation_events;
DROP POLICY IF EXISTS "conversation_events authenticated insert" ON public.conversation_events;
CREATE POLICY "conversation_events authenticated select"
ON public.conversation_events
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "conversation_events authenticated insert"
ON public.conversation_events
FOR INSERT
TO authenticated
WITH CHECK (true);

-- objections MVP: authenticated read/write temporarily
DROP POLICY IF EXISTS "objections read" ON public.objections;
DROP POLICY IF EXISTS "objections write staff" ON public.objections;
DROP POLICY IF EXISTS "objections authenticated select" ON public.objections;
DROP POLICY IF EXISTS "objections authenticated insert" ON public.objections;
DROP POLICY IF EXISTS "objections authenticated update" ON public.objections;
CREATE POLICY "objections authenticated select"
ON public.objections
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "objections authenticated insert"
ON public.objections
FOR INSERT
TO authenticated
WITH CHECK (true);
CREATE POLICY "objections authenticated update"
ON public.objections
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- knowledge_items MVP: authenticated read/write temporarily
DROP POLICY IF EXISTS "knowledge read" ON public.knowledge_items;
DROP POLICY IF EXISTS "knowledge write staff" ON public.knowledge_items;
DROP POLICY IF EXISTS "knowledge authenticated select" ON public.knowledge_items;
DROP POLICY IF EXISTS "knowledge authenticated insert" ON public.knowledge_items;
DROP POLICY IF EXISTS "knowledge authenticated update" ON public.knowledge_items;
CREATE POLICY "knowledge authenticated select"
ON public.knowledge_items
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "knowledge authenticated insert"
ON public.knowledge_items
FOR INSERT
TO authenticated
WITH CHECK (true);
CREATE POLICY "knowledge authenticated update"
ON public.knowledge_items
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ai_learning_suggestions
DROP POLICY IF EXISTS "ai_learn read" ON public.ai_learning_suggestions;
DROP POLICY IF EXISTS "ai_learn insert auth" ON public.ai_learning_suggestions;
DROP POLICY IF EXISTS "ai_learn update staff" ON public.ai_learning_suggestions;
DROP POLICY IF EXISTS "ai_learning authenticated select" ON public.ai_learning_suggestions;
DROP POLICY IF EXISTS "ai_learning authenticated insert" ON public.ai_learning_suggestions;
DROP POLICY IF EXISTS "ai_learning authenticated update" ON public.ai_learning_suggestions;
CREATE POLICY "ai_learning authenticated select"
ON public.ai_learning_suggestions
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "ai_learning authenticated insert"
ON public.ai_learning_suggestions
FOR INSERT
TO authenticated
WITH CHECK (true);
CREATE POLICY "ai_learning authenticated update"
ON public.ai_learning_suggestions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- profiles: own profile insert/update, authenticated select
DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
DROP POLICY IF EXISTS "profiles self update" ON public.profiles;
DROP POLICY IF EXISTS "profiles authenticated select" ON public.profiles;
DROP POLICY IF EXISTS "profiles own insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles own update" ON public.profiles;
CREATE POLICY "profiles authenticated select"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
CREATE POLICY "profiles own insert"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());
CREATE POLICY "profiles own update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));