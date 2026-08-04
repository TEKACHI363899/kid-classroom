-- ==========================================
-- SUPABASE SQL DATABASE SCHEMA & SECURITY POLICIES
-- Interactive Kid Classroom Web Application (Production Ready)
-- ==========================================

-- 0. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Teachers and System Accounts)
CREATE TABLE IF NOT EXISTS public.profiles (
    id VARCHAR(255) PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('teacher', 'student')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Students Account Table (Production Credentials Auth)
CREATE TABLE IF NOT EXISTS public.students (
    id VARCHAR(255) PRIMARY KEY,
    teacher_id VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Classrooms / Schedules Table
CREATE TABLE IF NOT EXISTS public.classrooms (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    teacher_id VARCHAR(255) NOT NULL,
    room_code VARCHAR(50) UNIQUE NOT NULL,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Classroom-Student Assignments Table
CREATE TABLE IF NOT EXISTS public.classroom_students (
    id VARCHAR(255) PRIMARY KEY,
    classroom_id VARCHAR(255) NOT NULL,
    student_id VARCHAR(255),
    student_name VARCHAR(255) NOT NULL,
    can_draw BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (100% Public Access for School Meeting Application)
CREATE POLICY "Allow public all profiles" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow public all students" ON public.students FOR ALL USING (true);
CREATE POLICY "Allow public all classrooms" ON public.classrooms FOR ALL USING (true);
CREATE POLICY "Allow public all classroom_students" ON public.classroom_students FOR ALL USING (true);
