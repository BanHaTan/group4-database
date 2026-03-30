// ======================== MIDDLEWARE ========================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://banhatan.github.io' // Thêm trực tiếp để chắc chắn
];

// Nếu có biến môi trường FRONTEND_URL thì thêm vào danh sách
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ""));
}

app.use(cors({
  origin: function (origin, callback) {
    // Cho phép các request không có origin (như Postman/Mobile)
    if (!origin) return callback(null, true);
    
    // Kiểm tra xem origin có trong danh sách cho phép không
    const isAllowed = allowedOrigins.includes(origin.replace(/\/$/, ""));
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // Trong giai đoạn dev, nếu không khớp vẫn cho qua nhưng log lỗi
      console.error(`CORS Blocked for: ${origin}`);
      callback(null, true); 
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'PM System API đang chạy 🚀' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Multer - upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ======================== AUTH MIDDLEWARE ========================
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Yêu cầu đăng nhập' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token không hợp lệ' });
  }
}

// ======================== SEED DATA ========================
async function seedData() {
  try {
    // Chèn STATE nếu chưa có
    const [states] = await pool.query('SELECT COUNT(*) as c FROM `STATE`');
    if (states[0].c === 0) {
      await pool.query(
        'INSERT INTO `STATE` (state_name) VALUES (?), (?), (?), (?), (?)',
        ['Backlog', 'Todo', 'In Progress', 'Review', 'Done']
      );
      console.log('✅ Seed STATE xong');
    }

    // Chèn PRIORITY nếu chưa có
    const [pris] = await pool.query('SELECT COUNT(*) as c FROM `PRIORITY`');
    if (pris[0].c === 0) {
      await pool.query(
        'INSERT INTO `PRIORITY` (priority_name, sort_order) VALUES (?,?), (?,?), (?,?), (?,?)',
        ['Urgent', 1, 'High', 2, 'Medium', 3, 'Low', 4]
      );
      console.log('✅ Seed PRIORITY xong');
    }

    // Chèn LABEL nếu chưa có
    const [labels] = await pool.query('SELECT COUNT(*) as c FROM `LABEL`');
    if (labels[0].c === 0) {
      await pool.query(
        'INSERT INTO `LABEL` (name, color) VALUES (?,?), (?,?), (?,?), (?,?), (?,?), (?,?)',
        ['Bug', '#ef4444', 'Feature', '#22c55e', 'Enhancement', '#3b82f6',
         'Documentation', '#a855f7', 'Design', '#f59e0b', 'Testing', '#06b6d4']
      );
      console.log('✅ Seed LABEL xong');
    }
  } catch (err) {
    console.log('Seed data (bỏ qua nếu đã có):', err.message);
  }
}

// ================================================================
//                        AUTH ROUTES
// ================================================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Thiếu thông tin' });
    
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO `USER` (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashed]
    );
    const token = jwt.sign(
      { user_id: result.insertId, username, email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({
      token,
      user: { user_id: result.insertId, username, email }
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email đã tồn tại' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM `USER` WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { user_id: user.user_id, username: user.username, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT user_id, username, email FROM `USER` WHERE user_id = ?',
      [req.user.user_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        USERS
// ================================================================

app.get('/api/users', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT user_id, username, email FROM `USER` ORDER BY username');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        DASHBOARD
// ================================================================

app.get('/api/dashboard', auth, async (req, res) => {
  try {
    const uid = req.user.user_id;

    const [[{ projectCount }]] = await pool.query(
      'SELECT COUNT(*) as projectCount FROM `PROJECT_MEMBER` WHERE user_id = ?', [uid]
    );

    const [[{ taskCount }]] = await pool.query(
      `SELECT COUNT(*) as taskCount FROM \`ASSIGNMENT\` a
       JOIN \`TASK\` t ON a.task_id = t.task_id
       WHERE a.user_id = ? AND a.status = 'ACTIVE'`, [uid]
    );

    const [[{ doneCount }]] = await pool.query(
      `SELECT COUNT(*) as doneCount FROM \`ASSIGNMENT\` a
       JOIN \`TASK\` t ON a.task_id = t.task_id
       JOIN \`STATE\` s ON t.state_id = s.state_id
       WHERE a.user_id = ? AND s.state_name = 'Done'`, [uid]
    );

    const [[{ overdueCount }]] = await pool.query(
      `SELECT COUNT(*) as overdueCount FROM \`ASSIGNMENT\` a
       JOIN \`TASK\` t ON a.task_id = t.task_id
       LEFT JOIN \`STATE\` s ON t.state_id = s.state_id
       WHERE a.user_id = ? AND t.due_date < CURDATE()
       AND (s.state_name IS NULL OR s.state_name != 'Done')`, [uid]
    );

    // Recent tasks - lấy task thuộc project mà user tham gia
    const [recentTasks] = await pool.query(
      `SELECT t.*, s.state_name, p.priority_name,
              sp.sprint_name, pr.project_name
       FROM \`TASK\` t
       JOIN \`SPRINT\` sp ON t.sprint_id = sp.sprint_id
       JOIN \`PROJECT\` pr ON sp.project_id = pr.project_id
       JOIN \`PROJECT_MEMBER\` pm ON pr.project_id = pm.project_id AND pm.user_id = ?
       LEFT JOIN \`STATE\` s ON t.state_id = s.state_id
       LEFT JOIN \`PRIORITY\` p ON t.priority_id = p.priority_id
       ORDER BY t.task_id DESC LIMIT 10`, [uid]
    );

    // Tasks by state
    const [tasksByState] = await pool.query(
      `SELECT s.state_name, COUNT(t.task_id) as count
       FROM \`STATE\` s
       LEFT JOIN \`TASK\` t ON s.state_id = t.state_id
       LEFT JOIN \`SPRINT\` sp ON t.sprint_id = sp.sprint_id
       LEFT JOIN \`PROJECT_MEMBER\` pm ON sp.project_id = pm.project_id AND pm.user_id = ?
       GROUP BY s.state_id, s.state_name
       ORDER BY s.state_id`, [uid]
    );

    res.json({ projectCount, taskCount, doneCount, overdueCount, recentTasks, tasksByState });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        STATES & PRIORITIES & LABELS
// ================================================================

app.get('/api/states', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `STATE` ORDER BY state_id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/priorities', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `PRIORITY` ORDER BY sort_order');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/labels', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `LABEL` ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        PROJECTS
// ================================================================

// Lấy danh sách project của user
app.get('/api/projects', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, pm.project_role,
        (SELECT COUNT(*) FROM \`TASK\` t
         JOIN \`SPRINT\` sp ON t.sprint_id = sp.sprint_id
         WHERE sp.project_id = p.project_id) as task_count,
        (SELECT COUNT(*) FROM \`PROJECT_MEMBER\` WHERE project_id = p.project_id) as member_count
       FROM \`PROJECT\` p
       JOIN \`PROJECT_MEMBER\` pm ON p.project_id = pm.project_id
       WHERE pm.user_id = ?
       ORDER BY p.project_id DESC`, [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Chi tiết project
app.get('/api/projects/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, pm.project_role FROM \`PROJECT\` p
       JOIN \`PROJECT_MEMBER\` pm ON p.project_id = pm.project_id
       WHERE p.project_id = ? AND pm.user_id = ?`,
      [req.params.id, req.user.user_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Không tìm thấy dự án' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tạo project
app.post('/api/projects', auth, async (req, res) => {
  try {
    const { project_name, description, start_date, end_date } = req.body;
    if (!project_name) return res.status(400).json({ error: 'Tên dự án bắt buộc' });

    const [result] = await pool.query(
      'INSERT INTO `PROJECT` (project_name, description, start_date, end_date) VALUES (?, ?, ?, ?)',
      [project_name, description || null, start_date || null, end_date || null]
    );

    // Tự gán OWNER
    await pool.query(
      'INSERT INTO `PROJECT_MEMBER` (project_id, user_id, project_role) VALUES (?, ?, ?)',
      [result.insertId, req.user.user_id, 'OWNER']
    );

    res.status(201).json({
      project_id: result.insertId,
      project_name,
      description,
      start_date,
      end_date
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật project
app.put('/api/projects/:id', auth, async (req, res) => {
  try {
    const { project_name, description, start_date, end_date } = req.body;
    await pool.query(
      'UPDATE `PROJECT` SET project_name=?, description=?, start_date=?, end_date=? WHERE project_id=?',
      [project_name, description || null, start_date || null, end_date || null, req.params.id]
    );
    res.json({ message: 'Đã cập nhật' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa project
app.delete('/api/projects/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM `PROJECT` WHERE project_id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        PROJECT MEMBERS
// ================================================================

app.get('/api/projects/:id/members', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.username, u.email, pm.project_role, pm.joined_at
       FROM \`PROJECT_MEMBER\` pm
       JOIN \`USER\` u ON pm.user_id = u.user_id
       WHERE pm.project_id = ?
       ORDER BY pm.joined_at`, [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/members', auth, async (req, res) => {
  try {
    const { email, project_role } = req.body;
    const [users] = await pool.query('SELECT user_id, username FROM `USER` WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ error: 'Không tìm thấy user với email này' });

    const targetUser = users[0];
    await pool.query(
      'INSERT INTO `PROJECT_MEMBER` (project_id, user_id, project_role) VALUES (?, ?, ?)',
      [req.params.id, targetUser.user_id, project_role || 'CONTRIBUTOR']
    );

    // Gửi notification
    await pool.query(
      'INSERT INTO `NOTIFICATION` (user_id, message) VALUES (?, ?)',
      [targetUser.user_id, `Bạn đã được thêm vào dự án (ID: ${req.params.id}) bởi ${req.user.username}`]
    );

    res.status(201).json({ message: 'Đã thêm thành viên' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Người này đã là thành viên' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id/members/:userId', auth, async (req, res) => {
  try {
    const { project_role } = req.body;
    await pool.query(
      'UPDATE `PROJECT_MEMBER` SET project_role = ? WHERE project_id = ? AND user_id = ?',
      [project_role, req.params.id, req.params.userId]
    );
    res.json({ message: 'Đã cập nhật vai trò' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id/members/:userId', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM `PROJECT_MEMBER` WHERE project_id = ? AND user_id = ?',
      [req.params.id, req.params.userId]
    );
    res.json({ message: 'Đã xóa thành viên' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        SPRINTS
// ================================================================

app.get('/api/projects/:projectId/sprints', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT sp.*,
        (SELECT COUNT(*) FROM \`TASK\` WHERE sprint_id = sp.sprint_id) as task_count,
        (SELECT COUNT(*) FROM \`TASK\` t
         JOIN \`STATE\` s ON t.state_id = s.state_id
         WHERE t.sprint_id = sp.sprint_id AND s.state_name = 'Done') as done_count
       FROM \`SPRINT\` sp
       WHERE sp.project_id = ?
       ORDER BY sp.start_date`, [req.params.projectId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:projectId/sprints', auth, async (req, res) => {
  try {
    const { sprint_name, start_date, end_date } = req.body;
    if (!sprint_name) return res.status(400).json({ error: 'Tên sprint bắt buộc' });

    const [result] = await pool.query(
      'INSERT INTO `SPRINT` (project_id, sprint_name, start_date, end_date) VALUES (?, ?, ?, ?)',
      [req.params.projectId, sprint_name, start_date || null, end_date || null]
    );
    res.status(201).json({ sprint_id: result.insertId, sprint_name, start_date, end_date });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/sprints/:id', auth, async (req, res) => {
  try {
    const { sprint_name, start_date, end_date } = req.body;
    await pool.query(
      'UPDATE `SPRINT` SET sprint_name=?, start_date=?, end_date=? WHERE sprint_id=?',
      [sprint_name, start_date || null, end_date || null, req.params.id]
    );
    res.json({ message: 'Đã cập nhật' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/sprints/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM `SPRINT` WHERE sprint_id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        TASKS
// ================================================================

// Lấy tất cả task trong project (qua sprint)
app.get('/api/projects/:projectId/tasks', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, s.state_name, p.priority_name, sp.sprint_name,
        GROUP_CONCAT(DISTINCT u.username SEPARATOR ', ') as assignees,
        GROUP_CONCAT(DISTINCT l.name SEPARATOR ', ') as labels,
        GROUP_CONCAT(DISTINCT l.color SEPARATOR ', ') as label_colors
       FROM \`TASK\` t
       JOIN \`SPRINT\` sp ON t.sprint_id = sp.sprint_id
       LEFT JOIN \`STATE\` s ON t.state_id = s.state_id
       LEFT JOIN \`PRIORITY\` p ON t.priority_id = p.priority_id
       LEFT JOIN \`ASSIGNMENT\` a ON t.task_id = a.task_id AND a.status = 'ACTIVE'
       LEFT JOIN \`USER\` u ON a.user_id = u.user_id
       LEFT JOIN \`TASK_LABEL\` tl ON t.task_id = tl.task_id
       LEFT JOIN \`LABEL\` l ON tl.label_id = l.label_id
       WHERE sp.project_id = ?
       GROUP BY t.task_id
       ORDER BY t.task_id DESC`, [req.params.projectId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Chi tiết task
app.get('/api/tasks/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, s.state_name, p.priority_name, sp.sprint_name, sp.project_id
       FROM \`TASK\` t
       LEFT JOIN \`STATE\` s ON t.state_id = s.state_id
       LEFT JOIN \`PRIORITY\` p ON t.priority_id = p.priority_id
       LEFT JOIN \`SPRINT\` sp ON t.sprint_id = sp.sprint_id
       WHERE t.task_id = ?`, [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Task không tồn tại' });

    const task = rows[0];

    const [assignees] = await pool.query(
      `SELECT u.user_id, u.username, u.email, a.role_in_task, a.assigned_at, a.status
       FROM \`ASSIGNMENT\` a
       JOIN \`USER\` u ON a.user_id = u.user_id
       WHERE a.task_id = ?`, [req.params.id]
    );

    const [labels] = await pool.query(
      `SELECT l.* FROM \`TASK_LABEL\` tl
       JOIN \`LABEL\` l ON tl.label_id = l.label_id
       WHERE tl.task_id = ?`, [req.params.id]
    );

    const [steps] = await pool.query(
      'SELECT * FROM `STEP` WHERE task_id = ? ORDER BY step_no', [req.params.id]
    );

    const [comments] = await pool.query(
      `SELECT c.*, u.username FROM \`COMMENT\` c
       JOIN \`USER\` u ON c.user_id = u.user_id
       WHERE c.task_id = ?
       ORDER BY c.comment_no`, [req.params.id]
    );

    const [attachments] = await pool.query(
      `SELECT att.*, u.username as uploader
       FROM \`ATTACHMENT\` att
       LEFT JOIN \`USER\` u ON att.uploaded_by_user_id = u.user_id
       WHERE att.task_id = ?`, [req.params.id]
    );

    res.json({ ...task, assignees, labels, steps, comments, attachments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tạo task (cần sprint_id vì TASK FK sprint)
app.post('/api/tasks', auth, async (req, res) => {
  try {
    const { sprint_id, state_id, priority_id, title, description, due_date } = req.body;
    if (!title) return res.status(400).json({ error: 'Tiêu đề bắt buộc' });
    if (!sprint_id) return res.status(400).json({ error: 'Sprint bắt buộc (Task phải thuộc 1 Sprint)' });

    const [result] = await pool.query(
      'INSERT INTO `TASK` (sprint_id, state_id, priority_id, title, description, due_date) VALUES (?,?,?,?,?,?)',
      [sprint_id, state_id || null, priority_id || null, title, description || null, due_date || null]
    );
    res.status(201).json({ task_id: result.insertId, title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cập nhật task
app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const { sprint_id, state_id, priority_id, title, description, due_date } = req.body;
    await pool.query(
      'UPDATE `TASK` SET sprint_id=?, state_id=?, priority_id=?, title=?, description=?, due_date=? WHERE task_id=?',
      [sprint_id || null, state_id || null, priority_id || null, title, description || null, due_date || null, req.params.id]
    );
    res.json({ message: 'Đã cập nhật' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Đổi trạng thái task (dùng cho Board kéo thả)
app.patch('/api/tasks/:id/state', auth, async (req, res) => {
  try {
    const { state_id } = req.body;
    await pool.query('UPDATE `TASK` SET state_id = ? WHERE task_id = ?', [state_id, req.params.id]);

    // Gửi notification cho assignees
    const [assignees] = await pool.query(
      `SELECT user_id FROM \`ASSIGNMENT\` WHERE task_id = ? AND status = 'ACTIVE'`, [req.params.id]
    );
    const [stateRows] = await pool.query('SELECT state_name FROM `STATE` WHERE state_id = ?', [state_id]);
    const stateName = stateRows[0]?.state_name || '';

    for (const a of assignees) {
      if (a.user_id !== req.user.user_id) {
        await pool.query(
          'INSERT INTO `NOTIFICATION` (user_id, message) VALUES (?, ?)',
          [a.user_id, `Task #${req.params.id} đã chuyển sang "${stateName}" bởi ${req.user.username}`]
        );
      }
    }

    res.json({ message: 'Đã cập nhật trạng thái' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Xóa task
app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM `TASK` WHERE task_id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        ASSIGNMENTS
// ================================================================

app.post('/api/tasks/:taskId/assign', auth, async (req, res) => {
  try {
    const { user_id, role_in_task } = req.body;
    await pool.query(
      `INSERT INTO \`ASSIGNMENT\` (user_id, task_id, role_in_task, status)
       VALUES (?, ?, ?, 'ACTIVE')
       ON DUPLICATE KEY UPDATE status = 'ACTIVE', role_in_task = VALUES(role_in_task)`,
      [user_id, req.params.taskId, role_in_task || 'Assignee']
    );

    // Notification
    if (parseInt(user_id) !== req.user.user_id) {
      const [taskRows] = await pool.query('SELECT title FROM `TASK` WHERE task_id = ?', [req.params.taskId]);
      await pool.query(
        'INSERT INTO `NOTIFICATION` (user_id, message) VALUES (?, ?)',
        [user_id, `Bạn được phân công task "${taskRows[0]?.title}" bởi ${req.user.username}`]
      );
    }

    res.status(201).json({ message: 'Đã phân công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:taskId/assign/:userId', auth, async (req, res) => {
  try {
    await pool.query(
      "UPDATE `ASSIGNMENT` SET status = 'REMOVED' WHERE task_id = ? AND user_id = ?",
      [req.params.taskId, req.params.userId]
    );
    res.json({ message: 'Đã gỡ phân công' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        COMMENTS
// ================================================================

app.get('/api/tasks/:taskId/comments', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, u.username FROM \`COMMENT\` c
       JOIN \`USER\` u ON c.user_id = u.user_id
       WHERE c.task_id = ?
       ORDER BY c.comment_no`, [req.params.taskId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:taskId/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Nội dung bắt buộc' });

    // Tính comment_no tiếp theo
    const [[{ maxNo }]] = await pool.query(
      'SELECT COALESCE(MAX(comment_no), 0) as maxNo FROM `COMMENT` WHERE task_id = ?',
      [req.params.taskId]
    );
    const newNo = maxNo + 1;

    await pool.query(
      'INSERT INTO `COMMENT` (task_id, comment_no, user_id, content) VALUES (?, ?, ?, ?)',
      [req.params.taskId, newNo, req.user.user_id, content]
    );

    // Notification cho assignees
    const [assignees] = await pool.query(
      `SELECT user_id FROM \`ASSIGNMENT\` WHERE task_id = ? AND status = 'ACTIVE' AND user_id != ?`,
      [req.params.taskId, req.user.user_id]
    );
    for (const a of assignees) {
      await pool.query(
        'INSERT INTO `NOTIFICATION` (user_id, message) VALUES (?, ?)',
        [a.user_id, `${req.user.username} đã bình luận trên task #${req.params.taskId}`]
      );
    }

    res.status(201).json({
      task_id: parseInt(req.params.taskId),
      comment_no: newNo,
      content,
      username: req.user.username
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        STEPS
// ================================================================

app.get('/api/tasks/:taskId/steps', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM `STEP` WHERE task_id = ? ORDER BY step_no', [req.params.taskId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:taskId/steps', auth, async (req, res) => {
  try {
    const { step_description } = req.body;
    if (!step_description) return res.status(400).json({ error: 'Mô tả bước bắt buộc' });

    const [[{ maxNo }]] = await pool.query(
      'SELECT COALESCE(MAX(step_no), 0) as maxNo FROM `STEP` WHERE task_id = ?',
      [req.params.taskId]
    );
    const newNo = maxNo + 1;

    await pool.query(
      'INSERT INTO `STEP` (task_id, step_no, step_description) VALUES (?, ?, ?)',
      [req.params.taskId, newNo, step_description]
    );
    res.status(201).json({ task_id: parseInt(req.params.taskId), step_no: newNo, step_description });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tasks/:taskId/steps/:stepNo', auth, async (req, res) => {
  try {
    const { step_description } = req.body;
    await pool.query(
      'UPDATE `STEP` SET step_description = ? WHERE task_id = ? AND step_no = ?',
      [step_description, req.params.taskId, req.params.stepNo]
    );
    res.json({ message: 'Đã cập nhật' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:taskId/steps/:stepNo', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM `STEP` WHERE task_id = ? AND step_no = ?',
      [req.params.taskId, req.params.stepNo]
    );
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        LABELS (gắn/gỡ cho Task)
// ================================================================

app.post('/api/tasks/:taskId/labels', auth, async (req, res) => {
  try {
    const { label_id } = req.body;
    await pool.query(
      'INSERT INTO `TASK_LABEL` (task_id, label_id) VALUES (?, ?)',
      [req.params.taskId, label_id]
    );
    res.status(201).json({ message: 'Đã gắn label' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Label đã được gắn' });
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:taskId/labels/:labelId', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM `TASK_LABEL` WHERE task_id = ? AND label_id = ?',
      [req.params.taskId, req.params.labelId]
    );
    res.json({ message: 'Đã gỡ label' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        ATTACHMENTS
// ================================================================

app.get('/api/tasks/:taskId/attachments', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT att.*, u.username as uploader
       FROM \`ATTACHMENT\` att
       LEFT JOIN \`USER\` u ON att.uploaded_by_user_id = u.user_id
       WHERE att.task_id = ?
       ORDER BY att.created_at`, [req.params.taskId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:taskId/attachments', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Chưa chọn file' });

    const url = `/uploads/${req.file.filename}`;
    const [result] = await pool.query(
      'INSERT INTO `ATTACHMENT` (task_id, uploaded_by_user_id, file_name, url_or_path) VALUES (?, ?, ?, ?)',
      [req.params.taskId, req.user.user_id, req.file.originalname, url]
    );
    res.status(201).json({
      attachment_id: result.insertId,
      file_name: req.file.originalname,
      url_or_path: url
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/attachments/:id', auth, async (req, res) => {
  try {
    // Xóa file vật lý nếu có
    const [rows] = await pool.query('SELECT url_or_path FROM `ATTACHMENT` WHERE attachment_id = ?', [req.params.id]);
    if (rows.length > 0 && rows[0].url_or_path) {
      const filePath = path.join(__dirname, rows[0].url_or_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await pool.query('DELETE FROM `ATTACHMENT` WHERE attachment_id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        NOTIFICATIONS
// ================================================================

app.get('/api/notifications', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM `NOTIFICATION` WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.user_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications/unread-count', auth, async (req, res) => {
  try {
    // Bảng NOTIFICATION không có cột is_read trong schema gốc
    // Nên ta coi tất cả notification đều là "unread"
    // Hoặc thêm logic đọc ở client. Ở đây đếm tất cả notification mới (24h)
    const [[{ count }]] = await pool.query(
      `SELECT COUNT(*) as count FROM \`NOTIFICATION\`
       WHERE user_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [req.user.user_id]
    );
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notifications/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM `NOTIFICATION` WHERE notification_id = ? AND user_id = ?',
      [req.params.id, req.user.user_id]
    );
    res.json({ message: 'Đã xóa' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notifications', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM `NOTIFICATION` WHERE user_id = ?', [req.user.user_id]);
    res.json({ message: 'Đã xóa tất cả' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
//                        START SERVER
// ================================================================

const PORT = process.env.PORT || 5000;

seedData().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
  });
});