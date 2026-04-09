'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi } from '../api/endpoints';
import { useAuthStore } from '../store/auth.store';
import { toast } from '../store/toast.store';

type ApiError = { response?: { data?: { error?: { message?: string } } } };
const apiMsg = (err: unknown, fallback: string) =>
  (err as ApiError)?.response?.data?.error?.message ?? fallback;

export function useTodayAttendance() {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: async () => {
      const res = await attendanceApi.getToday();
      return res.data.data as Record<string, unknown> | null;
    },
  });
}

export function useAttendanceHistory(
  params: Record<string, string | number | undefined>,
) {
  return useQuery({
    queryKey: ['attendance', 'history', params],
    queryFn: async () => {
      const res = await attendanceApi.getHistory(params);
      return res.data as { data: unknown[]; pagination: unknown };
    },
  });
}

export function useAllAttendance(params: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ['attendance', 'all', params],
    queryFn: async () => {
      const res = await attendanceApi.getAll(params);
      return res.data as { data: unknown[]; pagination: unknown };
    },
  });
}

export function useCheckIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { location?: { lat: number; lng: number }; method?: string }) =>
      attendanceApi.checkIn(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance', 'today'] });
      toast.success('Checked in successfully!');
    },
    onError: (err) => toast.error(apiMsg(err, 'Check-in failed')),
  });
}

export function useCheckOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { location?: { lat: number; lng: number }; method?: string }) =>
      attendanceApi.checkOut(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance', 'today'] });
      void qc.invalidateQueries({ queryKey: ['attendance', 'history'] });
      toast.success('Checked out successfully!');
    },
    onError: (err) => toast.error(apiMsg(err, 'Check-out failed')),
  });
}

export function useCorrectAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string;
      checkIn?: string;
      checkOut?: string;
      reason: string;
    }) => attendanceApi.correct(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance record corrected');
    },
    onError: (err) => toast.error(apiMsg(err, 'Failed to save correction')),
  });
}

export function useMonthlySummary(month: string) {
  const user = useAuthStore((s) => s.user);
  return useQuery({
    queryKey: ['attendance', 'summary', user?._id, month],
    queryFn: async () => {
      if (!user) return null;
      const res = await attendanceApi.getSummary(user._id, month);
      return res.data.data as Record<string, unknown>;
    },
    enabled: !!user,
  });
}
