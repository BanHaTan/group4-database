import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function TaskBoard() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [states, setStates] = useState([]);

  const load = async () => {
    const [p, t, s] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/tasks`),
      api.get('/states')
    ]);
    setProject(p.data); setTasks(t.data); setStates(s.data);
  };

  useEffect(() => { load(); }, [id]);

  const moveTask = async (taskId, newStateId) => {
    await api.patch(`/tasks/${taskId}/state`, { state_id: newStateId });
    load();
  };

  const priorityColor = (name) => {
    switch (name) {
      case 'Urgent': return '#ef4444';
      case 'High': return '#f59e0b';
      case 'Medium': return '#3b82f6';
      default: return '#64748b';
    }
  };

  if (!project) return <div className="empty-state"><p>Đang tải...</p></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to={`/projects/${id}`} style={{ fontSize: '13px', color: '#64748b' }}>
            ← {project.project_name}
          </Link>
          <h1 style={{ marginTop: '8px' }}>🗂 Task Board</h1>
        </div>
      </div>

      <div className="board-container">
        {states.map(state => {
          const columnTasks = tasks.filter(t => t.state_id === state.state_id);
          // Nếu là cột đầu tiên, thêm cả task chưa có state
          const noStateTasks = state.state_id === states[0]?.state_id
            ? tasks.filter(t => !t.state_id) : [];
          const all = [...noStateTasks, ...columnTasks];

          return (
            <div key={state.state_id} className="board-column">
              <div className="board-column-header">
                <h3>{state.state_name}</h3>
                <span className="count">{all.length}</span>
              </div>
              <div className="board-column-body">
                {all.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#475569', fontSize: '13px' }}>
                    Trống
                  </div>
                ) : all.map(task => (
                  <div key={task.task_id} className="task-card">
                    <h4>{task.title}</h4>

                    {task.labels && (
                      <div className="task-card-meta">
                        {task.labels.split(', ').map((l, i) => (
                          <span key={i} className="badge" style={{ background: task.label_colors?.split(', ')[i] || '#6366f1', fontSize: '10px', padding: '2px 6px' }}>{l}</span>
                        ))}
                      </div>
                    )}

                    <div className="task-card-footer">
                      <div className="flex items-center gap-2">
                        {task.priority_name && (
                          <>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: priorityColor(task.priority_name), display: 'inline-block' }}></span>
                            <span>{task.priority_name}</span>
                          </>
                        )}
                      </div>
                      <span>{task.assignees || ''}</span>
                    </div>

                    {task.due_date && (
                      <div style={{ fontSize: '11px', color: new Date(task.due_date) < new Date() ? '#ef4444' : '#64748b', marginTop: '6px' }}>
                        📅 {new Date(task.due_date).toLocaleDateString('vi-VN')}
                      </div>
                    )}

                    {/* Move buttons */}
                    <div className="flex gap-2 flex-wrap mt-2">
                      {states.filter(s => s.state_id !== (task.state_id || states[0]?.state_id)).map(s => (
                        <button key={s.state_id} className="btn btn-ghost" style={{ fontSize: '11px', padding: '3px 8px', border: '1px solid #334155', borderRadius: '6px' }}
                          onClick={() => moveTask(task.task_id, s.state_id)}>
                          → {s.state_name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}