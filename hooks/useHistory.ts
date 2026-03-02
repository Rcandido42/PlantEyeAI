import { useState, useEffect } from 'react';
import { HistoryItem, AnalysisResult } from '../types';

export const useHistory = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    // Load history from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('planteye_history');
            if (stored) {
                setHistory(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to parse history:', e);
        }
    }, []);

    // Save a new diagnosis to history
    const addHistoryItem = (result: AnalysisResult, imageUrl: string) => {
        const newItem: HistoryItem = {
            ...result,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            imageUrl,
        };

        setHistory((prev) => {
            const updated = [newItem, ...prev];
            localStorage.setItem('planteye_history', JSON.stringify(updated));
            return updated;
        });
    };

    // Clear all history
    const clearHistory = () => {
        setHistory([]);
        localStorage.removeItem('planteye_history');
    };

    // Delete a specific history item
    const deleteHistoryItem = (id: string) => {
        setHistory((prev) => {
            const updated = prev.filter(item => item.id !== id);
            localStorage.setItem('planteye_history', JSON.stringify(updated));
            return updated;
        });
    };

    return { history, addHistoryItem, clearHistory, deleteHistoryItem };
};
