import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { UploadVideo } from './pages/Upload';
import { Watchroom } from './pages/Watchroom';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<UploadVideo />} />
          <Route path="/room/:roomId" element={<Watchroom />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
