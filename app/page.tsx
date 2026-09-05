export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="w-64 border-r border-zinc-800 p-4">
          <h1 className="text-xl font-semibold">AJ AI</h1>

          <button className="mt-6 w-full rounded-lg bg-zinc-800 px-4 py-2 text-left hover:bg-zinc-700">
            + New Chat
          </button>

          <div className="mt-6 space-y-2 text-sm text-zinc-400">
            <div>Daily Life</div>
            <div>Gym</div>
            <div>School</div>
            <div>Trading</div>
            <div>Marketing</div>
          </div>
        </aside>

        <section className="flex flex-1 flex-col">
          <header className="border-b border-zinc-800 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">New Chat</h2>

              <div className="flex gap-2">
                <button className="rounded-lg bg-zinc-100 px-3 py-1.5 text-sm text-zinc-900">
                  GPT
                </button>

                <button className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm">
                  Claude
                </button>
              </div>
            </div>
          </header>

          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <h3 className="text-3xl font-semibold">How can I help?</h3>
              <p className="mt-2 text-zinc-500">One memory. Two AI brains.</p>
            </div>
          </div>

          <div className="border-t border-zinc-800 p-4">
            <div className="mx-auto flex max-w-3xl gap-3">
              <input
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 outline-none"
                placeholder="Message AJ AI..."
              />

              <button className="rounded-xl bg-zinc-100 px-5 py-3 font-medium text-zinc-900">
                Send
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
