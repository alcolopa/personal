import "./App.css";

function App() {
  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-black text-white z-50 shadow">
        <div className="max-w-screen-xl mx-auto flex justify-between items-center h-16 px-4">
          <a href="/" className="flex items-center">
            <img
              src="https://placehold.co/40/000000/FFFFFF?text=EM"
              alt="Emilio"
              className="h-10 w-10 mr-2 rounded"
            />
            <span className="text-lg font-semibold">Emilio EL Murr</span>
          </a>

          <nav className="flex gap-6 text-sm font-medium">
            <a href="/projects" className="hover:underline transition-colors">Projects</a>
            <a href="/about" className="hover:underline transition-colors">About</a>
            <a href="/contact" className="hover:underline transition-colors">Contact</a>
          </nav>
        </div>
      </header>

      <main className="flex flex-col items-center justify-center min-h-svh pt-20">
      </main>
    </>
  );
}

export default App;
