import { useState, useEffect, useCallback } from 'react';
import { materialsAPI } from '../services/api';
import { toast } from 'sonner';

export const useCourseMaterials = (courseId: string | null) => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMaterials = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const { data } = await materialsAPI.list(courseId);
      setMaterials(data || []);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to load course materials');
      toast.error('Failed to load course materials');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const uploadMaterial = async (formData: FormData) => {
    if (!courseId) return null;
    try {
      const { data } = await materialsAPI.upload(courseId, formData);
      toast.success('Material uploaded successfully');
      await fetchMaterials();
      return data;
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to upload material');
      throw err;
    }
  };

  const deleteMaterial = async (materialId: string) => {
    try {
      await materialsAPI.delete(materialId);
      toast.success('Material deleted successfully');
      setMaterials(prev => prev.filter(m => m.id !== materialId));
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to delete material');
      throw err;
    }
  };

  return {
    materials,
    loading,
    error,
    fetchMaterials,
    uploadMaterial,
    deleteMaterial
  };
};
