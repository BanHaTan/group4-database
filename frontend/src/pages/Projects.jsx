import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ project_name: '', description: '', start_date: '', end_date: '' });
  const [editId, setEditId] = useState(null);
  const navigate = useNavigate();

  const load = () => api.get('/projects').then(r => setProjects(r.data));
  useEffect(() => { load(); }, []);

  const reset = () => { setForm({ project_name: '', description: '', start_date: '', end_date: '' }); setEditId(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) await api.put(`/projects/${editId}`, form);
    else await api.post('/projects', form);
    setShowModal(false); reset(); load();
  };

  const openEdit = (p, e) => {
    e.stopPropagation();
    setForm({
      project_name: p.project_name,
      description: p.description || '',
      start_date: p.start_date ? p.start_date.split('T')[0] : '',
      end_date: p.end_date ? p.end_date.split('T')[0] : ''
    });
    setEditId(p.project_id);
    setShowModal(true);
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Xóa dự án này? Mọi sprint, task bên trong sẽ bị xóa theo!')) return;
    await api.delete(`/projects/${id}`);
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>📁 Dự Án</h1>
        <button className="btn btn-primary" onClick={() => { reset(); setShowModal(true); }}>+ Tạo Dự Án</button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📂</div>
          <p>Chưa có dự án nào. Hãy tạo dự án đầu tiên!</p>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(p => (
            <div key={p.project_id} className="project-card" onClick={() => navigate(`/projects/${p.project_id}`)}>
              <div className="flex justify-between items-center mb-3">
                <h3>{p.project_name}</h3>
                <span className={`badge badge-${p.project_role === 'OWNER' ? 'purple' : p.project_role === 'MAINTAINER' ? 'blue' : 'green'}`}>
                  {p.project_role}
                </span>
              </div>
              <p className="desc">{p.description || 'Chưa có mô tả'}</p>
              <div className="project-card-footer">
                <span>📋 {p.task_count || 0} tasks</span>
                <span>👥 {p.member_count || 0} thành viên</span>
                {p.start_date && <span>📅 {new Date(p.start_date).toLocaleDateString('vi-VN')}</span>}
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); navigate(`/projects/${p.project_id}/board`); }}>
                  🗂 Board
                </button>
                <button className="btn btn-sm btn-secondary" onClick={(e) => openEdit(p, e)}>✏️</button>
                {p.project_role === 'OWNER' && (
                  <button className="btn btn-sm btn-danger" onClick={(e) => handleDelete(p.project_id, e)}>🗑</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editId ? '✏️ Sửa Dự Án' : '📁 Tạo Dự Án Mới'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Tên dự án *</label>
                <input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} required placeholder="VD: Website Bán Hàng" />
              </div>
              <div className="form-group">
                <label>Mô tả</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả ngắn về dự án..." />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Ngày bắt đầu</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Ngày kết thúc</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Cập Nhật' : 'Tạo Dự Án'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}