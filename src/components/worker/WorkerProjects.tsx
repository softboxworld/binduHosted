import React, { useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, Briefcase } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUI } from '../../context/UIContext';
import { CURRENCIES } from '../../utils/constants';
import { getThemeStyle } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';

interface WorkerProjectsProps {
  worker: any;
  workerProjects: WorkerProject[];
  setWorkerProjects: React.Dispatch<React.SetStateAction<WorkerProject[]>>;
  organization: any;
}

interface WorkerProject {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price: number;
  created_at: string;
  updated_at: string;
  status: string;
  worker_id: string;
}

export default function WorkerProjects({
  worker,
  workerProjects,
  setWorkerProjects,
  organization
}: WorkerProjectsProps) {
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<number>(0);
  const [editingName, setEditingName] = useState<string>('');
  const [newProject, setNewProject] = useState({
    name: '',
    price: 0,
    description: ''
  });
  const { confirm, addToast } = useUI();
  const currencySymbol = CURRENCIES[organization.currency]?.symbol || organization.currency;
  const { theme } = useTheme();

  const baseInputClasses = `mt-1 block w-full rounded-md ${getThemeStyle(theme, 'border', 'primary')} shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'text', 'primary')}`;

  const handleAddProject = async () => {
    if (!organization || !worker || !newProject.name.trim() || !newProject.price) return;

    try {
      const { data: projectData, error: projectError } = await supabase
        .from('worker_projects')
        .insert([{
          organization_id: organization.id,
          worker_id: worker.id,
          name: newProject.name.trim(),
          price: newProject.price,
          description: newProject.description.trim() || null,
          status: 'active'
        }])
        .select()
        .single();

      if (projectError) throw projectError;

      setWorkerProjects(prev => [...prev, projectData]);
      setNewProject({ name: '', price: 0, description: '' });
      setShowAddProject(false);

      addToast({
        type: 'success',
        title: 'Project Added',
        message: 'The project has been added successfully.'
      });
    } catch (error) {
      console.error('Error adding project:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add project. Please try again.'
      });
    }
  };

  const handleUpdateProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('worker_projects')
        .update({
          name: editingName,
          price: editingPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (error) throw error;

      setWorkerProjects(prev => prev.map(wp => {
        if (wp.id === projectId) {
          return {
            ...wp,
            name: editingName,
            price: editingPrice,
            updated_at: new Date().toISOString()
          };
        }
        return wp;
      }));

      setEditingProjectId(null);
      setEditingPrice(0);
      setEditingName('');

      addToast({
        type: 'success',
        title: 'Project Updated',
        message: 'The project has been updated successfully.'
      });
    } catch (error) {
      console.error('Error updating project:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update project. Please try again.'
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    const confirmed = await confirm({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('worker_projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setWorkerProjects(prev => prev.filter(wp => wp.id !== projectId));

      addToast({
        type: 'success',
        title: 'Project Deleted',
        message: 'The project has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete project. Please try again.'
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-sm font-bold ${getThemeStyle(theme, 'text', 'primary')}`}>Projects & Rates</h3>
        <button
          onClick={() => setShowAddProject(true)}
          className={`inline-flex items-center px-2.5 py-1.5 ${getThemeStyle(theme, 'border', 'primary')} rounded-md text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'background', 'primary')} ${getThemeStyle(theme, 'interactive', 'hover', 'background')}`}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Project
        </button>
      </div>

      {showAddProject && (
        <div className={`mb-4 p-4 ${getThemeStyle(theme, 'border', 'primary')} rounded-md ${getThemeStyle(theme, 'background', 'secondary')}`}>
          <h3 className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'primary')} mb-4`}>Add New Project</h3>
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Project Name</label>
              <input
                type="text"
                value={newProject.name}
                onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                className={baseInputClasses}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Description</label>
              <textarea
                value={newProject.description}
                onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                className={baseInputClasses}
                placeholder="Enter project description"
                rows={3}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>Price ({currencySymbol})</label>
              <input
                type="number"
                value={newProject.price || ''}
                onChange={(e) => setNewProject(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                className={baseInputClasses}
                min="0"
                step="0.01"
                placeholder="Enter project price"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAddProject(false)}
                className={`px-4 py-2 text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'interactive', 'hover', 'text')}`}
              >
                Cancel
              </button>
              <button
                onClick={handleAddProject}
                disabled={!newProject.name.trim() || !newProject.price}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                Add Project
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
        {workerProjects.length === 0 ? (
          <p className={`text-center ${getThemeStyle(theme, 'text', 'muted')} py-4`}>No projects assigned yet.</p>
        ) : (
          <div className={`divide-y ${getThemeStyle(theme, 'border', 'primary')}`}>
            {workerProjects.map(wp => (
              <div key={wp.id} className="py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Briefcase className={`h-4 w-4 ${getThemeStyle(theme, 'text', 'muted')} mr-2`} />
                    <div>
                      <p className={`text-sm font-medium ${getThemeStyle(theme, 'text', 'secondary')}`}>
                        {editingProjectId === wp.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className={`${baseInputClasses} w-full`}
                            placeholder="Enter project name"
                          />
                        ) : (
                          wp.name
                        )}
                      </p>
                      {wp.description && (
                        <p className={`text-xs ${getThemeStyle(theme, 'text', 'muted')}`}>{wp.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    {editingProjectId === wp.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={editingPrice || ''}
                          onChange={(e) => setEditingPrice(parseFloat(e.target.value) || 0)}
                          className={`${baseInputClasses} w-24`}
                          min="0"
                          step="0.01"
                        />
                        <button
                          onClick={() => handleUpdateProject(wp.id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingProjectId(null)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className={`text-sm font-semibold ${getThemeStyle(theme, 'text', 'primary')} mr-4`}>
                          {currencySymbol} {wp.price.toFixed(2)}
                        </p>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEditingProjectId(wp.id);
                              setEditingPrice(wp.price);
                              setEditingName(wp.name);
                            }}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(wp.id)}
                            className="text-red-600 hover:text-red-700"
                            title="Delete project"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}