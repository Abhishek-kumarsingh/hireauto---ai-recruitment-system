'use client';

import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { motion } from 'motion/react';
import { Search, Filter, Phone, FileText, TrendingUp, TrendingDown, Minus, User } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const HRDashboard = () => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      if (u) {
        setIsAuthReady(true);
      } else {
        setIsAuthReady(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  useEffect(() => {
    if (!isAuthReady) return;

    const path = 'candidates';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCandidates(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    });
    return () => unsubscribe();
  }, [isAuthReady]);

  const filteredCandidates = candidates.filter(c => {
    const matchesFilter = filter === 'All' || c.status === filter;
    const matchesSearch = (c.job?.toLowerCase().includes(search.toLowerCase())) || 
                          (c.name?.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hot': return 'bg-red-100 text-red-700 border-red-200';
      case 'Warm': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Cold': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getScoreIcon = (score: number) => {
    if (score > 70) return <TrendingUp className="text-green-500" size={16} />;
    if (score > 40) return <Minus className="text-orange-500" size={16} />;
    return <TrendingDown className="text-red-500" size={16} />;
  };

  if (!isAuthReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="bg-blue-50 p-4 rounded-full text-blue-600 mb-4">
          <User size={32} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Access Required</h2>
        <p className="text-gray-600 max-w-md mb-6">Please login with your admin account to view the candidate dashboard.</p>
        <button
          onClick={handleLogin}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Login with Google
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
          <p className="text-sm text-gray-500">Manage and screen incoming candidates</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search job or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="All">All Status</option>
            <option value="Hot">Hot</option>
            <option value="Warm">Warm</option>
            <option value="Cold">Cold</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Hot Candidates</p>
            <p className="text-2xl font-bold">{candidates.filter(c => c.status === 'Hot').length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Warm Candidates</p>
            <p className="text-2xl font-bold">{candidates.filter(c => c.status === 'Warm').length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Total Applications</p>
            <p className="text-2xl font-bold">{candidates.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-bottom border-gray-100">
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Candidate / Job</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Experience</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Skills</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Score</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCandidates.map((c) => (
              <motion.tr 
                key={c.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{c.name || 'Anonymous'}</p>
                      <p className="text-xs text-gray-500">{c.job}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-gray-600">{c.experience} Years</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {c.skills?.slice(0, 3).map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                        {s}
                      </span>
                    ))}
                    {c.skills?.length > 3 && <span className="text-[10px] text-gray-400">+{c.skills.length - 3} more</span>}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    {getScoreIcon(c.score)}
                    <span className="text-sm font-bold">{c.score}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(c.status)}`}>
                    {c.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="View Resume">
                      <FileText size={18} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-green-600 transition-colors" title="Call Candidate">
                      <Phone size={18} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {filteredCandidates.length === 0 && (
          <div className="p-12 text-center text-gray-500">
            <p>No candidates found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRDashboard;
