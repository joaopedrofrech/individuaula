export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

export type Session = {
  id: string;
  userId: string;
  expiresAt: Date;
};

export type Discipline = {
  id: string;
  userId: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Note = {
  id: string;
  userId: string;
  disciplineId: string;
  title: string;
  content: string;
  imageDataUrl?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Assessment = {
  id: string;
  userId: string;
  disciplineId: string;
  title: string;
  grade: number;
  weight: number;
  createdAt: Date;
  updatedAt: Date;
};

export type StudySession = {
  id: string;
  userId: string;
  date: Date;
  minutes: number;
};

export type YoutubeVideo = {
  id: string;
  title: string;
  channel: string;
  description: string;
  publishedAt?: string;
  thumbnailUrl: string;
  videoUrl: string;
};
