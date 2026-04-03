CREATE TABLE `USER` (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE `PROJECT` (
    project_id INT PRIMARY KEY AUTO_INCREMENT,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE
);

CREATE TABLE `STATE` (
    state_id INT PRIMARY KEY AUTO_INCREMENT,
    state_name VARCHAR(100) NOT NULL
);

CREATE TABLE `PRIORITY` (
    priority_id INT PRIMARY KEY AUTO_INCREMENT,
    priority_name VARCHAR(100),
    sort_order INT
);

CREATE TABLE `LABEL` (
    label_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100),
    color VARCHAR(50)
);

CREATE TABLE `SPRINT` (
    sprint_id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    sprint_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    CONSTRAINT FK_Sprint_Project FOREIGN KEY (project_id) REFERENCES `PROJECT`(project_id) ON DELETE CASCADE
);

CREATE TABLE `PROJECT_MEMBER` (
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    project_role VARCHAR(50) NOT NULL, -- OWNER | MAINTAINER | CONTRIBUTOR
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, user_id),
    CONSTRAINT FK_Member_Project FOREIGN KEY (project_id) REFERENCES `PROJECT`(project_id) ON DELETE CASCADE,
    CONSTRAINT FK_Member_User FOREIGN KEY (user_id) REFERENCES `USER`(user_id) ON DELETE CASCADE
);

CREATE TABLE `NOTIFICATION` (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    message VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Noti_User FOREIGN KEY (user_id) REFERENCES `USER`(user_id) ON DELETE CASCADE
);

CREATE TABLE `TASK` (
    task_id INT PRIMARY KEY AUTO_INCREMENT,
    state_id INT,
    priority_id INT,
    sprint_id INT,
    title VARCHAR(255),
    description TEXT,
    due_date DATE,
    CONSTRAINT FK_Task_State FOREIGN KEY (state_id) REFERENCES `STATE`(state_id),
    CONSTRAINT FK_Task_Priority FOREIGN KEY (priority_id) REFERENCES `PRIORITY`(priority_id),
    CONSTRAINT FK_Task_Sprint FOREIGN KEY (sprint_id) REFERENCES `SPRINT`(sprint_id) ON DELETE CASCADE
);

CREATE TABLE `ASSIGNMENT` (
    user_id INT NOT NULL,
    task_id INT NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    role_in_task VARCHAR(100),
    status VARCHAR(20), -- ACTIVE | REMOVED
    PRIMARY KEY (user_id, task_id),
    CONSTRAINT FK_Asgn_User FOREIGN KEY (user_id) REFERENCES `USER`(user_id) ON DELETE CASCADE,
    CONSTRAINT FK_Asgn_Task FOREIGN KEY (task_id) REFERENCES `TASK`(task_id) ON DELETE CASCADE
);

CREATE TABLE `TASK_LABEL` (
    task_id INT NOT NULL,
    label_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, label_id),
    CONSTRAINT FK_TL_Task FOREIGN KEY (task_id) REFERENCES `TASK`(task_id) ON DELETE CASCADE,
    CONSTRAINT FK_TL_Label FOREIGN KEY (label_id) REFERENCES `LABEL`(label_id) ON DELETE CASCADE
);

CREATE TABLE `ATTACHMENT` (
    attachment_id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    uploaded_by_user_id INT NULL,
    file_name VARCHAR(255),
    url_or_path VARCHAR(500),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Attach_Task FOREIGN KEY (task_id) REFERENCES `TASK`(task_id) ON DELETE CASCADE,
    CONSTRAINT FK_Attach_User FOREIGN KEY (uploaded_by_user_id) REFERENCES `USER`(user_id)
);

CREATE TABLE `STEP` (
    task_id INT NOT NULL,
    step_no INT NOT NULL,
    step_description VARCHAR(500),
    PRIMARY KEY (task_id, step_no),
    CONSTRAINT FK_Step_Task FOREIGN KEY (task_id) REFERENCES `TASK`(task_id) ON DELETE CASCADE
);

CREATE TABLE `COMMENT` (
    task_id INT NOT NULL,
    comment_no INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, comment_no),
    CONSTRAINT FK_Cmt_Task FOREIGN KEY (task_id) REFERENCES `TASK`(task_id) ON DELETE CASCADE,
    CONSTRAINT FK_Cmt_User FOREIGN KEY (user_id) REFERENCES `USER`(user_id)
);

INSERT INTO `USER` (`username`, `email`, `password`)
VALUES
('john_doe', 'john.doe@gmail.com', 'pass123'),
('alice_nguyen', 'alice.nguyen@yahoo.com', 'alice456'),
('mike_smith', 'mike.smith@hotmail.com', 'mike789'),
('luna_tran', 'luna.tran@gmail.com', 'luna321'),
('kevin_lee', 'kevin.lee@outlook.com', 'kevin654'),
('sophia_pham', 'sophia.pham@gmail.com', 'sophia987'),
('david_hoang', 'david.hoang@yahoo.com', 'david111'),
('emma_wilson', 'emma.wilson@gmail.com', 'emma222'),
('ryan_vo', 'ryan.vo@hotmail.com', 'ryan333'),
('nina_le', 'nina.le@gmail.com', 'nina444'),
('chris_bui', 'chris.bui@outlook.com', 'chris555'),
('olivia_do', 'olivia.do@yahoo.com', 'olivia666');


INSERT INTO `PROJECT` (`project_name`, `description`, `start_date`, `end_date`)
VALUES
('Task Management System', 'A web-based system for managing projects, tasks, and team members.', '2026-01-05', '2026-04-30'),
('E-Commerce Website', 'Online shopping platform with product listings, cart, and payment integration.', '2026-02-01', '2026-06-15'),
('Library Management App', 'System to manage books, borrowing records, and user accounts for a library.', '2026-01-15', '2026-05-20'),
('Student Portal', 'Portal for students to view schedules, grades, and course information.', '2026-03-01', '2026-07-10'),
('Inventory Tracker', 'Application to monitor stock levels, suppliers, and warehouse operations.', '2026-02-10', '2026-05-30'),
('Restaurant Booking System', 'Platform for customers to reserve tables and manage restaurant bookings.', '2026-01-20', '2026-04-25'),
('Fitness Mobile App', 'Mobile app for workout plans, progress tracking, and health reminders.', '2026-02-15', '2026-07-01'),
('Online Learning Platform', 'Educational platform with courses, lessons, quizzes, and certificates.', '2026-01-10', '2026-06-20'),
('Hotel Reservation System', 'Booking management system for hotel rooms, customers, and payments.', '2026-03-05', '2026-08-15'),
('Event Planner Website', 'Website to organize events, manage attendees, and send invitations.', '2026-02-25', '2026-06-10'),
('Bug Tracking System', 'Tool for reporting, tracking, and resolving software bugs and issues.', '2026-01-12', '2026-05-18'),
('Personal Finance Manager', 'Application to track expenses, budgets, and financial goals.', '2026-03-10', '2026-07-25');

INSERT INTO `PROJECT_MEMBER` (`project_id`, `user_id`, `project_role`, `joined_at`)
VALUES
(1, 1, 'OWNER', '2026-01-05'),
(1, 2, 'MAINTAINER', '2026-01-06'),
(2, 3, 'OWNER', '2026-02-01'),
(2, 4, 'CONTRIBUTOR', '2026-02-02'),
(3, 5, 'OWNER', '2026-01-15'),
(3, 6, 'MAINTAINER', '2026-01-16'),
(4, 7, 'OWNER', '2026-03-01'),
(5, 8, 'CONTRIBUTOR', '2026-02-10'),
(6, 9, 'OWNER', '2026-01-20'),
(7, 10, 'MAINTAINER', '2026-02-15'),
(8, 11, 'OWNER', '2026-01-10'),
(9, 12, 'CONTRIBUTOR', '2026-03-05');

INSERT INTO `SPRINT` (`project_id`, `sprint_name`, `start_date`, `end_date`)
VALUES
(1, 'Sprint 1 - Planning & Setup', '2026-01-05', '2026-01-19'),
(1, 'Sprint 2 - Core Features', '2026-01-20', '2026-02-03'),

(2, 'Sprint 1 - UI Design', '2026-02-01', '2026-02-14'),
(2, 'Sprint 2 - Product & Cart Module', '2026-02-15', '2026-02-28'),

(3, 'Sprint 1 - Database & Authentication', '2026-01-15', '2026-01-29'),
(3, 'Sprint 2 - Borrowing System', '2026-01-30', '2026-02-13'),

(4, 'Sprint 1 - Student Dashboard', '2026-03-01', '2026-03-14'),
(5, 'Sprint 1 - Inventory Core', '2026-02-10', '2026-02-24'),
(6, 'Sprint 1 - Reservation Flow', '2026-01-20', '2026-02-03'),
(7, 'Sprint 1 - Workout Tracker', '2026-02-15', '2026-03-01'),
(8, 'Sprint 1 - Course Management', '2026-01-10', '2026-01-24'),
(9, 'Sprint 1 - Room Booking Module', '2026-03-05', '2026-03-19');

INSERT INTO `TASK` (`state_id`, `priority_id`, `sprint_id`, `title`, `description`, `due_date`)
VALUES
(1, 3, 1, 'Set up project repository', 'Initialize repository structure, README, and base folders.', '2026-01-08'),
(2, 2, 1, 'Design database schema', 'Create ERD and define tables for users, projects, tasks, and sprints.', '2026-01-10'),
(1, 1, 2, 'Implement login page', 'Build frontend login form and connect it to authentication API.', '2026-01-22'),
(3, 2, 2, 'Create dashboard layout', 'Develop the main dashboard UI for project overview.', '2026-01-25'),
(2, 3, 3, 'Build product listing page', 'Create page to display products with filtering and sorting.', '2026-02-10'),
(1, 2, 4, 'Implement shopping cart', 'Add cart functionality including quantity updates and removal.', '2026-02-20'),
(2, 1, 5, 'Create user authentication API', 'Develop backend API for user registration and login.', '2026-01-25'),
(3, 2, 6, 'Build borrowing form', 'Implement form for book borrowing requests.', '2026-02-05'),
(1, 3, 7, 'Develop student dashboard', 'Display student profile, courses, and announcements.', '2026-03-08'),
(2, 2, 8, 'Track stock changes', 'Implement inventory quantity update logic.', '2026-02-18'),
(1, 1, 9, 'Create booking form', 'Build reservation form for customers to select room and dates.', '2026-03-12'),
(3, 3, 10, 'Add workout history', 'Store and display completed workout sessions in app.', '2026-02-28');

INSERT INTO `LABEL` (`name`, `color`)
VALUES 
('Bug', '#ef4444'),
('Feature', '#22c55e'),
('Enhancement', '#3b82f6'),
('Documentation', '#a855f7'),
('Design', '#f59e0b'),
('Testing', '#06b6d4');

INSERT INTO `TASK_LABEL` (`task_id`, `label_id`, `created_at`)
VALUES
(1, 1, '2026-01-05 09:00:00'),
(1, 2, '2026-01-05 09:05:00'),
(2, 3, '2026-01-06 10:15:00'),
(3, 1, '2026-01-07 11:30:00'),
(4, 4, '2026-01-08 14:00:00'),
(5, 2, '2026-01-09 15:20:00'),
(6, 5, '2026-01-10 16:45:00'),
(7, 3, '2026-01-11 08:10:00'),
(8, 1, '2026-01-12 13:25:00'),
(9, 4, '2026-01-13 17:00:00'),
(10, 2, '2026-01-14 09:40:00'),
(11, 5, '2026-01-15 12:00:00');

INSERT INTO `STATE` (`state_name`)
VALUES 
('Backlog'),
('Todo'),
('In Progress'),
('Review'),
('Done');

INSERT INTO `PRIORITY` (`priority_name`, `sort_order`)
VALUES 
('High', '1'),
('Medium', '2'),
('Low', '3');

INSERT INTO `ASSIGNMENT` (`user_id`, `task_id`, `assigned_at`, `role_in_task`, `status`)
VALUES
(1, 1, '2026-01-05 09:00:00', 'Lead Developer', 'ACTIVE'),
(2, 2, '2026-01-06 10:00:00', 'Database Designer', 'ACTIVE'),
(3, 3, '2026-01-07 11:00:00', 'Frontend Developer', 'ACTIVE'),
(4, 4, '2026-01-08 14:00:00', 'UI Designer', 'COMPLETED'),
(5, 5, '2026-02-09 09:30:00', 'Backend Developer', 'ACTIVE'),
(6, 6, '2026-02-10 15:00:00', 'Feature Developer', 'ACTIVE'),
(7, 7, '2026-01-20 08:45:00', 'API Developer', 'COMPLETED'),
(8, 8, '2026-01-25 13:20:00', 'Form Developer', 'ACTIVE'),
(9, 9, '2026-03-02 10:10:00', 'Dashboard Developer', 'ACTIVE'),
(10, 10, '2026-02-15 16:00:00', 'Inventory Analyst', 'ACTIVE'),
(11, 11, '2026-03-06 09:50:00', 'Booking System Developer', 'PENDING'),
(12, 12, '2026-02-20 17:15:00', 'Mobile App Developer', 'COMPLETED');

INSERT INTO `NOTIFICATION` (`user_id`, `message`, `created_at`)
VALUES
(1, 'You have been assigned to task: Set up project repository.', '2026-01-05 09:05:00'),
(2, 'You have been added to project: Task Management System.', '2026-01-06 10:00:00'),
(3, 'Task "Implement login page" is due soon.', '2026-01-20 08:30:00'),
(4, 'Sprint "Sprint 1 - Planning & Setup" has started.', '2026-01-05 08:00:00'),
(5, 'Your task "Build product listing page" status was updated.', '2026-02-09 14:15:00'),
(6, 'You were assigned to task: Implement shopping cart.', '2026-02-10 15:05:00'),
(7, 'Task "Create user authentication API" has been completed.', '2026-01-25 17:30:00'),
(8, 'New label added to task: Build borrowing form.', '2026-01-25 13:40:00'),
(9, 'Sprint "Sprint 1 - Student Dashboard" ends in 3 days.', '2026-03-11 09:00:00'),
(10, 'Your project role was updated in Inventory Tracker.', '2026-02-16 11:20:00'),
(11, 'Task "Create booking form" has been assigned to you.', '2026-03-06 10:00:00'),
(12, 'Workout history task was marked as completed.', '2026-02-28 18:00:00');

INSERT INTO `COMMENT` (`task_id`, `comment_no`, `user_id`, `content`, `created_at`)
VALUES
(1, 1, 1, 'Initial repository structure has been set up.', '2026-01-05 09:30:00'),
(2, 2, 2, 'The database schema may need a separate assignment table.', '2026-01-06 10:45:00'),
(3, 3, 3, 'Login page UI is complete and ready for testing.', '2026-01-07 11:20:00'),
(4, 4, 4, 'Dashboard spacing still needs refinement.', '2026-01-08 14:10:00'),
(5, 5, 5, 'Product listing page is now connected to backend data.', '2026-02-09 15:00:00'),
(6, 6, 6, 'Shopping cart logic works but quantity updates need retesting.', '2026-02-10 16:15:00'),
(7, 7, 7, 'Authentication API endpoints are responding correctly.', '2026-01-25 17:45:00'),
(8, 8, 8, 'Borrowing form validation should block empty fields.', '2026-01-26 13:30:00'),
(9, 9, 9, 'Student dashboard cards are displaying properly now.', '2026-03-03 10:00:00'),
(10, 10, 10, 'Inventory updates are reflecting in the UI correctly.', '2026-02-16 11:10:00'),
(11, 11, 11, 'Booking form needs overlap date checking.', '2026-03-06 12:20:00'),
(12, 12, 12, 'Workout history page is ready for review.', '2026-02-28 18:10:00');

