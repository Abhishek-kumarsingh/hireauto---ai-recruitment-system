'use client';

import React, { useState } from 'react';
import ChatInterface from '@/components/ChatInterface';
import HRDashboard from '@/components/HRDashboard';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Bot, Users, LayoutDashboard, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Home() {
  const [view, setView] = useState<'candidate' | 'hr'>('candidate');

  return (
    <main className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Bot size={24} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">HireAuto AI</h1>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setView('candidate')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'candidate' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare size={18} />
            Candidate Chat
          </button>
          <button
            onClick={() => setView('hr')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              view === 'hr' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <LayoutDashboard size={18} />
            HR Dashboard
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3 text-sm text-gray-500">
          <Users size={18} />
          <span>Admin Panel</span>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            {view === 'candidate' ? (
              <motion.div
                key="candidate"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full flex flex-col items-center gap-8"
              >
                <div className="text-center max-w-2xl">
                  <h2 className="text-4xl font-extrabold text-gray-900 mb-4">Apply with AI Intelligence</h2>
                  <p className="text-lg text-gray-600">
                    Our AI bot will guide you through the application process. 
                    Get scored instantly and fast-track your career.
                  </p>
                </div>
                <ChatInterface />
              </motion.div>
            ) : (
              <motion.div
                key="hr"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full"
              >
                <HRDashboard />
              </motion.div>
            )}
          </AnimatePresence>
        </ErrorBoundary>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 text-center text-sm text-gray-500">
        <p>© 2026 HireAuto AI Recruitment Systems. All rights reserved.</p>
      </footer>
    </main>
  );
}
