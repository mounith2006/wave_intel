import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SignalProvider } from './context/SignalContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ProcessingOverlay } from './components/ProcessingOverlay';

// Guided Workflow Pages
import { Dashboard } from './pages/Dashboard';
import { UploadSignal } from './pages/UploadSignal';
import { AnalyzeSignal } from './pages/AnalyzeSignal';
import { DecodeSignal } from './pages/DecodeSignal';
import { BitstreamAnalysis } from './pages/BitstreamAnalysis';
import { MLEvaluation } from './pages/MLEvaluation';
import { ParameterValidation } from './pages/ParameterValidation';
import { Reports } from './pages/Reports';

export default function App() {
  return (
    <SignalProvider>
      <Router>
        <div className="min-h-screen bg-[#F5F8FC] text-slate-900 flex flex-col font-sans">
          <Header />

          <div className="flex flex-1 relative overflow-hidden">
            <Sidebar />

            <main className="flex-1 p-8 overflow-y-auto max-h-[calc(100vh-57px)]">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/upload" element={<UploadSignal />} />
                <Route path="/analyze" element={<AnalyzeSignal />} />
                <Route path="/decode" element={<DecodeSignal />} />
                <Route path="/bitstream" element={<BitstreamAnalysis />} />
                <Route path="/ml-evaluation" element={<MLEvaluation />} />
                <Route path="/param-validation" element={<ParameterValidation />} />
                <Route path="/reports" element={<Reports />} />
              </Routes>
            </main>
          </div>

          <ProcessingOverlay />
        </div>
      </Router>
    </SignalProvider>
  );
}
