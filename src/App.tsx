import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { BuscaAtiva } from './pages/BuscaAtiva';
import { Analise } from './pages/Analise';
import BaseDados from './pages/BaseDados';

function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/busca-ativa" element={<BuscaAtiva />} />
          <Route path="/analise" element={<Analise />} />
          <Route path="/base-dados" element={<BaseDados />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
