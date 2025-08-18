import { useState } from 'react';
import { generateContentBrief, editContentBrief } from '@/lib/api';

interface BriefData {
  title: string;
  keyPoints: string[];
  wordCount: string;
  id?: string;
  keywordId?: string;
  clientId?: string;
}

interface BriefFormData {
  targetKeyword: string;
  contentType: string;
  targetAudience: string;
}

export function useContentBrief() {
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const generateBrief = async (formData: BriefFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get a test keyword ID for database storage
      let keywordId: string | undefined;
      try {
        const setupResponse = await fetch('/api/setup-test', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (setupResponse.ok) {
          const setupData = await setupResponse.json();
          keywordId = setupData.keywordId;
        }
      } catch (setupError) {
        console.log('Could not setup test data, proceeding without database storage');
      }

      const requestData = {
        targetKeyword: formData.targetKeyword,
        contentType: formData.contentType,
        ...(formData.targetAudience && { targetAudience: formData.targetAudience }),
        ...(keywordId && { keywordId }),
      };

      const response = await generateContentBrief(requestData);
      setBrief(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate brief');
    } finally {
      setIsLoading(false);
    }
  };

  const editBrief = async (edits: Partial<BriefData>) => {
    if (!brief) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // For now, we'll just update the local state
      // In a real app, you'd send this to the backend
      setBrief(prev => prev ? { ...prev, ...edits } : null);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit brief');
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = () => {
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const clearBrief = () => {
    setBrief(null);
    setError(null);
    setIsEditing(false);
  };

  return {
    brief,
    isLoading,
    error,
    isEditing,
    generateBrief,
    editBrief,
    startEditing,
    cancelEditing,
    clearBrief,
  };
}
