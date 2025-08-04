import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { useTheme } from '../../context/ThemeContext';
import { X, Plus, ChevronDown } from 'lucide-react';

interface Worker {
  id: string;
  name: string;
}

interface WorkerProject {
  id: string;
  name: string;
  price: number;
  worker_id: string;
}

interface AddWorkersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWorkers: (workers: { worker_id: string; project_id: string }[]) => void;
  existingWorkerIds: string[];
}

export function AddWorkersModal({ isOpen, onClose, onAddWorkers, existingWorkerIds }: AddWorkersModalProps) {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerProjects, setWorkerProjects] = useState<{ [key: string]: WorkerProject[] }>({});
  const [selectedWorkers, setSelectedWorkers] = useState<{ worker_id: string; project_id: string }[]>([]);
  const [workerSearch, setWorkerSearch] = useState('');
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [currentWorkerIndex, setCurrentWorkerIndex] = useState<number | null>(null);
  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const { getThemeStyle, theme } = useTheme();

  useEffect(() => {
    if (isOpen) {
      loadWorkers();
    }
  }, [isOpen]);

  const loadWorkers = async () => {
    try {
      const { data, error } = await supabase
        .from('workers')
        .select('*')
        .eq('organization_id', organization?.id)
        .eq('status', 'active')
        .not('id', 'in', `(${existingWorkerIds.join(',')})`);

      if (error) throw error;
      setWorkers(data || []);
    } catch (error) {
      console.error('Error loading workers:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load workers'
      });
    }
  };

  const loadWorkerProjects = async (workerId: string) => {
    try {
      const { data, error } = await supabase
        .from('worker_projects')
        .select('*')
        .eq('worker_id', workerId)
        .eq('status', 'active');

      if (error) throw error;
      setWorkerProjects(prev => ({
        ...prev,
        [workerId]: data || []
      }));
    } catch (error) {
      console.error('Error loading worker projects:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load worker projects'
      });
    }
  };

  const handleWorkerSelect = (worker: Worker, index: number) => {
    const newWorkers = [...selectedWorkers];
    newWorkers[index] = {
      ...newWorkers[index],
      worker_id: worker.id,
      project_id: ''  // Reset project when worker changes
    };
    setSelectedWorkers(newWorkers);
    setWorkerSearch('');
    setShowWorkerDropdown(false);
    setCurrentWorkerIndex(null);

    // Load projects for the selected worker
    loadWorkerProjects(worker.id);
  };

  const filteredWorkers = workers.filter(worker =>
    worker.name.toLowerCase().includes(workerSearch.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${getThemeStyle(theme, 'modal', 'overlay')} flex items-center justify-center z-50 p-4`}>
      <div className={`${getThemeStyle(theme, 'modal', 'background')} rounded-lg p-6 max-w-md w-full mx-4`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-base font-medium ${getThemeStyle(theme, 'text', 'primary')}`}>Add Workers</h3>
          <button
            onClick={onClose}
            className={`${getThemeStyle(theme, 'text', 'accent')} hover:${getThemeStyle(theme, 'text', 'muted')}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Add Worker Button */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSelectedWorkers([...selectedWorkers, { worker_id: '', project_id: '' }])}
              className={`inline-flex items-center px-2 py-1 border ${getThemeStyle(theme, 'border', 'primary')} rounded-md text-xs font-medium ${getThemeStyle(theme, 'text', 'primary')} ${getThemeStyle(theme, 'background', 'secondary')} hover:${getThemeStyle(theme, 'background', 'accent')}`}
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Worker
            </button>
          </div>

          {/* Worker Selection Fields */}
          {selectedWorkers.map((selectedWorker, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={selectedWorker.worker_id ? workers.find(w => w.id === selectedWorker.worker_id)?.name || '' : workerSearch}
                  onChange={(e) => {
                    if (selectedWorker.worker_id) {
                      // If a worker is already selected, clear the selection
                      const newWorkers = [...selectedWorkers];
                      newWorkers[index] = {
                        ...newWorkers[index],
                        worker_id: '',
                        project_id: ''
                      };
                      setSelectedWorkers(newWorkers);
                    }
                    setWorkerSearch(e.target.value);
                    setShowWorkerDropdown(true);
                    setCurrentWorkerIndex(index);
                  }}
                  onFocus={() => {
                    if (!selectedWorker.worker_id) {
                      setShowWorkerDropdown(true);
                      setCurrentWorkerIndex(index);
                    }
                  }}
                  placeholder="Search for a worker"
                  className={`block w-full px-2 py-1.5 text-xs border ${getThemeStyle(theme, 'border', 'primary')} rounded-md ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')}`}
                />
                {selectedWorker.worker_id && (
                  <button
                    type="button"
                    onClick={() => {
                      const newWorkers = [...selectedWorkers];
                      newWorkers[index] = {
                        ...newWorkers[index],
                        worker_id: '',
                        project_id: ''
                      };
                      setSelectedWorkers(newWorkers);
                    }}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </div>
                {showWorkerDropdown && currentWorkerIndex === index && filteredWorkers.length > 0 && (
                  <div className={`absolute z-10 mt-1 w-full rounded-md shadow-lg ${getThemeStyle(theme, 'background', 'secondary')} border ${getThemeStyle(theme, 'border', 'primary')} max-h-60 overflow-auto`}>
                    {filteredWorkers.map(worker => (
                      <div
                        key={worker.id}
                        onClick={() => handleWorkerSelect(worker, index)}
                        className={`px-2.5 py-1.5 text-xs cursor-pointer ${getThemeStyle(theme, 'text', 'primary')} hover:bg-blue-50 hover:text-blue-700`}
                      >
                        {worker.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <select
                  value={selectedWorker.project_id || ''}
                  onChange={(e) => {
                    const newWorkers = [...selectedWorkers];
                    newWorkers[index].project_id = e.target.value;
                    setSelectedWorkers(newWorkers);
                  }}
                  disabled={!selectedWorker.worker_id}
                  className={`block w-full px-2 py-1.5 text-xs border ${getThemeStyle(theme, 'border', 'primary')} rounded-md ${getThemeStyle(theme, 'background', 'secondary')} ${getThemeStyle(theme, 'text', 'primary')} disabled:opacity-60`}
                >
                  <option value="">Select Project</option>
                  {selectedWorker.worker_id && workerProjects[selectedWorker.worker_id]?.map(wp => (
                    <option key={wp.id} value={wp.id}>
                      {wp.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newWorkers = selectedWorkers.filter((_, i) => i !== index);
                  setSelectedWorkers(newWorkers);
                }}
                className={`p-1 ${getThemeStyle(theme, 'text', 'muted')} hover:text-red-500 rounded-full`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-xs font-medium ${getThemeStyle(theme, 'text', 'secondary')} ${getThemeStyle(theme, 'background', 'primary')} border ${getThemeStyle(theme, 'border', 'primary')} rounded-md ${getThemeStyle(theme, 'interactive', 'hover', 'background')} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              const validWorkers = selectedWorkers.filter(w => w.worker_id && w.project_id);
              if (validWorkers.length > 0) {
                onAddWorkers(validWorkers);
              }
            }}
            disabled={!selectedWorkers.some(w => w.worker_id && w.project_id)}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Workers
          </button>
        </div>
      </div>
    </div>
  );
} 