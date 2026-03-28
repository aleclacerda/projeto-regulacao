import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { BuscaAtiva } from './pages/BuscaAtiva';
import { Analise } from './pages/Analise';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/busca-ativa" element={<BuscaAtiva />} />
          <Route path="/analise" element={<Analise />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
