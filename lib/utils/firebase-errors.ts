const ERROR_MAP: Record<string, string> = {
  // Auth
  'auth/user-not-found':        'Nenhuma conta encontrada com este e-mail.',
  'auth/wrong-password':        'Senha incorreta. Tente novamente.',
  'auth/invalid-email':         'Endereço de e-mail inválido.',
  'auth/email-already-in-use':  'Este e-mail já está sendo usado por outra conta.',
  'auth/too-many-requests':     'Muitas tentativas. Tente novamente mais tarde.',
  'auth/network-request-failed':'Sem conexão com a internet. Verifique sua rede.',
  'auth/popup-closed-by-user':  'Login cancelado. Feche a janela e tente novamente.',
  'auth/popup-blocked':         'Pop-up bloqueado. Permita pop-ups e tente novamente.',
  'auth/account-exists-with-different-credential':
    'Já existe uma conta com este e-mail. Tente outro método de login.',
  'auth/invalid-credential':    'Credenciais inválidas. Verifique seus dados.',
  'auth/user-disabled':         'Esta conta foi desativada. Entre em contato com o suporte.',
  'auth/requires-recent-login': 'Por segurança, faça login novamente para continuar.',
  'auth/expired-action-code':   'Este link expirou. Solicite um novo.',
  'auth/invalid-action-code':   'Link inválido. Solicite um novo.',
  'auth/unauthorized-domain':   'Domínio não autorizado. Entre em contato com o suporte.',
  'auth/cancelled-popup-request':    '',
  'auth/redirect-cancelled-by-user': '',
  // Firestore
  'permission-denied':          'Sem permissão para realizar esta ação.',
  'unavailable':                'Serviço indisponível. Trabalhando offline.',
  'not-found':                  'Dados não encontrados.',
  'already-exists':             'Este registro já existe.',
  'resource-exhausted':         'Limite de requisições atingido. Tente novamente em breve.',
  'unauthenticated':            'Sessão expirada. Faça login novamente.',
  'internal':                   'Erro interno do servidor. Tente novamente.',
  'deadline-exceeded':          'A operação demorou muito. Verifique sua conexão.',
  // Storage
  'storage/unauthorized':       'Sem permissão para acessar este arquivo.',
  'storage/canceled':           'Upload cancelado.',
  'storage/quota-exceeded':     'Limite de armazenamento atingido.',
  'storage/unauthenticated':    'Faça login para fazer upload de arquivos.',
  'storage/object-not-found':   'Arquivo não encontrado.',
};

export function humanizeFirebaseError(code: string): string {
  return ERROR_MAP[code] ?? 'Ocorreu um erro inesperado. Tente novamente.';
}
