# AHA Social Planning

Plataforma completa para agências que gerenciam redes sociais — agendamento, aprovação e publicação de conteúdo.

## Stack

| Camada      | Tecnologia                     |
|-------------|--------------------------------|
| Frontend    | Next.js 14 App Router          |
| Linguagem   | TypeScript strict              |
| Estilo      | Tailwind CSS                   |
| Banco       | Firebase Firestore             |
| Auth        | Firebase Authentication        |
| Storage     | Firebase Storage               |
| Functions   | Firebase Cloud Functions v2    |
| Deploy      | Vercel (frontend) + Firebase   |

---

## Pré-requisitos

- Node.js 20+
- npm 10+
- Conta Firebase com projeto criado
- Conta Vercel (para deploy)
- Firebase CLI: `npm i -g firebase-tools`

---

## Configuração Inicial

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/sua-org/aha-social-planning.git
cd aha-social-planning
npm install
```

### 2. Criar projeto Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um novo projeto
3. Ative: **Authentication** → E-mail/Senha e Google
4. Ative: **Firestore Database** (modo produção)
5. Ative: **Storage**
6. Em **Authentication → Authorized domains**, adicione seu domínio Vercel

### 3. Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha:

```bash
cp .env.local.example .env.local
```

```env
# Firebase Client (visível no browser)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin (apenas servidor — NUNCA exponha no browser)
FIREBASE_PROJECT_ID=seu-projeto
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@seu-projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE\n-----END PRIVATE KEY-----\n"

# App
NEXT_PUBLIC_APP_URL=https://seu-dominio.vercel.app
```

**Como obter a chave privada Admin:**
1. Firebase Console → Configurações do Projeto → Contas de serviço
2. Clique em **Gerar nova chave privada** → baixe o JSON
3. Copie `client_email` e `private_key` para o `.env.local`

### 4. Configurar .firebaserc

Edite `.firebaserc` e substitua `SEU_FIREBASE_PROJECT_ID` pelo ID real do seu projeto.

### 5. Deploy das Security Rules e Indexes

```bash
firebase login
firebase use default
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 6. Deploy das Cloud Functions

```bash
cd firebase/functions
npm install
npm run build
cd ../..
firebase deploy --only functions
```

---

## Desenvolvimento Local

```bash
# Iniciar Next.js
npm run dev

# Com emuladores Firebase (opcional mas recomendado)
firebase emulators:start
# Acesse o Emulator UI em http://localhost:4000
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## Deploy em Produção

### Vercel (recomendado para o frontend)

1. Conecte o repositório no [vercel.com](https://vercel.com)
2. Adicione todas as variáveis do `.env.local` no painel **Settings → Environment Variables**
3. O deploy acontece automaticamente a cada push na branch `main`

```bash
# Deploy manual
npx vercel --prod
```

### Firebase Functions

```bash
firebase deploy --only functions
```

### Tudo de uma vez

```bash
# Build e deploy completo
npm run build
firebase deploy
npx vercel --prod
```

---

## Estrutura do Projeto

```
aha-social-planning/
├── app/
│   ├── (auth)/login/          # Tela de login split-screen
│   ├── (dashboard)/
│   │   ├── layout.tsx         # Layout protegido com sidebar + topbar
│   │   ├── dashboard/         # KPIs, funil, gráficos
│   │   ├── contas/            # Contas conectadas
│   │   ├── workflow/          # Kanban 7 colunas
│   │   ├── agendamentos/      # Lista / Grade / Calendário
│   │   ├── posts/             # Todos os posts
│   │   ├── em-analise/        # Posts em aprovação
│   │   ├── aprovados/         # Posts aprovados
│   │   ├── rejeitados/        # Posts rejeitados
│   │   ├── revisao/           # Posts em revisão
│   │   ├── campanhas/         # Gestão de campanhas
│   │   └── trafego-pago/      # Métricas de ads
│   ├── aprovacao/             # Página pública de aprovação (sem login)
│   ├── criar-post/            # Wizard de criação em 3 etapas
│   └── api/
│       ├── approval/generate/ # Gera token de aprovação
│       ├── approval/respond/  # Registra resposta de aprovação
│       ├── sync/              # Sincroniza contadores
│       └── upload/            # Gera URL de upload assinada
├── components/
│   ├── ui/                    # Toast, Modal, Badge, Skeleton, EmptyState
│   ├── layout/                # Sidebar, Topbar, PageHeader
│   ├── dashboard/             # KpiCard, Charts, ContentFunnel
│   ├── contas/                # ContaCard, IntegracoesModal
│   ├── workflow/              # PostCard, KanbanBoard, PostDetailModal
│   ├── agendamentos/          # AgendamentoCard, AgendamentoCalendario
│   ├── posts/                 # PostsPageTemplate
│   └── campanhas/             # CampanhaCard, CriarCampanhaModal
├── lib/
│   ├── firebase/
│   │   ├── config.ts          # Init client SDK + IndexedDB persistence
│   │   ├── admin.ts           # Init Admin SDK (server-side only)
│   │   ├── firestore.ts       # Helpers: listenCollection, saveDoc, etc.
│   │   └── storage.ts         # Upload com progress e validação
│   ├── hooks/
│   │   ├── useAuth.ts         # Login, logout, Google, resetPassword
│   │   ├── useCollection.ts   # onSnapshot genérico
│   │   ├── useBadges.ts       # Contadores em tempo real
│   │   └── usePreferences.ts  # ViewMode e filtros persistidos
│   ├── types/index.ts         # Todos os tipos TypeScript
│   └── utils/
│       ├── cn.ts              # clsx + tailwind-merge
│       ├── formatters.ts      # Datas, números, status labels
│       ├── firebase-errors.ts # Erros humanizados em pt-BR
│       └── approval.ts        # Geração de link, WhatsApp, mailto
├── firebase/
│   ├── firestore.rules        # Security rules completas
│   ├── storage.rules          # Storage rules com validação de tipo/tamanho
│   ├── firestore.indexes.json # Índices compostos
│   └── functions/src/index.ts # Cloud Functions (7 funções)
├── firebase.json              # Config Firebase CLI
├── .firebaserc                # Alias de projeto
├── vercel.json                # Config deploy Vercel
└── .env.local.example         # Template de variáveis de ambiente
```

---

## Funcionalidades Principais

| Funcionalidade | Detalhe |
|---|---|
| **Login** | E-mail/senha + Google OAuth + recuperação de senha |
| **Dashboard** | KPIs em tempo real · funil de conteúdo · 4 gráficos |
| **Contas** | Grid de plataformas estilo Reportei Flux · admin-only |
| **Workflow Kanban** | 7 colunas · drag-and-drop SortableJS · onSnapshot |
| **Criar Post** | Wizard 3 etapas · upload drag-and-drop · preview IG |
| **Agendamentos** | Lista / Grade / Calendário · preferências salvas |
| **Aprovação Pública** | Link com token UUID · expira em 7 dias · sem login |
| **Campanhas** | Modal 4 abas · progress de posts · slide-in detalhes |
| **Tráfego Pago** | Tabela sortável · CPC/CPM/CTR/ROAS · 3 gráficos |
| **Offline** | IndexedDB persistence · indicador de sync |
| **Admin** | `emanaproducoes@gmail.com` · custom claims Firebase |

---

## Admin

O e-mail `emanaproducoes@gmail.com` é automaticamente promovido a administrador no primeiro login via Cloud Function `onUserCreate`. Apenas o admin pode:

- Criar, editar e remover contas conectadas
- Promover outros usuários a admin via `setAdminClaim`

---

## Segurança

- Firebase Admin SDK nunca é importado em componentes client (`'use client'`)
- Tokens de API nunca são expostos no frontend
- Security Rules validam ownership e campos sensíveis
- Storage Rules limitam tamanho (50MB media, 5MB avatar) e tipo de arquivo
- Aprovações públicas: leitura por token, escrita controlada por campos permitidos

---

## Suporte

Dúvidas ou problemas: **emanaproducoes@gmail.com**

---

*AHA Social Planning v1.0 — Desenvolvido com Next.js 14 + Firebase v10*
