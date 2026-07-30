import { Calculator } from './components/Calculator'
import { ThemeToggle } from './components/ThemeToggle'
import { useTheme } from './hooks/useTheme'
import './App.css'

function App() {
  const { theme, toggleTheme } = useTheme()

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">Calculator</h1>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>
      <Calculator />
    </main>
  )
}

export default App
