'use client';

import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/StatusComponents';
import { api, ModelInfo } from '@/lib/api';
import { Brain, HardDrive, FileCode, Cpu, Layers, Network } from 'lucide-react';

const MODEL_DESCRIPTIONS: Record<string, { description: string; architecture: string; icon: React.ElementType }> = {
    cnn_lstm: {
        description: 'Convolutional Neural Network + Long Short-Term Memory for direct stock price prediction without frequency decomposition.',
        architecture: 'Conv1D(512) → MaxPool → LSTM(200) → FC(1)',
        icon: Network,
    },
    lstm: {
        description: 'Long Short-Term Memory network for direct sequential prediction.',
        architecture: 'LSTM(200) → FC(1)',
        icon: Cpu,
    },
    cnn_lstm_emd: {
        description: 'CNN-LSTM trained on each Intrinsic Mode Function from Empirical Mode Decomposition. Reconstructs prediction by summing IMF predictions.',
        architecture: 'EMD → [Conv1D(512) → MaxPool → LSTM(200) → FC(1)] × N_IMFs',
        icon: Layers,
    },
    lstm_emd: {
        description: 'LSTM trained on EMD decomposed IMFs. Each IMF gets its own LSTM model.',
        architecture: 'EMD → [LSTM(200) → FC(1)] × N_IMFs',
        icon: Layers,
    },
    cnn_lstm_ceemd: {
        description: 'CNN-LSTM trained on CEEMD decomposed IMFs. CEEMD provides more stable decomposition than EMD.',
        architecture: 'CEEMD → [Conv1D(512) → MaxPool → LSTM(200) → FC(1)] × N_IMFs',
        icon: Layers,
    },
    lstm_ceemd: {
        description: 'LSTM trained on CEEMD decomposed IMFs. Complete Ensemble EMD provides noise-robust decomposition.',
        architecture: 'CEEMD → [LSTM(200) → FC(1)] × N_IMFs',
        icon: Layers,
    },
};

export default function ModelsPage() {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getModels().then(setModels).catch(console.error).finally(() => setLoading(false));
    }, []);

    if (loading) return <LoadingSpinner message="Loading models..." />;

    const totalFiles = models.reduce((sum, m) => sum + m.num_files, 0);
    const totalSize = models.reduce((sum, m) => sum + m.total_size_mb, 0);

    return (
        <div className="space-y-8 animate-slide-up">
            <div>
                <h1 className="text-2xl font-chivo font-bold uppercase tracking-wider flex items-center gap-3">
                    <Brain size={28} className="text-indigo-400" />
                    Model Registry
                </h1>
                <p className="text-slate-500 mt-1">Pre-trained deep learning models</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6">
                    <p className="text-slate-500 text-xs uppercase tracking-wider font-mono mb-2">Architectures</p>
                    <p className="text-3xl font-bold font-mono text-slate-100">{models.length}</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6">
                    <p className="text-slate-500 text-xs uppercase tracking-wider font-mono mb-2">Model Files</p>
                    <p className="text-3xl font-bold font-mono text-slate-100">{totalFiles}</p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6">
                    <p className="text-slate-500 text-xs uppercase tracking-wider font-mono mb-2">Total Storage</p>
                    <p className="text-3xl font-bold font-mono text-slate-100">{totalSize.toFixed(1)} MB</p>
                </div>
            </div>

            {/* Model Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {models.map((model) => {
                    const meta = MODEL_DESCRIPTIONS[model.name] || {
                        description: 'Custom model architecture.',
                        architecture: 'Unknown',
                        icon: Brain,
                    };
                    const Icon = meta.icon;

                    return (
                        <div
                            key={model.name}
                            className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6 hover:border-slate-500 transition-all relative overflow-hidden"
                        >
                            <Icon size={80} className="absolute -right-4 -top-4 text-slate-700/10" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-3">
                                    <Icon size={20} className="text-indigo-400" />
                                    <h3 className="font-chivo font-bold uppercase tracking-wider text-sm">
                                        {model.display_name}
                                    </h3>
                                </div>

                                <p className="text-slate-400 text-sm mb-4">{meta.description}</p>

                                <div className="bg-slate-900/60 border border-slate-800 rounded-sm p-3 mb-4">
                                    <p className="text-xs text-slate-500 font-mono uppercase mb-1">Architecture</p>
                                    <p className="text-xs text-blue-400 font-mono">{meta.architecture}</p>
                                </div>

                                <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <FileCode size={12} />
                                        {model.num_files} files
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <HardDrive size={12} />
                                        {model.total_size_mb.toFixed(1)} MB
                                    </span>
                                </div>

                                {/* File list */}
                                <div className="mt-3 flex flex-wrap gap-1">
                                    {model.files.slice(0, 4).map((f) => (
                                        <span
                                            key={f}
                                            className="text-[10px] font-mono text-slate-600 bg-slate-900 px-2 py-0.5 rounded"
                                        >
                                            {f}
                                        </span>
                                    ))}
                                    {model.files.length > 4 && (
                                        <span className="text-[10px] font-mono text-slate-600 bg-slate-900 px-2 py-0.5 rounded">
                                            +{model.files.length - 4} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Training Config */}
            <div className="bg-slate-800/40 border border-slate-700/60 rounded-sm p-6">
                <h3 className="text-sm font-mono text-slate-400 uppercase tracking-widest mb-4">
                    Training Configuration
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {[
                        { label: 'Window Size', value: '250 steps' },
                        { label: 'Batch Size', value: '64' },
                        { label: 'Optimizer', value: 'Adam' },
                        { label: 'Loss Function', value: 'MSE' },
                        { label: 'Learning Rate', value: '1e-4' },
                        { label: 'Test Split', value: '150 points' },
                        { label: 'Data Period', value: '2010–2019' },
                        { label: 'Scaler', value: 'MinMaxScaler' },
                    ].map((item) => (
                        <div key={item.label} className="bg-slate-900/50 border border-slate-800/50 rounded-sm px-3 py-2">
                            <p className="text-xs text-slate-500 font-mono uppercase">{item.label}</p>
                            <p className="text-slate-100 font-mono font-bold">{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
