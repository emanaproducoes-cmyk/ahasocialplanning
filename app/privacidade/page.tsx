export default function PrivacidadePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
      <p className="text-sm text-gray-500 mb-8">Última atualização: abril de 2026</p>

      <section className="space-y-6 text-gray-700 leading-relaxed">
        <div>
          <h2 className="text-xl font-semibold mb-2">1. Informações que coletamos</h2>
          <p>Coletamos informações fornecidas diretamente por você, como nome, e-mail e dados de contas de redes sociais conectadas à plataforma AHA Social Planning.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">2. Como usamos suas informações</h2>
          <p>Usamos suas informações para operar a plataforma, gerenciar agendamentos de publicações, gerar relatórios e melhorar nossos serviços. Não vendemos seus dados a terceiros.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">3. Dados de redes sociais</h2>
          <p>Ao conectar suas contas do Facebook e Instagram, coletamos tokens de acesso para publicar conteúdo em seu nome. Esses tokens são armazenados de forma segura e usados exclusivamente para as funcionalidades da plataforma.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">4. Compartilhamento de dados</h2>
          <p>Seus dados são compartilhados apenas com serviços essenciais para o funcionamento da plataforma, como Firebase (Google) e a API da Meta. Não compartilhamos seus dados com outros terceiros.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">5. Segurança</h2>
          <p>Adotamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda ou alteração.</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">6. Seus direitos</h2>
          <p>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento entrando em contato pelo e-mail: emanaproducoes@gmail.com</p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-2">7. Contato</h2>
          <p>Para dúvidas sobre esta política, entre em contato: <a href="mailto:emanaproducoes@gmail.com" className="text-orange-500 hover:underline">emanaproducoes@gmail.com</a></p>
        </div>
      </section>
    </main>
  );
}
