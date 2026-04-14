export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 lg:px-8 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-accent rounded-lg flex-shrink-0">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5.581m0 0H9m5.581 0m0 0H7m5.581 0v-5.5c0-.465-.122-.883-.35-1.5M7 10.5v5.5m0 0H4.581m0 0H2m2.581 0v-5.5c0-.465.122-.883.35-1.5"
                  />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-gray-900 truncate sm:text-2xl">
                Portal da Comunidade
              </h1>
            </div>
            <button className="text-accent hover:text-accent/80 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap">
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8 sm:py-12">
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 p-5 sm:p-12 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-3 sm:text-3xl sm:mb-4">
            Bem-vindo ao Portal da Comunidade
          </h2>
          <p className="text-gray-600 text-sm mb-6 sm:text-lg sm:mb-8">
            Esta é uma página de exemplo. O conteúdo do seu painel será adicionado aqui.
          </p>
          <p className="text-xs text-gray-500 sm:text-sm">
            Continue solicitando no chat para personalizar este painel com
            recursos como anúncios, solicitações de manutenção, pagamentos e
            muito mais.
          </p>
        </div>
      </main>
    </div>
  );
}
