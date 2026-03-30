import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [members, setMembers] = useState([]);
  const [states, setStates] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [labels, setLabels] = useState([]);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);

  const [taskForm, setTaskForm] = useState({ title: '', description: '', sprint_id: '', state_id: '', priority_id: '', due_date: '' });
  const [sprintForm, setSprintForm] = useState({ sprint_name: '', start_date: '', end_date: '' });
  const [memberForm, setMemberForm] = useState({ email: '', project_role: 'CONTRIBUTOR' });
  const [editTaskId, setEditTaskId] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [stepText, setStepText] = useState('');
  const [memberError, setMemberError] = useState('');

  const load = async () => {
    try {
      const [p, t, s, m, st, pr, lb] = await Promise.all([
        api.get(`/projects/${id}`), api.get(`/projects/${id}/tasks`),
        api.get(`/projects/${id}/sprints`), api.get(`/projects/${id}/members`),
        api.get('/states'), api.get('/priorities'), api.get('/labels')
      ]);
      setProject(p.data); setTasks(t.data); setSprints(s.data);
      setMembers(m.data); setStates(st.data); setPriorities(pr.data); setLabels(lb.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { load(); }, [id]);

  // === TASK ===
  const submitTask = async (e) => {
    e.preventDefault();
    const body = { ...taskForm, sprint_id: taskForm.sprint_id || null, state_id: taskForm.state_id || null, priority_id: taskForm.priority_id || null };
    if (editTaskId) await api.put(`/tasks/${editTaskId}`, body);
    else await api.post('/tasks', body);
    setShowTaskModal(false); setEditTaskId(null);
    setTaskForm({ title: '', description: '', sprint_id: '', state_id: '', priority_id: '', due_date: '' });
    load();
  };

  const editTask = (t) => {
    setTaskForm({
      title: t.title || '', description: t.description || '',
      sprint_id: t.sprint_id || '', state_id: t.state_id || '',
      priority_id: t.priority_id || '', due_date: t.due_date ? t.due_date.split('T')[0] : ''
    });
    setEditTaskId(t.task_id); setShowTaskModal(true);
  };

  const deleteTask = async (tid) => {
    if (!confirm('Xóa task này?')) return;
    await api.delete(`/tasks/${tid}`); load();
  };

  // === SPRINT ===
  const submitSprint = async (e) => {
    e.preventDefault();
    await api.post(`/projects/${id}/sprints`, sprintForm);
    setShowSprintModal(false); setSprintForm({ sprint_name: '', start_date: '', end_date: '' }); load();
  };

  const deleteSprint = async (sid) => {
    if (!confirm('Xóa sprint? Tất cả task trong sprint sẽ bị xóa!')) return;
    await api.delete(`/sprints/${sid}`); load();
  };

  // === MEMBER ===
  const submitMember = async (e) => {
    e.preventDefault();
    setMemberError('');
    try {
      await api.post(`/projects/${id}/members`, memberForm);
      setShowMemberModal(false); setMemberForm({ email: '', project_role: 'CONTRIBUTOR' }); load();
    } catch (err) { setMemberError(err.response?.data?.error || 'Lỗi'); }
  };

  const removeMember = async (uid) => {
    if (!confirm('Xóa thành viên này?')) return;
    await api.delete(`/projects/${id}/members/${uid}`); load();
  };

  // === TASK DETAIL ===
  const openDetail = async (tid) => {
    const { data } = await api.get(`/tasks/${tid}`);
    setTaskDetail(data); setShowDetail(tid); setCommentText(''); setStepText('');
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    await api.post(`/tasks/${showDetail}/comments`, { content: commentText });
    setCommentText(''); openDetail(showDetail);
  };

  const addStep = async () => {
    if (!stepText.trim()) return;
    await api.post(`/tasks/${showDetail}/steps`, { step_description: stepText });
    setStepText(''); openDetail(showDetail);
  };

  const deleteStep = async (stepNo) => {
    await api.delete(`/tasks/${showDetail}/steps/${stepNo}`);
    openDetail(showDetail);
  };

  const assignUser = async (userId) => {
    await api.post(`/tasks/${showDetail}/assign`, { user_id: userId });
    openDetail(showDetail);
  };

  const unassignUser = async (userId) => {
    await api.delete(`/tasks/${showDetail}/assign/${userId}`);
    openDetail(showDetail);
  };

  const toggleLabel = async (labelId, isOn) => {
    if (isOn) await api.delete(`/tasks/${showDetail}/labels/${labelId}`);
    else await api.post(`/tasks/${showDetail}/labels`, { label_id: labelId });
    openDetail(showDetail);
  };

  // === UPLOAD ===
  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    await api.post(`/tasks/${showDetail}/attachments`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    openDetail(showDetail);
  };

  const deleteAttachment = async (attId) => {
    await api.delete(`/attachments/${attId}`);
    openDetail(showDetail);
  };

  if (!project) return <div className="empty-state"><p>Đang tải...</p></div>;

  return (
    <div>
      {/* HEADER */}
      <div className="page-header">
        <div>
          <Link to="/projects" style={{ fontSize: '13px', color: '#64748b' }}>← Quay lại danh sách</Link>
          <h1 style={{ marginTop: '8px' }}>{project.project_name}</h1>
          {project.description && <p className="text-sm text-muted mt-2">{project.description}</p>}
        </div>
        <Link to={`/projects/${id}/board`} className="btn btn-primary">🗂 Task Board</Link>
      </div>

      {/* TABS */}
      <div className="detail-tabs">
        <button className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}>📋 Tasks ({tasks.length})</button>
        <button className={tab === 'sprints' ? 'active' : ''} onClick={() => setTab('sprints')}>🏃 Sprints ({sprints.length})</button>
        <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>👥 Thành Viên ({members.length})</button>
      </div>

      {/* ====== TASKS TAB ====== */}
      {tab === 'tasks' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: '18px' }}>📋 Danh Sách Task</h2>
            <button className="btn btn-primary btn-sm" onClick={() => {
              setEditTaskId(null);
              setTaskForm({ title: '', description: '', sprint_id: '', state_id: '', priority_id: '', due_date: '' });
              setShowTaskModal(true);
            }}>+ Tạo Task</button>
          </div>
          {sprints.length === 0 ? (
            <div className="error-msg">⚠️ Chưa có Sprint. Hãy tạo Sprint trước khi tạo Task!</div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Task</th><th>Sprint</th><th>Trạng Thái</th><th>Ưu Tiên</th><th>Assignees</th><th>Due Date</th><th></th></tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr><td colSpan="7" style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Chưa có task nào</td></tr>
                  ) : tasks.map(t => (
                    <tr key={t.task_id}>
                      <td>
                        <span style={{ cursor: 'pointer', fontWeight: 500 }} onClick={() => openDetail(t.task_id)}>{t.title}</span>
                        {t.labels && (
                          <div className="flex gap-2 mt-2">
                            {t.labels.split(', ').map((l, i) => (
                              <span key={i} className="badge" style={{ background: t.label_colors?.split(', ')[i] || '#6366f1', fontSize: '10px' }}>{l}</span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="text-sm text-muted">{t.sprint_name || '—'}</td>
                      <td><span className={`badge badge-${t.state_name === 'Done' ? 'green' : t.state_name === 'In Progress' ? 'yellow' : t.state_name === 'Review' ? 'purple' : 'blue'}`}>{t.state_name || '—'}</span></td>
                      <td><span className={`badge badge-${t.priority_name === 'Urgent' ? 'red' : t.priority_name === 'High' ? 'yellow' : 'blue'}`}>{t.priority_name || '—'}</span></td>
                      <td className="text-sm text-muted">{t.assignees || '—'}</td>
                      <td className="text-sm">{t.due_date ? new Date(t.due_date).toLocaleDateString('vi-VN') : '—'}</td>
                      <td>
                        <div className="flex gap-2">
                          <button className="btn btn-sm btn-ghost" onClick={() => editTask(t)}>✏️</button>
                          <button className="btn btn-sm btn-ghost" onClick={() => deleteTask(t.task_id)} style={{ color: '#ef4444' }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ====== SPRINTS TAB ====== */}
      {tab === 'sprints' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: '18px' }}>🏃 Sprints</h2>
            <button className="btn btn-primary btn-sm" onClick={() => setShowSprintModal(true)}>+ Tạo Sprint</button>
          </div>
          {sprints.length === 0 ? (
            <div className="empty-state"><div className="icon">🏃</div><p>Chưa có sprint nào</p></div>
          ) : (
            <div className="project-grid">
              {sprints.map(s => (
                <div key={s.sprint_id} className="project-card" style={{ cursor: 'default' }}>
                  <div className="flex justify-between items-center">
                    <h3>{s.sprint_name}</h3>
                    <button className="btn btn-sm btn-ghost" onClick={() => deleteSprint(s.sprint_id)} style={{ color: '#ef4444' }}>🗑</button>
                  </div>
                  <div className="project-card-footer mt-3">
                    <span>📋 {s.task_count} tasks</span>
                    <span>✅ {s.done_count} done</span>
                    {s.start_date && <span>📅 {new Date(s.start_date).toLocaleDateString('vi-VN')}</span>}
                    {s.end_date && <span>→ {new Date(s.end_date).toLocaleDateString('vi-VN')}</span>}
                  </div>
                  {s.task_count > 0 && (
                    <div style={{ marginTop: '12px', background: '#334155', borderRadius: '4px', height: '6px' }}>
                      <div style={{ background: '#22c55e', borderRadius: '4px', height: '6px', width: `${(s.done_count / s.task_count) * 100}%`, transition: 'width 0.3s' }}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====== MEMBERS TAB ====== */}
      {tab === 'members' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: '18px' }}>👥 Thành Viên</h2>
            <button className="btn btn-primary btn-sm" onClick={() => { setMemberError(''); setShowMemberModal(true); }}>+ Thêm Thành Viên</button>
          </div>
          <div className="table-container">
            <table>
              <thead><tr><th>Tên</th><th>Email</th><th>Vai Trò</th><th>Ngày Tham Gia</th><th></th></tr></thead>
              <tbody>
                {members.map(m => (
                  <tr key={m.user_id}>
                    <td style={{ fontWeight: 500 }}>👤 {m.username}</td>
                    <td className="text-muted">{m.email}</td>
                    <td><span className={`badge badge-${m.project_role === 'OWNER' ? 'purple' : m.project_role === 'MAINTAINER' ? 'blue' : 'green'}`}>{m.project_role}</span></td>
                    <td className="text-sm text-muted">{new Date(m.joined_at).toLocaleDateString('vi-VN')}</td>
                    <td>
                      {m.project_role !== 'OWNER' && (
                        <button className="btn btn-sm btn-ghost" onClick={() => removeMember(m.user_id)} style={{ color: '#ef4444' }}>🗑</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ====== TASK CREATE/EDIT MODAL ====== */}
      {showTaskModal && (
        <div className="modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editTaskId ? '✏️ Sửa Task' : '📋 Tạo Task Mới'}</h2>
            <form onSubmit={submitTask}>
              <div className="form-group">
                <label>Tiêu đề *</label>
                <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} required placeholder="VD: Thiết kế giao diện đăng nhập" />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="Mô tả chi tiết..." />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Sprint *</label>
                  <select value={taskForm.sprint_id} onChange={e => setTaskForm({ ...taskForm, sprint_id: e.target.value })} required>
                    <option value="">-- Chọn Sprint --</option>
                    {sprints.map(s => <option key={s.sprint_id} value={s.sprint_id}>{s.sprint_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Trạng thái</label>
                  <select value={taskForm.state_id} onChange={e => setTaskForm({ ...taskForm, state_id: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {states.map(s => <option key={s.state_id} value={s.state_id}>{s.state_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Ưu tiên</label>
                  <select value={taskForm.priority_id} onChange={e => setTaskForm({ ...taskForm, priority_id: e.target.value })}>
                    <option value="">-- Chọn --</option>
                    {priorities.map(p => <option key={p.priority_id} value={p.priority_id}>{p.priority_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Hạn chót</label>
                  <input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editTaskId ? 'Cập Nhật' : 'Tạo Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== SPRINT MODAL ====== */}
      {showSprintModal && (
        <div className="modal-overlay" onClick={() => setShowSprintModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>🏃 Tạo Sprint Mới</h2>
            <form onSubmit={submitSprint}>
              <div className="form-group">
                <label>Tên Sprint *</label>
                <input value={sprintForm.sprint_name} onChange={e => setSprintForm({ ...sprintForm, sprint_name: e.target.value })} required placeholder="VD: Sprint 1" />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Bắt đầu</label>
                  <input type="date" value={sprintForm.start_date} onChange={e => setSprintForm({ ...sprintForm, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Kết thúc</label>
                  <input type="date" value={sprintForm.end_date} onChange={e => setSprintForm({ ...sprintForm, end_date: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSprintModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo Sprint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== MEMBER MODAL ====== */}
      {showMemberModal && (
        <div className="modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>👥 Thêm Thành Viên</h2>
            {memberError && <div className="error-msg">{memberError}</div>}
            <form onSubmit={submitMember}>
              <div className="form-group">
                <label>Email người dùng *</label>
                <input type="email" value={memberForm.email} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} required placeholder="member@email.com" />
              </div>
              <div className="form-group">
                <label>Vai trò</label>
                <select value={memberForm.project_role} onChange={e => setMemberForm({ ...memberForm, project_role: e.target.value })}>
                  <option value="CONTRIBUTOR">Contributor</option>
                  <option value="MAINTAINER">Maintainer</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMemberModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Thêm</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== TASK DETAIL MODAL ====== */}
      {showDetail && taskDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 style={{ fontSize: '18px' }}>📋 {taskDetail.title}</h2>
              <button className="btn btn-ghost" onClick={() => setShowDetail(null)} style={{ fontSize: '18px' }}>✕</button>
            </div>

            {/* Info Grid */}
            <div className="grid-2 mb-4">
              <div><span className="text-sm text-muted">Trạng thái: </span><span className={`badge badge-${taskDetail.state_name === 'Done' ? 'green' : 'blue'}`}>{taskDetail.state_name || '—'}</span></div>
              <div><span className="text-sm text-muted">Ưu tiên: </span><span className={`badge badge-${taskDetail.priority_name === 'Urgent' ? 'red' : 'yellow'}`}>{taskDetail.priority_name || '—'}</span></div>
              <div><span className="text-sm text-muted">Sprint: </span>{taskDetail.sprint_name || '—'}</div>
              <div><span className="text-sm text-muted">Hạn: </span>{taskDetail.due_date ? new Date(taskDetail.due_date).toLocaleDateString('vi-VN') : '—'}</div>
            </div>

            {/* Description */}
            {taskDetail.description && (
              <div style={{ background: '#0f172a', padding: '14px', borderRadius: '8px', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>
                {taskDetail.description}
              </div>
            )}

            {/* Assignees */}
            <div className="mb-4">
              <h3 className="text-sm" style={{ marginBottom: '8px', fontWeight: 600 }}>👥 Phân công</h3>
              <div className="flex gap-2 flex-wrap mb-3">
                {taskDetail.assignees?.filter(a => a.status === 'ACTIVE').map(a => (
                  <span key={a.user_id} className="badge badge-purple" style={{ cursor: 'pointer' }} onClick={() => unassignUser(a.user_id)} title="Click để gỡ">
                    👤 {a.username} ✕
                  </span>
                ))}
                {taskDetail.assignees?.filter(a => a.status === 'ACTIVE').length === 0 && <span className="text-sm text-muted">Chưa có ai</span>}
              </div>
              <select
                className="inline-input"
                onChange={e => { if (e.target.value) { assignUser(e.target.value); e.target.value = ''; } }}
                defaultValue=""
              >
                <option value="">+ Thêm người...</option>
                {members.filter(m => !taskDetail.assignees?.find(a => a.user_id === m.user_id && a.status === 'ACTIVE'))
                  .map(m => <option key={m.user_id} value={m.user_id}>{m.username} ({m.email})</option>)}
              </select>
            </div>

            {/* Labels */}
            <div className="mb-4">
              <h3 className="text-sm" style={{ marginBottom: '8px', fontWeight: 600 }}>🏷 Labels</h3>
              <div className="flex gap-2 flex-wrap">
                {labels.map(l => {
                  const isOn = taskDetail.labels?.find(tl => tl.label_id === l.label_id);
                  return (
                    <button key={l.label_id} onClick={() => toggleLabel(l.label_id, isOn)}
                      className="badge" style={{
                        background: isOn ? (l.color || '#6366f1') : '#334155',
                        cursor: 'pointer',
                        border: isOn ? 'none' : '1px dashed #64748b',
                        opacity: isOn ? 1 : 0.7
                      }}>
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Steps */}
            <div className="mb-4">
              <h3 className="text-sm" style={{ marginBottom: '8px', fontWeight: 600 }}>
                📝 Steps ({taskDetail.steps?.length || 0})
              </h3>
              {taskDetail.steps?.map(s => (
                <div key={s.step_no} className="step-item">
                  <span style={{ flex: 1 }}>#{s.step_no} - {s.step_description}</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => deleteStep(s.step_no)} style={{ color: '#ef4444' }}>✕</button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <input className="inline-input" style={{ flex: 1 }} value={stepText}
                  onChange={e => setStepText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addStep()}
                  placeholder="Thêm bước mới..." />
                <button className="btn btn-sm btn-secondary" onClick={addStep}>+</button>
              </div>
            </div>

            {/* Attachments */}
            <div className="mb-4">
              <h3 className="text-sm" style={{ marginBottom: '8px', fontWeight: 600 }}>📎 Đính kèm ({taskDetail.attachments?.length || 0})</h3>
              {taskDetail.attachments?.map(att => (
                <div key={att.attachment_id} className="flex justify-between items-center" style={{ padding: '6px 0', borderBottom: '1px solid #334155' }}>
                  <a href={att.url_or_path} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px' }}>
                    📄 {att.file_name}
                  </a>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted">{att.uploader}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteAttachment(att.attachment_id)} style={{ color: '#ef4444' }}>✕</button>
                  </div>
                </div>
              ))}
              <div className="mt-2">
                <input type="file" onChange={uploadFile} style={{ fontSize: '13px', color: '#94a3b8' }} />
              </div>
            </div>

            {/* Comments */}
            <div>
              <h3 className="text-sm" style={{ marginBottom: '8px', fontWeight: 600 }}>💬 Bình luận ({taskDetail.comments?.length || 0})</h3>
              <div className="comment-list">
                {taskDetail.comments?.map(c => (
                  <div key={c.comment_no} className="comment-item">
                    <div className="comment-header">
                      <span className="author">👤 {c.username}</span>
                      <span className="date">{new Date(c.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <div className="comment-content">{c.content}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <input className="inline-input" style={{ flex: 1, padding: '10px 14px' }}
                  value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addComment()}
                  placeholder="Viết bình luận..." />
                <button className="btn btn-primary btn-sm" onClick={addComment}>Gửi</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}