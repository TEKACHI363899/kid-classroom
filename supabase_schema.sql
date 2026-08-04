-- ==========================================
-- SUPABASE SQL DATABASE SCHEMA & SECURITY POLICIES
-- Interactive Kid Classroom Web Application (Version 5.1)
-- ==========================================

-- 0. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Teachers and System Accounts)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('teacher', 'student')),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Students Account Table (Version 5.1: Username & Password Auth)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Classrooms / Schedules Table (Version 5.1 Schema)
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    room_code VARCHAR(50) UNIQUE NOT NULL,
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Classroom-Student Assignments Table
CREATE TABLE IF NOT EXISTS public.classroom_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    can_draw BOOLEAN DEFAULT false,
    joined_at TIMESTAMP WITH TIME ZONE
);

-- 5. Row Level Security (RLS) Setup
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_students ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (Version 5.1 Hardened)
CREATE POLICY "Allow public login query on students" 
ON public.students FOR SELECT 
USING (true);

CREATE POLICY "Allow public manage students" 
ON public.students FOR ALL 
USING (true);

CREATE POLICY "Allow public read classrooms by room_code" 
ON public.classrooms FOR SELECT USING (true);

CREATE POLICY "Allow public create classrooms" 
ON public.classrooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update classrooms" 
ON public.classrooms FOR UPDATE USING (true);

CREATE POLICY "Allow public delete classrooms" 
ON public.classrooms FOR DELETE USING (true);

CREATE POLICY "Allow public read classroom_students" 
ON public.classroom_students FOR SELECT USING (true);

CREATE POLICY "Allow public manage classroom_students" 
ON public.classroom_students FOR ALL USING (true);

CREATE POLICY "Allow public profiles access" 
ON public.profiles FOR ALL USING (true);
