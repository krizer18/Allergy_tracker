import './App.css'
import Registration from './Components/Registrations/Registration'

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Allergy Tracker</h1>
        <p>Check your Amazon Fresh cart for allergens</p>
      </header>
      
      <main>
        <Registration />
      </main>
      
      <footer className="app-footer">
        <p>Allergy Tracker &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}

export default App
