export type ConvStatus =
  | "nova"
  | "ia_respondendo"
  | "precisa_humano"
  | "em_atendimento"
  | "aguardando_cliente"
  | "resolvida";

export type SenderType = "client" | "ai" | "human" | "system";

export interface Contact {
  id: string;
  name: string;
  phone: string;
  city: string;
  neighborhood: string;
  customerType: "obra" | "reforma" | "revenda" | "profissional";
  interest: string;
  stage: "novo" | "qualificado" | "orcamento" | "negociacao" | "ganho" | "perdido";
  tags: string[];
  responsible?: string;
  notes?: string;
  intentLevel: "baixa" | "media" | "alta";
  objections: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  senderType: SenderType;
  body: string;
  messageType: "text" | "audio" | "image";
  audioUrl?: string;
  transcript?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  status: ConvStatus;
  assignedUser?: string;
  aiEnabled: boolean;
  needsHuman: boolean;
  needsHumanReason?: string;
  priority: "baixa" | "media" | "alta";
  lastMessageAt: string;
  unread: number;
  hasAudio: boolean;
  aiSummary: string;
}

export const contacts: Contact[] = [
  {
    id: "c1",
    name: "Marcos Almeida",
    phone: "+55 41 99884-8435",
    city: "Curitiba",
    neighborhood: "Boqueirão",
    customerType: "obra",
    interest: "Drywall — 80m²",
    stage: "orcamento",
    tags: ["lead_quente", "drywall"],
    responsible: "Ana",
    notes: "Obra nova. Precisa entrega rápida.",
    intentLevel: "alta",
    objections: ["preço"],
  },
  {
    id: "c2",
    name: "Juliana Reis",
    phone: "+55 41 99712-3344",
    city: "Curitiba",
    neighborhood: "Batel",
    customerType: "reforma",
    interest: "Forro de gesso liso",
    stage: "qualificado",
    tags: ["forro"],
    intentLevel: "media",
    objections: [],
  },
  {
    id: "c3",
    name: "Construtora Ferraz",
    phone: "+55 41 3022-1180",
    city: "São José dos Pinhais",
    neighborhood: "Centro",
    customerType: "revenda",
    interest: "Placas ST e RU em volume",
    stage: "negociacao",
    tags: ["b2b", "lead_quente"],
    responsible: "Diego",
    intentLevel: "alta",
    objections: ["prazo", "preço"],
  },
  {
    id: "c4",
    name: "Paulo Henrique",
    phone: "+55 41 98821-7766",
    city: "Pinhais",
    neighborhood: "Weissópolis",
    customerType: "profissional",
    interest: "Massa para acabamento",
    stage: "novo",
    tags: [],
    intentLevel: "baixa",
    objections: [],
  },
  {
    id: "c5",
    name: "Larissa Souto",
    phone: "+55 41 99655-1122",
    city: "Curitiba",
    neighborhood: "Água Verde",
    customerType: "reforma",
    interest: "Sanca de gesso",
    stage: "orcamento",
    tags: ["sanca"],
    intentLevel: "media",
    objections: ["comparação"],
  },
];

export const conversations: Conversation[] = [
  {
    id: "k1",
    contactId: "c1",
    status: "precisa_humano",
    aiEnabled: false,
    needsHuman: true,
    needsHumanReason: "Lead quente — pediu orçamento e fechamento",
    priority: "alta",
    lastMessageAt: "10:42",
    unread: 2,
    hasAudio: true,
    aiSummary:
      "Cliente quer drywall para obra de 80m² no Boqueirão. Urgência alta. Pediu valor de fechamento.",
    assignedUser: undefined,
  },
  {
    id: "k2",
    contactId: "c2",
    status: "ia_respondendo",
    aiEnabled: true,
    needsHuman: false,
    priority: "media",
    lastMessageAt: "10:31",
    unread: 0,
    hasAudio: false,
    aiSummary: "Interesse em forro liso para sala. IA coletando metragem.",
  },
  {
    id: "k3",
    contactId: "c3",
    status: "em_atendimento",
    assignedUser: "Diego",
    aiEnabled: false,
    needsHuman: false,
    priority: "alta",
    lastMessageAt: "09:58",
    unread: 0,
    hasAudio: false,
    aiSummary: "Negociação B2B. Diego conduzindo desconto por volume.",
  },
  {
    id: "k4",
    contactId: "c4",
    status: "aguardando_cliente",
    aiEnabled: true,
    needsHuman: false,
    priority: "baixa",
    lastMessageAt: "Ontem",
    unread: 0,
    hasAudio: false,
    aiSummary: "Profissional perguntou sobre marca de massa. IA respondeu, aguardando retorno.",
  },
  {
    id: "k5",
    contactId: "c5",
    status: "nova",
    aiEnabled: true,
    needsHuman: false,
    priority: "media",
    lastMessageAt: "10:55",
    unread: 1,
    hasAudio: true,
    aiSummary: "Primeira mensagem. Áudio recebido — aguardando transcrição.",
  },
];

export const messagesByConv: Record<string, Message[]> = {
  k1: [
    {
      id: "m1",
      conversationId: "k1",
      direction: "inbound",
      senderType: "client",
      body: "Oi, preciso de orçamento de drywall pra uma obra",
      messageType: "text",
      createdAt: "10:30",
    },
    {
      id: "m2",
      conversationId: "k1",
      direction: "outbound",
      senderType: "ai",
      body: "Olá Marcos! Posso te ajudar 🙂 Pra montar um orçamento certinho, me conta a metragem aproximada, o bairro e a urgência?",
      messageType: "text",
      createdAt: "10:30",
    },
    {
      id: "m3",
      conversationId: "k1",
      direction: "inbound",
      senderType: "client",
      body: "",
      messageType: "audio",
      audioUrl: "#",
      transcript:
        "São cerca de 80 metros, é no Boqueirão. Preciso até semana que vem, dá pra fechar hoje?",
      createdAt: "10:38",
    },
    {
      id: "m4",
      conversationId: "k1",
      direction: "outbound",
      senderType: "system",
      body: "IA solicitou atendimento humano: lead quente, pedido de fechamento.",
      messageType: "text",
      createdAt: "10:39",
    },
    {
      id: "m5",
      conversationId: "k1",
      direction: "inbound",
      senderType: "client",
      body: "Tô esperando, viu? Se for bom preço fecho agora",
      messageType: "text",
      createdAt: "10:42",
    },
  ],
  k2: [
    {
      id: "m6",
      conversationId: "k2",
      direction: "inbound",
      senderType: "client",
      body: "Vocês fazem forro de gesso liso?",
      messageType: "text",
      createdAt: "10:20",
    },
    {
      id: "m7",
      conversationId: "k2",
      direction: "outbound",
      senderType: "ai",
      body: "Fazemos sim, Juliana! 👌 Pra te passar uma estimativa, me conta a metragem do ambiente e se tem recortes (luminárias, sanca, etc.)?",
      messageType: "text",
      createdAt: "10:31",
    },
  ],
  k3: [
    {
      id: "m8",
      conversationId: "k3",
      direction: "inbound",
      senderType: "client",
      body: "Diego, consegue fechar 500 placas ST esse mês?",
      messageType: "text",
      createdAt: "09:50",
    },
    {
      id: "m9",
      conversationId: "k3",
      direction: "outbound",
      senderType: "human",
      body: "Consigo sim! Te mando a tabela de volume agora.",
      messageType: "text",
      createdAt: "09:58",
    },
  ],
  k4: [
    {
      id: "m10",
      conversationId: "k4",
      direction: "inbound",
      senderType: "client",
      body: "Qual marca de massa vocês recomendam pra acabamento fino?",
      messageType: "text",
      createdAt: "Ontem",
    },
    {
      id: "m11",
      conversationId: "k4",
      direction: "outbound",
      senderType: "ai",
      body: "Pra acabamento fino o pessoal tem gostado bastante da Placo e da Knauf. Quer que eu te envie disponibilidade e valor?",
      messageType: "text",
      createdAt: "Ontem",
    },
  ],
  k5: [
    {
      id: "m12",
      conversationId: "k5",
      direction: "inbound",
      senderType: "client",
      body: "",
      messageType: "audio",
      audioUrl: "#",
      transcript: "(transcrição pendente)",
      createdAt: "10:55",
    },
  ],
};

export const objections = [
  {
    id: "o1",
    title: "Está caro",
    category: "preço",
    response:
      "Reforçar qualidade do material, orientar sobre quantidade correta e, se for negociação real, chamar vendedor.",
    when: "Cliente compara valor sem detalhar projeto",
    risk: "média",
    needsHuman: false,
    examples: ["Tá caro isso aí", "Achei salgado"],
    active: true,
  },
  {
    id: "o2",
    title: "Consigo mais barato em outro lugar",
    category: "comparação",
    response:
      "Explicar diferença entre preço, qualidade, disponibilidade e orientação técnica que damos junto.",
    when: "Cliente cita concorrente",
    risk: "alta",
    needsHuman: true,
    examples: ["Na loja X tá X reais"],
    active: true,
  },
  {
    id: "o3",
    title: "Preciso para hoje",
    category: "urgência",
    response: "Pedir produto, quantidade e bairro. Marcar prioridade alta e acionar humano.",
    when: "Cliente fala em urgência ou prazo curto",
    risk: "alta",
    needsHuman: true,
    examples: ["Preciso ainda hoje", "É pra agora"],
    active: true,
  },
  {
    id: "o4",
    title: "Não sei o que comprar",
    category: "dúvida técnica",
    response:
      "Fazer perguntas guiadas sobre obra, metragem e objetivo. Sugerir kit base.",
    when: "Cliente leigo, sem definição",
    risk: "baixa",
    needsHuman: false,
    examples: ["Sou leigo, me ajuda?"],
    active: true,
  },
];

export const knowledgeItems = [
  {
    id: "kn1",
    category: "Produtos e serviços",
    title: "Placas ST, RU e RF",
    content:
      "ST padrão para áreas secas, RU para áreas úmidas (banheiros, cozinhas), RF resistente ao fogo (escadas, shafts).",
  },
  {
    id: "kn2",
    category: "Perguntas frequentes",
    title: "Vocês entregam em qual região?",
    content: "Curitiba e região metropolitana. Frete calculado por bairro.",
  },
  {
    id: "kn3",
    category: "Políticas comerciais",
    title: "Desconto por volume",
    content:
      "Acima de 200 placas há tabela específica. Sempre acionar gestor antes de confirmar.",
  },
  {
    id: "kn4",
    category: "Tom de voz",
    title: "Como a IA deve falar",
    content:
      "Linguagem simples, profissional, próxima. Sem emojis em excesso. Sem promessas de prazo ou preço sem confirmação humana.",
  },
  {
    id: "kn5",
    category: "Exemplos de bons atendimentos",
    title: "Atendimento padrão para orçamento",
    content:
      "1) Cumprimentar 2) Pedir metragem, bairro, urgência 3) Confirmar tipo de obra 4) Encaminhar para vendedor.",
  },
];

export const aiLearnings = [
  {
    id: "al1",
    conversationId: "k1",
    original:
      "Posso te dar 10% de desconto se fechar agora.",
    edited:
      "Vou te conectar com nosso vendedor pra montar a melhor condição pra você 🙂",
    reason: "IA não deve oferecer desconto sem aprovação.",
    suggested: "Nunca prometer desconto. Sempre encaminhar negociação ao humano.",
    status: "pendente" as const,
    createdAt: "Hoje 10:40",
  },
  {
    id: "al2",
    conversationId: "k4",
    original: "Entrego amanhã sem problema.",
    edited: "Entrega depende da disponibilidade — confirmo com o time logístico.",
    reason: "Não prometer prazo sem confirmar.",
    suggested: "Sempre validar prazo com humano antes de confirmar.",
    status: "aprovado" as const,
    createdAt: "Ontem",
  },
];

export const users = [
  { id: "u1", name: "Ana Martins", email: "ana@gsgesso.com.br", role: "admin", active: true },
  { id: "u2", name: "Diego Lopes", email: "diego@gsgesso.com.br", role: "gestor", active: true },
  { id: "u3", name: "Renata Silva", email: "renata@gsgesso.com.br", role: "atendente", active: true },
  { id: "u4", name: "Bruno Faria", email: "bruno@gsgesso.com.br", role: "atendente", active: false },
];

export function getContact(id: string) {
  return contacts.find((c) => c.id === id);
}
